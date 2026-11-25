import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// The public checkout ships the approved assets, without the archival handoff.
const approvedHashes={
  'ICON_MANIFEST.json':'2636dcf9bc9eec349240698e11dc9163400377a1dbeffd1a36d30659e7fac8d9',
  'licenses/MenuDesign_README_UNMODIFIED.txt':'dbd8d40e5e50589a1bc7c3f15e12d8acea0042403db373f175a59abf78eb1f74',
  'preferences/gluten-free.svg':'f551c8d308da9ffaefe3dc6b487dd410d716c77e3e6879b9916f6d6241e86318',
  'preferences/halal.svg':'ece1ba6f8f4593db266b45ce1e1da0a484e640926c2672114f8c0e416e5c650c',
  'preferences/lactose-free.svg':'06db08a1f7686649265abec4a82a5d770e2828dd2b2810555a3d52e2dfc9aa32',
  'preferences/vegan.svg':'868d4af3c2e5cba88c847e53946a4335a74492ed2bb916b72fd4ca6b04fda997',
  'preferences/vegetarian.svg':'cdf7514062b1492167c5b8c2a0cb8585dee7b8731fc890290596963cddcbff72',
  'utility/budget.svg':'d92d3a09aca98dc9657e939fa1fd0688f9731239d145ea5a3f1ad1b1c63e0130',
  'utility/spice.svg':'af0b3396dc8254a76a60a4ecd0cd19543f71ea5badebf82f0a79442b8eb82a42',
};

test('all 21 approved SVGs, manifest and license are installed byte-for-byte', async () => {
  const reference=new URL('../../reference/foodie-icon-system-v2/',import.meta.url);
  const installed=new URL('../public/assets/icons-v2/',import.meta.url);
  const originalManifest=await readFile(new URL('ICON_MANIFEST.json',reference)).catch(error=>{
    if(error.code==='ENOENT')return null;
    throw error;
  });
  const verify=async (file,hash,originalFile=file)=>{
    const bytes=await readFile(new URL(file,installed));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,file+' approved SHA256');
    if(originalManifest)assert.deepEqual(bytes,await readFile(new URL(originalFile,reference)),file+' original bytes');
    return bytes;
  };
  const manifest=JSON.parse(await verify('ICON_MANIFEST.json',approvedHashes['ICON_MANIFEST.json']));
  const entries=[...manifest.allergens,...manifest.preferences,...manifest.utility];
  assert.equal(entries.length,21);
  for(const entry of entries){
    const file=entry.file.replace('assets/','');
    const id=file.split('/').at(-1).replace('.svg','');
    await verify(file,approvedHashes[file]??manifest.upstream.original_files_sha256[id],entry.file);
  }
  const license='licenses/MenuDesign_README_UNMODIFIED.txt';
  await verify(license,approvedHashes[license]);
});
