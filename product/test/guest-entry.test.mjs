import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../src/prototype.ts';

test('public guest links distinguish tables from language-specific dish sharing', () => {
  assert.equal(typeof rules.guestLink,'function');
  const table=new URL(rules.guestLink('https://foodiebyatticoo.vercel.app','mizora',{table:7}));
  assert.equal(table.pathname,'/guest');assert.equal(table.searchParams.get('table'),'7');
  const dish=new URL(rules.guestLink('https://foodiebyatticoo.vercel.app','mizora',{dish:'mizora-09',lang:'es',table:7}));
  assert.equal(dish.searchParams.get('dish'),'mizora-09');assert.equal(dish.searchParams.get('lang'),'es');
  assert.equal(dish.searchParams.has('table'),false);
});

test('legacy selections preserve quantities within one table and totals use minor currency units', () => {
  const cart={a:3,b:1,unknown:2};
  const migrated=rules.legacyTableItems(cart,['a','a','c'],['a','b','c']);
  assert.deepEqual(migrated,{a:3,b:1,c:1});
  assert.deepEqual(cart,{a:3,b:1,unknown:2});
  assert.equal(rules.selectionTotal(migrated,new Map([['a',0.1],['b',0.2],['c',4.55]]),'USD'),5.05);
  assert.equal(rules.selectionTotal({a:2},new Map([['a',100]]),'JPY'),200);
});
