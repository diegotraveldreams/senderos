const http = require('http');
const fs = require('fs');
const path = require('path');

const mimes = {
  '.html': 'text/html',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mp4': 'video/mp4',
};

const root = __dirname;

http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = decodeURIComponent(file.split('?')[0]);
  const full = path.join(root, file);
  const ext = path.extname(file);
  const contentType = (mimes[ext] || 'application/octet-stream') + (ext === '.html' || ext === '.css' || ext === '.js' ? '; charset=utf-8' : '');
  try {
    const stat = fs.statSync(full);
    const range = req.headers.range;
    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType,
      });
      fs.createReadStream(full, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(full).pipe(res);
    }
  } catch (e) {
    res.writeHead(404);
    res.end('not found: ' + file);
  }
}).listen(4173, () => console.log('senderos-web listening on 4173'));
