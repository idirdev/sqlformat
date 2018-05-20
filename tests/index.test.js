'use strict';

/**
 * @fileoverview Tests for sqlformat.
 * @author idirdev
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { tokenize, classify, format, minify, validate, highlight } = require('../src/index.js');

test('tokenize: splits basic SELECT into tokens', () => {
  const tokens = tokenize('SELECT id, name FROM users');
  const values = tokens.map(t => t.value);
  assert.ok(values.includes('SELECT'));
  assert.ok(values.includes('id'));
  assert.ok(values.includes('FROM'));
  assert.ok(values.includes('users'));
});

test('tokenize: handles string literals', () => {
  const tokens = tokenize("SELECT 'hello world' FROM t");
  const str = tokens.find(t => t.type === 'string');
  assert.ok(str, 'should have a string token');
  assert.equal(str.value, "'hello world'");
});

test('classify: major keywords', () => {
  assert.equal(classify('SELECT'), 'major');
  assert.equal(classify('FROM'), 'major');
  assert.equal(classify('WHERE'), 'major');
  assert.equal(classify('JOIN'), 'major');
});

test('classify: case keywords', () => {
  assert.equal(classify('CASE'), 'case');
  assert.equal(classify('WHEN'), 'case');
  assert.equal(classify('THEN'), 'case');
  assert.equal(classify('END'), 'case');
});

test('classify: function names', () => {
  assert.equal(classify('COUNT'), 'function');
  assert.equal(classify('SUM'), 'function');
  assert.equal(classify('COALESCE'), 'function');
});

test('format: uppercase keywords', () => {
  const result = format('select id from users where id = 1', { uppercase: true });
  assert.ok(result.includes('SELECT'));
  assert.ok(result.includes('FROM'));
  assert.ok(result.includes('WHERE'));
});

test('format: lowercase keywords', () => {
  const result = format('SELECT ID FROM USERS', { uppercase: false });
  assert.ok(result.includes('select'));
  assert.ok(result.includes('from'));
});

test('format: custom indent', () => {
  const result = format('SELECT a, b FROM t WHERE x = 1', { indent: 4 });
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('format: handles subquery parentheses', () => {
  const sql = 'SELECT * FROM (SELECT id FROM users) sub WHERE sub.id > 1';
  const result = format(sql);
  assert.ok(result.includes('SELECT'));
  assert.ok(result.includes('FROM'));
});

test('format: multiple queries with linesBetweenQueries', () => {
  const sql = 'SELECT 1; SELECT 2';
  const result = format(sql, { linesBetweenQueries: 1 });
  assert.ok(result.includes('SELECT'));
});

test('format: INSERT statement', () => {
  const sql = "INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')";
  const result = format(sql);
  assert.ok(result.includes('INSERT'));
  assert.ok(result.includes('VALUES'));
});

test('minify: removes extra whitespace', () => {
  const sql = '  SELECT   id ,  name  FROM   users  ';
  const result = minify(sql);
  assert.equal(result, 'SELECT id , name FROM users');
});

test('minify: removes comments', () => {
  const sql = '-- this is a comment\nSELECT 1';
  const result = minify(sql);
  assert.ok(!result.includes('--'));
  assert.ok(result.includes('SELECT 1'));
});

test('validate: valid SELECT returns no errors', () => {
  const result = validate('SELECT id FROM users WHERE id = 1');
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validate: unbalanced parentheses', () => {
  const result = validate('SELECT (id FROM users');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('validate: unclosed string', () => {
  const result = validate("SELECT 'unclosed FROM users");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('single-quoted')));
});

test('highlight: returns string with ANSI codes', () => {
  const result = highlight('SELECT id FROM users');
  assert.ok(typeof result === 'string');
  assert.ok(result.includes('\x1b['));
  assert.ok(result.includes('SELECT'));
});
