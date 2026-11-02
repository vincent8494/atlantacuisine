import http from 'node:http';
import { createReadStream, readdirSync } from 'node:fs';
import { lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pipeline } from 'node:stream';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const mime = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript',
  jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm', woff2: 'font/woff2' };
const routes = new Map([['/', 'index.html'], ['/index.html', 'index.html'],
  ['/style.css', 'style.css'], ['/app.js', 'app.js']]);
for (const entry of readdirSync(join(root, 'assets'), { withFileTypes: true })) {
  if (entry.isFile() && /^[\w-]+\.(webp|jpg|jpeg|png|mp4|webm|woff2)$/i.test(entry.name))
    routes.set('/assets/' + entry.name, 'assets/' + entry.name);
}

// One bucket per socket peer. Forwarded headers are untrusted on a direct listener.
const clients = new Map();
const capacity = 100;
const refill = 2; // requests per second
const sweep = setInterval(() => {
  const now = performance.now();
  for (const [ip, client] of clients)
    if (!client.active && now - client.time > 120000) clients.delete(ip);
}, 60000);
sweep.unref();

const policy = [
  "default-src 'none'", "script-src 'self'", "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:",
  "media-src 'self'", "connect-src 'self'", "frame-ancestors 'none'",
  "base-uri 'none'", "form-action 'none'", "object-src 'none'"
].join('; ');

const server = http.createServer({ maxHeaderSize: 8192, headersTimeout: 10000,
  requestTimeout: 15000, keepAliveTimeout: 5000, connectionsCheckingInterval: 5000 }, async (req, res) => {
  res.setHeader('Content-Security-Policy', policy);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  function reject(status, message, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store', ...headers });
    res.end(message);
  }
  const ip = req.socket.remoteAddress;
  const now = performance.now();
  let client = clients.get(ip);
  if (!client) {
    if (clients.size >= 10000) return reject(503, 'Server busy', { 'Retry-After': '60' });
    client = { tokens: capacity, time: now, active: 0 };
    clients.set(ip, client);
  }
  client.tokens = Math.min(capacity, client.tokens + (now - client.time) * refill / 1000);
  client.time = now;
  if (client.tokens < 1 || client.active >= 16)
    return reject(429, 'Too many requests', { 'Retry-After': '1' });
  client.tokens--;
  client.active++;
  res.once('close', () => client.active--);

  if (!['GET', 'HEAD'].includes(req.method))
    return reject(405, 'Method not allowed', { Allow: 'GET, HEAD', Connection: 'close' });
  const relative = routes.get(req.url.split('?')[0]);
  if (!relative) return reject(404, 'Not found');
  const path = join(root, relative);
  try {
    const stat = await lstat(path);
    if (!stat.isFile()) return reject(404, 'Not found');
    let start = 0, end = stat.size - 1;
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const invalid = () => reject(416, 'Invalid range', { 'Content-Range': 'bytes */' + stat.size });
      if (!match || (!match[1] && !match[2])) return invalid();
      if (match[1]) {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      } else start = Math.max(0, stat.size - Number(match[2]));
      if (start > end || start >= stat.size) return invalid();
      res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
    }
    res.writeHead(range ? 206 : 200, { 'Content-Type': mime[relative.split('.').pop()],
      'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': relative.startsWith('assets/') ? 'public, max-age=86400' : 'no-cache' });
    if (req.method === 'HEAD' || !stat.size) return res.end();
    pipeline(createReadStream(path, { start, end }), res, () => {});
  } catch { if (!res.headersSent) reject(404, 'Not found'); else res.destroy(); }
});
server.maxConnections = 256;
server.maxRequestsPerSocket = 100;
server.setTimeout(30000, socket => socket.destroy());
server.listen(Number(process.env.PORT || 4173), process.env.HOST || '0.0.0.0');
