import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, validatePackageName, binName } from '../src/names.js';

test('slugify transliterates accented and Turkish letters', () => {
  assert.equal(slugify('Ahmet Erkan Paşahan'), 'ahmet-erkan-pasahan');
  assert.equal(slugify('İlkim Işık Öztürk'), 'ilkim-isik-ozturk');
  assert.equal(slugify('  José  Müller-Straße '), 'jose-muller-strasse');
});

test('package name validation follows npm rules', () => {
  for (const ok of ['jane', 'jane-doe', '@jane/card', 'j.d']) assert.equal(validatePackageName(ok), undefined, ok);
  for (const bad of ['', 'Jane', '.jane', '_jane', 'ja ne', 'jane/card', 'node_modules', 'a'.repeat(215)]) {
    assert.ok(validatePackageName(bad), bad);
  }
});

test('bin name drops the scope', () => {
  assert.equal(binName('@jane/card'), 'card');
  assert.equal(binName('jane'), 'jane');
});
