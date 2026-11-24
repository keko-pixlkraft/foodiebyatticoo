import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defaultTheme, matchesCalorieLimit, mediaStatus, nextMediaStatus, normalizeTheme,
  parseNutrition, readableInk, viewCartRate,
} from '../src/prototype.ts';

test('nutrition keeps missing values distinct from a declared zero', () => {
  assert.equal(parseNutrition({ kcal: ' ', protein: '' }), null);
  assert.deepEqual(parseNutrition({ kcal: '0', protein: '2.5', serving: '200 g' }), {
    kcal: 0, protein: 2.5, serving: '200 g', source: 'entered',
  });
  for (const kcal of ['-1', 'NaN', 'Infinity', '10001', '0x10', '2.5']) {
    assert.throws(() => parseNutrition({ kcal }), RangeError);
  }
});

test('strictly under a calorie limit requires an explicit estimate', () => {
  assert.equal(matchesCalorieLimit(null, 300), false);
  assert.equal(matchesCalorieLimit({ protein: 5, source: 'entered' }, 300), false);
  assert.equal(matchesCalorieLimit({ kcal: 300, source: 'sample' }, 300), false);
  assert.equal(matchesCalorieLimit({ kcal: 0, source: 'entered' }, 300), true);
  assert.equal(matchesCalorieLimit(null, null), true);
});

test('theme colors are validated and solid controls choose readable ink', () => {
  assert.deepEqual(normalizeTheme({ accent: 'url(bad)', surface: '#ffffff', button: 'other' }), {
    ...defaultTheme, surface: '#ffffff',
  });
  assert.equal(readableInk('#ffffff'), '#000000');
  assert.equal(readableInk('#000000'), '#ffffff');
});

test('media demo advances in sequence and approved media can be requested again', () => {
  assert.equal(mediaStatus(undefined), 'ready');
  assert.equal(nextMediaStatus('ready'), 'requested');
  assert.equal(nextMediaStatus('requested'), 'production');
  assert.equal(nextMediaStatus('production'), 'approved');
  assert.equal(nextMediaStatus('approved'), 'requested');
});

test('add-to-cart rate is based on views with at least one add', () => {
  assert.equal(viewCartRate(0, 0), null);
  assert.equal(viewCartRate(4, 1), 25);
  assert.equal(viewCartRate(3, 0), 0);
});
