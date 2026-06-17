const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 8080;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendResponse(res, statusCode, content, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(content);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mime[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendResponse(res, 404, '404 Not Found', 'text/plain; charset=utf-8');
      } else {
        sendResponse(res, 500, '500 Internal Server Error', 'text/plain; charset=utf-8');
      }
      return;
    }
    sendResponse(res, 200, data, contentType);
  });
}

http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (pathname === '/') pathname = '/index.html';

  const safePath = path.normalize(path.join(root, pathname));
  if (!safePath.startsWith(root)) {
    sendResponse(res, 403, '403 Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      sendResponse(res, 404, '404 Not Found', 'text/plain; charset=utf-8');
      return;
    }

    if (stats.isDirectory()) {
      const indexFile = path.join(safePath, 'index.html');
      fs.stat(indexFile, (indexErr, indexStats) => {
        if (indexErr || !indexStats.isFile()) {
          sendResponse(res, 403, '403 Forbidden', 'text/plain; charset=utf-8');
          return;
        }
        sendFile(res, indexFile);
      });
      return;
    }

    sendFile(res, safePath);
  });
}).listen(port, () => {
  console.log(`Static server running at http://localhost:${port}/`);
});
