"""
gotchiOS Obstruction Watch — report when the camera's view is blocked,
and show an unmissable "stuck" face *over* the live camera feed.

Stackchan can only act on what it can see. When something is shoved in
front of the lens (a hand, a wall, a box) the camera stops seeing a scene
and starts seeing a flat, featureless field. This app watches for exactly
that and, when it happens, paints a big dizzy "STUCK" face on top of the
feed — the first link in the chain that will later post a bounty and ask a
human for help.

How detection works (no new firmware needed):
  camera.motion_detect() already downsamples each frame to a 32x24
  green-channel luma grid (768 cells, 0-255) in C. We reuse that grid as
  a cheap brightness map and measure its *spatial detail* via the mean
  absolute deviation (MAD). A real scene has texture -> high MAD. A
  covered lens is uniform -> low MAD, whether it's covered by something
  dark or something bright. Sustained low detail = blocked view.

How the face stays visible over the feed:
  No alpha compositing exists on this display, so every shape is drawn
  "sticker" style — a black halo first, then a bright fill — which reads
  on any background without hiding the camera behind a panel. Spiral eyes
  match the launcher's existing "critical/overwhelmed" visual language
  (EyesSpiral.bin) and slowly spin to grab the eye.

Swipe down / left or long-press to exit.
"""
import display, camera, touch, system, time, gc, buzzer, mqtt, motor

W, H = display.WIDTH, display.HEIGHT
C = display.color
BLACK  = C(0, 0, 0)
WHITE  = C(255, 255, 255)
CYAN   = C(0, 200, 255)
GREEN  = C(0, 230, 90)
RED    = C(255, 50, 50)
YELLOW = C(255, 220, 0)
DIM    = C(60, 60, 60)
NO_TRANSPARENT = 0xFFFE  # odd LSB -> no real pixel matches, blits everything

# ── Tuning ──────────────────────────────────────────────────────────
DETAIL_MIN   = 9    # MAD of the luma grid below this = featureless / blocked
TRIP_FRAMES  = 8    # consecutive blocked frames before we declare it
CLEAR_FRAMES = 8    # consecutive clear frames before we stand down
MOTION_THRESH = 20  # passed to motion_detect; only affects its unused mag

# sin(2*pi*i/32) * 1000, i = 0..31 — a tiny fixed-point trig table so the
# spiral can spin without importing math. cos(a) = table[(a+8) % 32].
SINT = (0, 195, 383, 556, 707, 831, 924, 981, 1000, 981, 924, 831, 707, 556,
        383, 195, 0, -195, -383, -556, -707, -831, -924, -981, -1000, -981,
        -924, -831, -707, -556, -383, -195)


def scos(a):
    return SINT[(a + 8) % 32]


# ── Camera bring-up ─────────────────────────────────────────────────
try:
    camera.init()
    ready = True
    err_msg = None
except OSError as e:
    ready = False
    err_msg = 'camera init failed: ' + str(e)

# Swallow the tap/gesture that launched us so we don't instantly exit.
_launch_t0 = time.ticks_ms()
_GRACE_MS  = 400

prev = None          # rolling luma grid for motion_detect
blocked = False      # current debounced verdict
trip = 0             # consecutive blocked-frame counter
clear = 0            # consecutive clear-frame counter
detail = 0           # last MAD reading (live readout)
luma = 0             # last mean brightness (live readout)
capture_err = None
fr = 0

# Teleop targets (degrees, 0-180). An operator who claimed the bounty steers
# the head while we're stuck; the server forwards their hand-tracking as
# {"mpan":..,"mtilt":..} on the cmd topic. 90/90 is mechanical centre.
tgt_pan = 90
tgt_tilt = 90
teleop_new = False


def grid_stats(grid):
    """Mean brightness and mean-absolute-deviation over the 768-cell grid."""
    n = len(grid)
    mean = sum(grid) // n
    acc = 0
    for v in grid:
        d = v - mean
        acc += d if d >= 0 else -d
    return mean, acc // n


def _ci(s, key):
    """Pull an int value for `key` out of a JSON-ish log line (no json module)."""
    i = s.find('"' + key + '"')
    if i < 0:
        return None
    i = s.find(':', i)
    if i < 0:
        return None
    i += 1
    while i < len(s) and s[i] == ' ':
        i += 1
    j = i
    while j < len(s) and (s[j] == '-' or ('0' <= s[j] <= '9')):
        j += 1
    try:
        return int(s[i:j])
    except:
        return None


# ── "Sticker" drawing: black halo + bright fill, reads on any background ──
def tline(x0, y0, x1, y1, col):
    display.line(x0 - 1, y0, x1 - 1, y1, BLACK)
    display.line(x0 + 1, y0, x1 + 1, y1, BLACK)
    display.line(x0, y0 - 1, x1, y1 - 1, BLACK)
    display.line(x0, y0 + 1, x1, y1 + 1, BLACK)
    display.line(x0, y0, x1, y1, col)


def eye_ring(cx, cy, r):
    display.circle(cx, cy, r + 1, BLACK)
    display.circle(cx, cy, r - 2, BLACK)
    display.circle(cx, cy, r, YELLOW)
    display.circle(cx, cy, r - 1, YELLOW)


def spiral_eye(cx, cy, rmax, phase):
    """A dizzy spiral, ~1.75 turns from the centre out, spun by `phase`."""
    px, py = cx, cy
    P = 12
    for i in range(1, P + 1):
        a = ((i * 56) // P + phase) % 32   # 56 steps over P points ~= 1.75 turns
        r = rmax * i // P
        x = cx + r * scos(a) // 1000
        y = cy + r * SINT[a] // 1000
        tline(px, py, x, y, YELLOW)
        px, py = x, y


def draw_stuck_face():
    # 1) Pulsing red alert border — peripheral "alarm" signal.
    pulse = 3 + (fr // 3) % 5
    for t in range(pulse):
        display.rect(t, t, W - 2 * t, H - 2 * t, RED)

    # 2) Big spinning spiral eyes — the focal point.
    ey, r, ex = 94, 26, 56
    ph = fr % 32
    for cx in (W // 2 - ex, W // 2 + ex):
        eye_ring(cx, ey, r)
        spiral_eye(cx, ey, r - 6, ph)

    # 3) Worried zig-zag mouth.
    mx0, my, seg, amp, ww = W // 2 - 40, 158, 8, 6, 80
    px, py = mx0, my
    for i in range(1, seg + 1):
        x = mx0 + ww * i // seg
        y = my + (amp if (i & 1) else -amp)
        tline(px, py, x, y, WHITE)
        px, py = x, y

    # 4) Bobbing "?" above the face.
    qy = 24 + ((fr // 6) % 2)
    display.text(W // 2 - 9, qy, '?', 2, RED)
    display.text(W // 2 - 8, qy, '?', 2, RED)  # 1px double-strike = bolder

    # 5) Solid banner at the very bottom — leaves most of the feed visible.
    bh = 26
    display.rect_filled(0, H - bh, W, bh, RED)
    msg = 'STUCK - CANT SEE'
    display.text((W - len(msg) * 12) // 2, H - bh + 7, msg, 1, WHITE)
    hint = 'swipe down to exit'
    display.text((W - len(hint) * 6) // 2, H - bh - 11, hint, 0, WHITE)


def draw_clear():
    # Minimal heads-up so the jump to STUCK is dramatic.
    display.text(4, 4, 'DETAIL %3d' % detail, 0, CYAN)
    display.text(4, 14, 'LUMA   %3d' % luma, 0, CYAN)
    display.rect_filled(0, H - 22, 76, 12, GREEN)
    display.text(6, H - 20, 'VIEW CLEAR', 0, BLACK)
    display.text(W - 98, H - 12, 'swipe down: exit', 0, DIM)


while True:
    g = touch.gesture()
    if time.ticks_diff(time.ticks_ms(), _launch_t0) > _GRACE_MS:
        if g == 'long_press' or g == 'swipe_left' or g == 'swipe_down':
            if ready and capture_err is None:
                try: camera.deinit()
                except: pass
            system.exit()

    if not ready:
        display.clear(BLACK)
        display.text(10, H // 2 - 6, err_msg or 'camera not available', 1, RED)
        display.text(10, H - 18, 'swipe down to exit', 0, DIM)
        display.flush()
        time.sleep_ms(200)
        continue

    try:
        w, h, buf = camera.capture()
        display.sprite(0, 0, w, h, buf, NO_TRANSPARENT)
        capture_err = None
    except OSError as e:
        capture_err = e
        display.clear(BLACK)
        display.text(10, H // 2 - 6, 'capture error: ' + str(e), 1, RED)
        display.text(10, H - 18, 'swipe down to exit', 0, DIM)
        display.flush()
        time.sleep_ms(200)
        continue

    # Reuse motion_detect purely for its C-side downsample: the 4th return
    # value is this frame's 32x24 luma grid, which we treat as a detail map.
    _cx, _cy, _mag, grid = camera.motion_detect(buf, prev, MOTION_THRESH)
    prev = grid
    luma, detail = grid_stats(grid)

    # Debounce the raw per-frame verdict into a stable state.
    if detail < DETAIL_MIN:
        trip += 1; clear = 0
    else:
        clear += 1; trip = 0

    if not blocked and trip >= TRIP_FRAMES:
        blocked = True
        print('[obstruction] DETECTED  detail=%d luma=%d' % (detail, luma))
        buzzer.beep()
        # Signal the cloud to post a bounty for help. Fire-and-forget: the
        # firmware wraps this into {"cmd":"camera_blocked",...} on the device's
        # commands topic; the backend maps mqtt.hash() -> wallet and funds a
        # MON bounty on Monad. Hysteresis above means this fires once per episode.
        if mqtt.connected():
            mqtt.send_command('camera_blocked')
    elif blocked and clear >= CLEAR_FRAMES:
        blocked = False
        print('[obstruction] cleared   detail=%d luma=%d' % (detail, luma))
        buzzer.click()
        # View restored -> tell the cloud the obstruction is solved. The bounty
        # agent pays the human who helped (or cancels if nobody claimed it). This
        # is the autonomous half of the loop: the robot pays the instant it can
        # see again. Pairs with the 'camera_blocked' signal above.
        if mqtt.connected():
            mqtt.send_command('camera_clear')

    # Teleop: drain inbound MQTT commands (surface as 'CMD: {...}' log lines).
    # While stuck, apply the operator's pan/tilt so they can steer past the
    # obstacle; the moving view eventually clears, which auto-pays them.
    while mqtt.log_count() > 0:
        _ln = mqtt.log_read()
        if _ln and 'mpan' in _ln:
            _mp = _ci(_ln, 'mpan'); _mt = _ci(_ln, 'mtilt')
            if _mp is not None: tgt_pan = max(0, min(180, _mp))
            if _mt is not None: tgt_tilt = max(0, min(180, _mt))
            teleop_new = True
    if blocked and teleop_new:
        try:
            motor.pan(tgt_pan); motor.tilt(tgt_tilt)
        except:
            pass
        teleop_new = False

    if blocked:
        draw_stuck_face()
    else:
        draw_clear()
    display.flush()

    # camera.capture() hands back a fresh 150 KB buffer every frame; without
    # periodic collection the PSRAM GC heap is exhausted within seconds.
    fr += 1
    if (fr & 0x07) == 0:
        gc.collect()
