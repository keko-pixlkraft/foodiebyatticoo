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

test('wishlist migration is unique, respects saved removals, and leaves old carts intact', () => {
  assert.equal(typeof rules.normalizeWishlist,'function');
  const carts={'07':{a:3,b:1},'08':{a:1,unknown:2}};
  const before=structuredClone(carts),dishes=[{id:'a'},{id:'b'}];
  assert.deepEqual(rules.normalizeWishlist(undefined,carts,dishes),['a','b']);
  assert.deepEqual(rules.normalizeWishlist([],carts,dishes),[]);
  assert.deepEqual(rules.normalizeWishlist(['b','b','unknown'],carts,dishes),['b']);
  assert.deepEqual(carts,before);
});
