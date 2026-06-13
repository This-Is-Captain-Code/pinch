"""
gotchiOS Obstruction + Teleop.

If the camera initialises: watch for a BLOCKED view (low spatial detail in the
32x24 luma grid), show a STUCK face over the live feed, and post a bounty
(MQTT 'camera_blocked'). A claimed operator then steers the head via WebXR
hand-tracking ({"mpan","mtilt"} on the cmd topic); when the view clears again,
send 'camera_clear' (which resolves the bounty -> pays the operator).

If the camera can't init (hardware), fall back to TELEOP-ONLY: always "stuck",
always steerable, posts the bounty on launch — so the loop still works.

Swipe down / left or long-press to exit.
"""
import display, touch, system, time, gc, buzzer, mqtt, motor, camera

W, H = display.WIDTH, display.HEIGHT
C = display.color
BLACK  = C(0, 0, 0)
WHITE  = C(255, 255, 255)
CYAN   = C(0, 200, 255)
GREEN  = C(0, 230, 90)
RED    = C(255, 50, 50)
YELLOW = C(255, 220, 0)
DIM    = C(60, 60, 60)
NO_TRANSPARENT = 0xFFFE  # odd LSB -> blits every pixel

# ── Detection tuning ─────────────────────────────────────────────
DETAIL_MIN    = 9    # MAD of the luma grid below this = featureless/blocked
TRIP_FRAMES   = 8    # consecutive blocked frames before we declare it
CLEAR_FRAMES  = 8    # consecutive clear frames before we stand down
MOTION_THRESH = 20   # passed to motion_detect (only affects its unused mag)

# sin(2*pi*i/32)*1000 — fixed-point trig for the spinning spiral eyes.
SINT = (0, 195, 383, 556, 707, 831, 924, 981, 1000, 981, 924, 831, 707, 556,
        383, 195, 0, -195, -383, -556, -707, -831, -924, -981, -1000, -981,
        -924, -831, -707, -556, -383, -195)
def scos(a):
    return SINT[(a + 8) % 32]

# ── Camera bring-up (optional) ───────────────────────────────────
try:
    camera.init()
    cam_ready = True
except OSError:
    cam_ready = False

prev = None
blocked = False
trip = 0
clear = 0
detail = 0
luma = 0
tgt_pan = 90      # teleop targets (deg, 0-180)
tgt_tilt = 90
teleop_new = False
cmds = 0
capture_err = None
fr = 0
_launch_t0 = time.ticks_ms()
_GRACE_MS = 400


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
    px, py = cx, cy
    P = 12
    for i in range(1, P + 1):
        a = ((i * 56) // P + phase) % 32
        r = rmax * i // P
        x = cx + r * scos(a) // 1000
        y = cy + r * SINT[a] // 1000
        tline(px, py, x, y, YELLOW)
        px, py = x, y


def draw_stuck_face():
    pulse = 3 + (fr // 3) % 5
    for t in range(pulse):
        display.rect(t, t, W - 2 * t, H - 2 * t, RED)
    ey, r, ex = 88, 26, 56
    ph = fr % 32
    for cx in (W // 2 - ex, W // 2 + ex):
        eye_ring(cx, ey, r)
        spiral_eye(cx, ey, r - 6, ph)
    mx0, my, seg, amp, ww = W // 2 - 40, 150, 8, 6, 80
    px, py = mx0, my
    for i in range(1, seg + 1):
        x = mx0 + ww * i // seg
        y = my + (amp if (i & 1) else -amp)
        tline(px, py, x, y, WHITE)
        px, py = x, y
    display.text(8, 8, 'PAN  %3d' % tgt_pan, 0, CYAN)
    display.text(8, 18, 'TILT %3d' % tgt_tilt, 0, CYAN)
    display.text(W - 78, 8, 'cmds %d' % cmds, 0, DIM)
    bh = 26
    display.rect_filled(0, H - bh, W, bh, RED)
    msg = 'STUCK - STEER ME'
    display.text((W - len(msg) * 12) // 2, H - bh + 7, msg, 1, WHITE)
    hint = 'swipe down to exit'
    display.text((W - len(hint) * 6) // 2, H - bh - 11, hint, 0, WHITE)


def draw_clear_overlay():
    display.text(4, 4, 'DETAIL %3d' % detail, 0, CYAN)
    display.text(4, 14, 'LUMA   %3d' % luma, 0, CYAN)
    display.rect_filled(0, H - 22, 76, 12, GREEN)
    display.text(6, H - 20, 'VIEW CLEAR', 0, BLACK)
    display.text(W - 98, H - 12, 'swipe down: exit', 0, DIM)


try:
    motor.home()
except:
    pass

while True:
    g = touch.gesture()
    if time.ticks_diff(time.ticks_ms(), _launch_t0) > _GRACE_MS:
        if g == 'long_press' or g == 'swipe_left' or g == 'swipe_down':
            if blocked and mqtt.connected():
                mqtt.send_command('camera_clear')
            if cam_ready and capture_err is None:
                try: camera.deinit()
                except: pass
            buzzer.click()
            system.exit()

    # Drain inbound teleop commands ('CMD: {"mpan":..,"mtilt":..}').
    while mqtt.log_count() > 0:
        _ln = mqtt.log_read()
        if _ln and 'mpan' in _ln:
            _mp = _ci(_ln, 'mpan'); _mt = _ci(_ln, 'mtilt')
            if _mp is not None: tgt_pan = max(0, min(180, _mp))
            if _mt is not None: tgt_tilt = max(0, min(180, _mt))
            teleop_new = True
            cmds += 1

    # Determine blocked state — from the camera if we have it, else always-stuck.
    frame = None
    new_blocked = blocked
    if cam_ready:
        try:
            w, h, frame = camera.capture()
            capture_err = None
            _cx, _cy, _mag, grid = camera.motion_detect(frame, prev, MOTION_THRESH)
            prev = grid
            luma, detail = grid_stats(grid)
            if detail < DETAIL_MIN:
                trip += 1; clear = 0
            else:
                clear += 1; trip = 0
            if not blocked and trip >= TRIP_FRAMES:
                new_blocked = True
            elif blocked and clear >= CLEAR_FRAMES:
                new_blocked = False
        except OSError as e:
            capture_err = e
    else:
        new_blocked = True  # teleop-only fallback: always stuck/steerable

    # Edge transitions -> signal the cloud (posts/resolves the bounty).
    if new_blocked and not blocked:
        blocked = True
        print('[obstruction] DETECTED  detail=%d luma=%d' % (detail, luma))
        buzzer.beep()
        if mqtt.connected():
            mqtt.send_command('camera_blocked')
    elif blocked and not new_blocked:
        blocked = False
        print('[obstruction] cleared   detail=%d luma=%d' % (detail, luma))
        buzzer.click()
        if mqtt.connected():
            mqtt.send_command('camera_clear')

    # Apply teleop only while stuck (the operator earned control).
    if blocked and teleop_new:
        try:
            motor.pan(tgt_pan); motor.tilt(tgt_tilt)
        except:
            pass
        teleop_new = False

    # Draw.
    if cam_ready and frame is not None:
        display.sprite(0, 0, w, h, frame, NO_TRANSPARENT)
        if blocked:
            draw_stuck_face()
        else:
            draw_clear_overlay()
    else:
        display.clear(BLACK)
        draw_stuck_face()
    display.flush()

    fr += 1
    if (fr & 0x07) == 0:
        gc.collect()
    if not cam_ready:
        time.sleep_ms(33)   # camera.capture() paces cam mode; sleep only without it
