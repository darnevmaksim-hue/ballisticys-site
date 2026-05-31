const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET = 'https://yzsdvewqdlcoshaokuzp.supabase.co';
const PORT = 3001;
const TARGET_HOST = new URL(TARGET).host;
const SITE_DIR = path.join(__dirname);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serveStatic(urlPath, res) {
  let filePath = path.join(SITE_DIR, urlPath === '/' ? 'index.html' : urlPath);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(SITE_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // CORS headers for direct file:// access (fallback)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // If request goes to Supabase API paths, proxy
  if (reqUrl.pathname.startsWith('/rest/v1/') ||
      reqUrl.pathname.startsWith('/auth/v1/') ||
      reqUrl.pathname.startsWith('/functions/v1/')) {
    const options = {
      hostname: TARGET_HOST,
      port: 443,
      path: reqUrl.pathname + reqUrl.search,
      method: req.method,
      headers: { ...req.headers, host: TARGET_HOST },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders['transfer-encoding'];
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });

    req.pipe(proxyReq);
  } else {
    // Serve static files from site directory
    serveStatic(reqUrl.pathname, res);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
  console.log(`Serving files from ${SITE_DIR}`);
  console.log(`Proxying API to ${TARGET}`);
});
