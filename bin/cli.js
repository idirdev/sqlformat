#!/usr/bin/env node
'use strict';

/**
 * @fileoverview CLI for sqlformat — format, minify, validate, or highlight SQL.
 * @author idirdev
 */

const fs = require('fs');
const path = require('path');
const { format, minify, validate, highlight } = require('../src/index.js');

const args = process.argv.slice(2);
const opts = { indent: 2, uppercase: true, linesBetweenQueries: 2 };
let file = null;
let mode = 'format';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--indent' && args[i + 1]) { opts.indent = parseInt(args[++i], 10); }
  else if (args[i] === '--uppercase') { opts.uppercase = true; }
  else if (args[i] === '--minify') { mode = 'minify'; }
  else if (args[i] === '--highlight') { mode = 'highlight'; }
  else if (args[i] === '--check') { mode = 'check'; }
  else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: sqlformat [file] [--indent N] [--uppercase] [--minify] [--highlight] [--check]');
    console.log('  Reads from file or stdin. Formats SQL by default.');
    process.exit(0);
  } else if (!args[i].startsWith('--')) {
    file = args[i];
  }
}

function run(sql) {
  if (mode === 'minify') { console.log(minify(sql)); return; }
  if (mode === 'highlight') { console.log(highlight(sql)); return; }
  if (mode === 'check') {
    const result = validate(sql);
    if (result.valid) { console.log('SQL is valid.'); process.exit(0); }
    else { result.errors.forEach(e => console.error('Error: ' + e)); process.exit(1); }
    return;
  }
  console.log(format(sql, opts));
}

if (file) {
  const sql = fs.readFileSync(path.resolve(file), 'utf8');
  run(sql);
} else if (!process.stdin.isTTY) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { buf += d; });
  process.stdin.on('end', () => run(buf));
} else {
  console.error('No input. Provide a file path or pipe SQL via stdin.');
  process.exit(1);
}
