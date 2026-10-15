// Stands in for an OAuth server: answers every request with a 302 back into the app.
// Every hit is logged, so a URL the app opened twice shows up here twice.
//
//   node redirect-server.mjs
//   adb reverse tcp:8787 tcp:8787
import http from 'node:http';

const port = 8787;

http
  .createServer((req, res) => {
    const target = new URL(req.url, 'http://localhost').searchParams.get('to') ?? 'capbrowserrepro://callback';
    console.log(`${new Date().toISOString().slice(11, 23)}  ${req.method} ${req.url}  -> 302 ${target}`);
    res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' });
    res.end();
  })
  .listen(port, () => console.log(`redirect server on http://localhost:${port}`));
