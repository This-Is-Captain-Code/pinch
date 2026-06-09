const { WebSocket, WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// roomId -> Set<ws>
const rooms = new Map();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }
  // List active rooms for debugging
  if (req.url === '/rooms') {
    const info = {};
    for (const [id, clients] of rooms) info[id] = clients.size;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
    return;
  }
  res.writeHead(200); res.end('Hand Tracking Relay — connect via WebSocket\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Room from path /room/ROOM_ID  or query ?room=ROOM_ID, default "default"
  const url   = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  const roomId = (parts[1] ?? url.searchParams.get('room') ?? 'default').slice(0, 64);

  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId);
  room.add(ws);
  ws._roomId = roomId;

  console.log(`[${roomId}] + connect  (${room.size} in room)`);

  ws.on('message', (data, isBinary) => {
    // Broadcast to everyone else in the same room
    for (const peer of room) {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(data, { binary: isBinary });
      }
    }
  });

  ws.on('close', () => {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
    console.log(`[${roomId}] - disconnect (${room.size} in room)`);
  });

  ws.on('error', () => {});
});

server.listen(PORT, () => console.log(`Relay listening on :${PORT}`));
