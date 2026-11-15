'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  const host = req.headers.host || '';
  let urlPath = '/';
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('bad request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(root, urlPath));
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': 'frame-ancestors *',
      'X-Served-Host': host,
    });
    res.end(data);
  });
});

server.listen(8000, '0.0.0.0', () => {
  console.log('starworks listening on 0.0.0.0:8000');
});
