// Server-Sent Events hub — pushes bounty/obstruction events to the website in
// real time. The frontend connects with:
//
//   const es = new EventSource(`${API}/api/events`)
//   es.onmessage = (e) => { const ev = JSON.parse(e.data); /* ev.type, ev.bounty */ }
//
// Event types: 'obstruction_detected' (robot posted a bounty), 'bounty_claimed',
// 'bounty_paid', 'bounty_cancelled'. Each carries the bounty in the UI Quest shape.
const clients = new Set();

export function addClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

export function broadcast(type, bounty) {
  const payload = JSON.stringify({ type, bounty, at: bounty && bounty.createdAt });
  for (const res of clients) {
    try { res.write(`data: ${payload}\n\n`); } catch { clients.delete(res); }
  }
}

export function clientCount() {
  return clients.size;
}
