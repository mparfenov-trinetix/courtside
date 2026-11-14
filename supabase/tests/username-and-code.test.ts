import assert from 'node:assert/strict';
import { test } from 'node:test';

import { joinCodeMatches, normalizeJoinCode, sha256Hex, timingSafeEqual } from '../functions/_shared/join-code.ts';
import { RESERVED, validateUsername } from '../functions/_shared/username.ts';

test('good usernames pass, trimmed', () => {
  for (const name of ['abc', 'Mykola', 'mykola_99', 'A_B_C', 'x'.repeat(20)]) {
    const check = validateUsername(name);
    assert.deepEqual(check, { ok: true, username: name }, name);
  }
  assert.deepEqual(validateUsername('  Mykola  '), { ok: true, username: 'Mykola' });
});

test('bad usernames say why', () => {
  for (const name of ['', 'ab', 'x'.repeat(21), 'has space', 'dash-ed', 'émile', 'emoji🙂', 'semi;colon', "o'brien", undefined, null, 42]) {
    const check = validateUsername(name);
    assert.equal(check.ok, false, String(name));
    if (!check.ok) assert.equal(check.reason, 'format');
  }
  for (const name of RESERVED) {
    const check = validateUsername(name.toUpperCase());
    if (name.length >= 3) assert.deepEqual([check.ok, !check.ok && check.reason], [false, 'reserved'], name);
  }
});

test('join codes are compared ignoring case and spaces', () => {
  assert.equal(normalizeJoinCode('  hoop-7k2q '), 'HOOP-7K2Q');
  assert.equal(normalizeJoinCode(undefined), '');
  assert.equal(normalizeJoinCode(7), '');
});

test('the join code is checked against the secret, the stored hash, or either; with neither nobody gets in', async () => {
  const hash = await sha256Hex('HOOP-7K2Q');
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]+$/);

  assert.equal(await joinCodeMatches('hoop-7k2q', 'HOOP-7K2Q', undefined), true);
  assert.equal(await joinCodeMatches(' HOOP-7K2Q ', undefined, hash), true);
  assert.equal(await joinCodeMatches('HOOP-7K2Q', undefined, hash.toUpperCase()), true);
  assert.equal(await joinCodeMatches('HOOP-7K2Q', 'something else', hash), true, 'either one is enough');
  assert.equal(await joinCodeMatches('WRONG', 'HOOP-7K2Q', hash), false);
  assert.equal(await joinCodeMatches('', 'HOOP-7K2Q', hash), false);
  assert.equal(await joinCodeMatches(undefined, 'HOOP-7K2Q', hash), false);
  // Closed by default: no secret and no stored hash means no code is good.
  assert.equal(await joinCodeMatches('HOOP-7K2Q', undefined, undefined), false);
  assert.equal(await joinCodeMatches('HOOP-7K2Q', '', ''), false);
});

test('timingSafeEqual is plain equality for strings of any length', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
  assert.equal(timingSafeEqual('', 'a'), false);
});
