import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';

const publicDirectory = new URL('../public/', import.meta.url);
const entryFiles = new Set(['index.html', 'app.js', 'styles.css', 'owner.css', 'prototype.js', 'mizora.json', 'mizora.css']);
const mediaPath = /^assets\/(?:(?:explore|overview)\/[a-z0-9-]+\.webp|mizora\/(?:dish-[0-9]{2}-(?:explore|overview)\.jpg|logo(?:-transparent)?\.png|(?:establishment|slate-background)\.png)|qr-mizora\/table-[0-9]{2}\.svg|brands\/google-g\.png|flags\/(?:gb|de|es)\.svg|fonts\/(?:(?:geist|instrument-sans)\.woff2|libre-caslon-text\.ttf)|qr\/table-[0-9]{2}\.(?:png|svg))$/;
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.json': 'application/json; charset=utf-8',
};

export function createPreviewServer({ built = false } = {}) {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    const [pathname] = request.url.split('?');
    const path = built && (pathname === '/guest' || pathname === '/owner') ? 'app.html' : pathname === '/' ? 'index.html' : pathname.slice(1);
    const extraFile = built && ['app.html', 'demo.css', 'assets/demo/owner-preview.png'].includes(path);
    if (!pathname.startsWith('/') || (!entryFiles.has(path) && !mediaPath.test(path) && !extraFile)) {
      response.writeHead(404).end();
      return;
    }

    try {
      const contents = path === 'prototype.js' && !built
        ? await readFile(new URL('../src/prototype.ts', import.meta.url), 'utf8')
          .then((source) => Buffer.from(stripTypeScriptTypes(source)))
        : await readFile(new URL(path, built ? new URL('../dist/', import.meta.url) : publicDirectory));
      response.writeHead(200, {
        'Content-Type': contentTypes[extname(path)],
        'Content-Length': contents.length,
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : contents);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const host = '127.0.0.1';
  const port = 3000;
  const server = createPreviewServer();
  server.on('error', (error) => {
    console.error(`Unable to start Foodie by Atticoo on port ${port}. ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(`Foodie by Atticoo at http://${host}:${port}/?restaurant=mizora`));
}
