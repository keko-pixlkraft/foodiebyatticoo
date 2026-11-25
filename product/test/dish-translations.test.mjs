import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as rules from '../src/prototype.ts';

test('refresh default translations without overwriting restaurant edits or mutating saved data', () => {
  assert.equal(typeof rules.refreshDefaultDishNames,'function');
  const defaults=[{id:'salad',name:'House Salad',translations:{de:{name:'Haussalat',summary:'Neue Beschreibung'},es:{name:'Ensalada de la casa'}}}];
  const stored=[{id:'salad',name:'House Salad',price:44,translations:{de:{name:'House Salad',summary:'Eigene Beschreibung'},es:{name:'Mi ensalada'}}}];
  const before=structuredClone(stored);
  const result=rules.refreshDefaultDishNames(stored,defaults);
  assert.equal(result[0].translations.de.name,'Haussalat');
  assert.equal(result[0].translations.de.summary,'Eigene Beschreibung');
  assert.equal(result[0].translations.es.name,'Mi ensalada');
  assert.equal(result[0].price,44);
  assert.deepEqual(stored,before);
  const renamed=[{...stored[0],name:'Seasonal House Salad'}];
  assert.deepEqual(rules.refreshDefaultDishNames(renamed,defaults),renamed);
  const custom=[{id:'custom',name:'Chef’s special'}];
  assert.deepEqual(rules.refreshDefaultDishNames(custom,defaults),custom);
});
