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
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') {
        // Redirect to signin page on account server
        res.writeHead(302, { 'Location': 'http://35.212.200.85:3000/' });
        res.end();
        return;
    }
    const filePath = path.join(ROOT, urlPath);
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('404'); return; }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache' });
        res.end(data);
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log('Game server on port ' + PORT + ' (redirects / to :3000 signin)');
});
