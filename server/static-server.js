// Static file server - redirects / to signin page on port 3000
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = path.join(__dirname, '..');
const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml'
};

http.createServer((req, res) => {
    let urlPath;
    try {
        urlPath = decodeURIComponent(req.url.split('?')[0]);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('400 Bad Request');
        return;
    }
    // Block path traversal: raw .., URL-encoded, or tilde
    if (urlPath.indexOf('..') !== -1 || urlPath.indexOf('~') !== -1) {
        res.writeHead(403); res.end('403 Forbidden');
        return;
    }
    const filePath = path.resolve(ROOT, '.' + urlPath);
    // Ensure filePath stays inside ROOT
    if (filePath.indexOf(ROOT) !== 0) {
        res.writeHead(403); res.end('403 Forbidden');
        return;
    }
    if (urlPath === '/') {
        // Redirect to signin page on account server (use host header for flexibility)
        var host = req.headers['host'] || 'localhost';
        var redirectPort = 3000;
        res.writeHead(302, { 'Location': 'http://' + host.split(':')[0] + ':' + redirectPort + '/' });
        res.end();
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('404'); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache' });
        res.end(data);
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log('Game server on port ' + PORT + ' (redirects / to :3000 signin)');
});
