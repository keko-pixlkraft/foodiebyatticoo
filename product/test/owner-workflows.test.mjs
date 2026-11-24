import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../src/prototype.ts';

test('media updates retain a structured local request without changing its source photograph', () => {
  assert.equal(typeof rules.createMediaRequest, 'function');
  const input = {restaurantId:'mizora',dishId:'mizora-03',mediaId:'assets/mizora/dish-03-overview.jpg',requestedChanges:['lighting','crop','lighting'],note:'Keep the served ingredients unchanged.',priority:'normal',createdAt:'2026-11-24T12:00:00.000Z'};
  const request = rules.createMediaRequest(input);
  assert.equal(request.status,'requested');
  assert.equal(request.mediaId,input.mediaId);
  assert.deepEqual(request.requestedChanges,['lighting','crop']);
  assert.equal(request.note,input.note);
  assert.throws(()=>rules.createMediaRequest({...input,requestedChanges:[]}),RangeError);
  assert.throws(()=>rules.createMediaRequest({...input,requestedChanges:['generate-food']}),RangeError);
});

test('event timing is independent of guest publication and respects leap days', () => {
  assert.equal(typeof rules.eventPhase,'function');
  assert.equal(rules.eventPhase('2028-02-29','2028-02-28'),'upcoming');
  assert.equal(rules.eventPhase('2028-02-29','2028-02-29'),'today');
  assert.equal(rules.eventPhase('2028-02-29','2028-03-01'),'past');
  assert.throws(()=>rules.eventPhase('2027-02-29','2027-02-28'),RangeError);
});
