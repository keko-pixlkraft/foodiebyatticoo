import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import { test } from 'node:test';

const publicFile = (path) => new URL(`../public/${path}`, import.meta.url);
const reference = new URL(
  '../../reference/Dishfolio_Aurel_House_Clickable_Prototype_V7/Dishfolio_Aurel_House_Prototype_V7/',
  import.meta.url,
);

test('the local preview uses Foodie by Attico branding and its own storage key', async () => {
  const html = await readFile(publicFile('index.html'), 'utf8');
  const app = await readFile(publicFile('app.js'), 'utf8');

  assert.match(html, /<title>Foodie by Attico<\/title>/);
  assert.match(html, /<meta name="description" content="Foodie by Attico/);
  assert.match(app, /class="topbar-brand">Foodie/);
  assert.match(app, /class="owner-logo"><span>Foodie/);
  assert.match(app, /restaurantProfile\?\.name \|\| 'Aurel House'/);
  assert.match(app, /foodie:attico:mizora:demo:v1/);
  assert.doesNotMatch(html + app, /dishfolio/i);
});

test('the original dish crops and demo QR files are shipped byte-for-byte', async () => {
  const expected = { explore: 17, overview: 17, qr: 48 };

  for (const [folder, count] of Object.entries(expected)) {
    const directory = `assets/${folder}/`;
    const originalFiles = await readdir(new URL(directory, reference));
    assert.equal(originalFiles.length, count);
    assert.deepEqual(await readdir(publicFile(directory)), originalFiles);

    for (const name of originalFiles) {
      const path = directory + name;
      assert.deepEqual(
        await readFile(publicFile(path)),
        await readFile(new URL(path, reference)),
        path,
      );
    }
  }
});

test('the local server serves the demo and restricts requests to public files', async (t) => {
  const { createPreviewServer } = await import('../scripts/dev.mjs');
  const server = createPreviewServer().listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;

  const home = await fetch(base + '/?embed=guest&table=07');
  assert.equal(home.status, 200);
  assert.match(await home.text(), /<title>Foodie by Attico/);

  const rules = await fetch(base + '/prototype.js');
  assert.equal(rules.status, 200);
  assert.match(await rules.text(), /export function parseNutrition\(/);

  const photo = await fetch(base + '/assets/explore/sushi.webp', { method: 'HEAD' });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('content-type'), 'image/webp');

  const missing = await fetch(base + '/assets/explore/missing.webp');
  assert.equal(missing.status, 404);
  await missing.text();

  const privateFile = await fetch(base + '/assets/%2e%2e%2f%2e%2e%2fpackage.json');
  assert.equal(privateFile.status, 404);
  await privateFile.text();
});
