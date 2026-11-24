import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Publish only presentation files. Raw client materials and engineering documents
// never become part of the hosted application.
const source = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ['app.js', 'styles.css', 'owner.css', 'mizora.css', 'mizora.json', 'demo.css', 'assets']) {
  await cp(new URL(name, source), new URL(name, output), { recursive: true });
}
await cp(new URL('index.html', source), new URL('app.html', output));
await cp(new URL('demo.html', source), new URL('index.html', output));
const rules = await readFile(new URL('../src/prototype.ts', import.meta.url), 'utf8');
await writeFile(new URL('prototype.js', output), stripTypeScriptTypes(rules));
console.log('Built Foodie by Atticoo → product/dist (static, no backend).');
