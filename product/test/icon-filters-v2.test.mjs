import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../src/prototype.ts';

test('maximum dish price is inclusive and rejects unknown or invalid prices', () => {
  assert.equal(typeof rules.matchesDishPriceLimit,'function');
  for(const limit of [20,40,60,80,100,150,200]){
    assert.equal(rules.matchesDishPriceLimit(limit,limit),true);
    assert.equal(rules.matchesDishPriceLimit(limit+.01,limit),false);
    assert.equal(rules.matchesDishPriceLimit(limit-.01,limit),true);
  }
  for(const price of [null,undefined,NaN,Infinity,-1,'20'])assert.equal(rules.matchesDishPriceLimit(price,20),false);
  assert.equal(rules.matchesDishPriceLimit(0,20),true);
  assert.equal(rules.matchesDishPriceLimit(undefined,null),true);
});

test('budget labels follow restaurant currency and guest language', () => {
  assert.equal(typeof rules.formatGuestPriceLimit,'function');
  assert.match(rules.formatGuestPriceLimit(20,'USD','en','Any'),/^≤.*\$20$/);
  assert.match(rules.formatGuestPriceLimit(20,'EUR','de','Beliebig'),/^≤.*20.*€$/);
  assert.doesNotMatch(rules.formatGuestPriceLimit(20,'EUR','de','Beliebig'),/\$/);
  assert.match(rules.formatGuestPriceLimit(20,'JPY','en','Any'),/¥20/);
  assert.equal(rules.formatGuestPriceLimit(null,'USD','es','Cualquiera'),'Cualquiera');
});

test('restrictive filters need explicit verified declarations and combine all conditions', () => {
  assert.equal(typeof rules.matchesDeclaredGuestFilters,'function');
  const filters={preferences:['lactoseFree'],exclude:['Milk'],spice:1,calorie:500,price:20};
  const dish={price:20,allergens:['Soy'],allergensVerified:true,dietaryVerified:true,dietary:{lactoseFree:true,spice:1},nutrition:{kcal:499,source:'sample'}};
  const known=['Soy','Milk'];
  assert.equal(rules.matchesDeclaredGuestFilters(dish,filters,known),true);
  for(const changed of [{allergensVerified:false},{allergensComplete:false},{allergens:undefined},{allergens:['Unknown']},{allergens:['Milk']},{dietaryVerified:false},{price:20.01},{nutrition:{kcal:500,source:'sample'}},{dietary:{lactoseFree:true}},{dietary:{lactoseFree:true,spice:2}}]){
    assert.equal(rules.matchesDeclaredGuestFilters({...dish,...changed},filters,known),false,JSON.stringify(changed));
  }
  assert.equal(rules.matchesDeclaredGuestFilters({...dish,allergens:[]},filters,known),true,'verified explicit empty declaration');
  assert.equal(rules.matchesDeclaredGuestFilters({...dish,allergens:['Milk']},{...filters,exclude:[]},known),true,'lactose-free does not remove milk allergens');
  assert.equal(rules.matchesDeclaredGuestFilters({}, {preferences:[],exclude:[],spice:null,calorie:null,price:null},known),true,'unrestricted menu remains visible');
});
