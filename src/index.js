'use strict';

/**
 * @fileoverview SQL formatting, minifying, validating and highlighting utilities.
 * @module sqlformat
 * @author idirdev
 */

/**
 * SQL keyword groups for classification and formatting.
 * @readonly
 * @enum {string[]}
 */
const KEYWORDS = {
  major: [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'FULL JOIN', 'FULL OUTER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN',
    'CROSS JOIN', 'ON', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 'HAVING',
    'LIMIT', 'OFFSET', 'INSERT INTO', 'INSERT', 'VALUES', 'UPDATE', 'SET',
    'DELETE FROM', 'DELETE', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
    'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'WITH',
  ],
  minor: [
    'AS', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN', 'LIKE', 'ILIKE',
    'EXISTS', 'NOT EXISTS', 'DISTINCT', 'ALL', 'ANY', 'SOME', 'NOT', 'NULL',
    'TRUE', 'FALSE', 'DEFAULT', 'CONSTRAINT', 'PRIMARY KEY', 'FOREIGN KEY',
    'REFERENCES', 'UNIQUE', 'INDEX', 'IF NOT EXISTS', 'IF EXISTS',
    'RETURNING', 'INTO', 'CASCADE', 'RESTRICT',
  ],
  case: ['CASE', 'WHEN', 'THEN', 'ELSE', 'END'],
  functions: [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
    'CONVERT', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'TRIM', 'UPPER',
    'LOWER', 'LENGTH', 'SUBSTRING', 'REPLACE', 'CONCAT', 'ROUND', 'FLOOR',
    'CEIL', 'ABS', 'MOD', 'EXTRACT',
  ],
};

/** ANSI escape codes for terminal coloring. */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

/**
 * Tokenize a SQL string into an array of token objects.
 * @param {string} sql - Raw SQL string.
 * @returns {{ type: string, value: string }[]} Array of tokens.
 */
function tokenize(sql) {
  const tokens = [];
  let i = 0;
  const len = sql.length;

  while (i < len) {
    // Whitespace
    if (/\s/.test(sql[i])) {
      let ws = '';
      while (i < len && /\s/.test(sql[i])) ws += sql[i++];
      tokens.push({ type: 'whitespace', value: ws });
      continue;
    }

    // Single-line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let comment = '';
      while (i < len && sql[i] !== '\n') comment += sql[i++];
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Block comment
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let comment = '/*';
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) comment += sql[i++];
      comment += '*/';
      i += 2;
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // String literals
    if (sql[i] === "'" || sql[i] === '"' || sql[i] === '`') {
      const quote = sql[i];
      let str = quote;
      i++;
      while (i < len) {
        if (sql[i] === '\\') { str += sql[i] + sql[i + 1]; i += 2; continue; }
        if (sql[i] === quote) { str += sql[i++]; break; }
        str += sql[i++];
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(sql[i]) || (sql[i] === '.' && /[0-9]/.test(sql[i + 1]))) {
      let num = '';
      while (i < len && /[0-9.]/.test(sql[i])) num += sql[i++];
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(sql[i])) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(sql[i])) word += sql[i++];
      tokens.push({ type: 'word', value: word });
      continue;
    }

    // Parentheses
    if (sql[i] === '(') { tokens.push({ type: 'lparen', value: '(' }); i++; continue; }
    if (sql[i] === ')') { tokens.push({ type: 'rparen', value: ')' }); i++; continue; }

    // Operators and punctuation
    const two = sql.slice(i, i + 2);
    if (['<>', '<=', '>=', '!=', '::', '||'].includes(two)) {
      tokens.push({ type: 'operator', value: two }); i += 2; continue;
    }

    tokens.push({ type: 'operator', value: sql[i] }); i++;
  }

  return tokens.filter(t => t.type !== 'whitespace');
}

/**
 * Classify a token value as its SQL semantic type.
 * @param {string} token - Token string value.
 * @returns {string} Classification: 'major', 'minor', 'case', 'function', 'identifier', 'string', 'number', 'operator'.
 */
function classify(token) {
  const upper = token.toUpperCase();
  if (KEYWORDS.major.includes(upper)) return 'major';
  if (KEYWORDS.minor.includes(upper)) return 'minor';
  if (KEYWORDS.case.includes(upper)) return 'case';
  if (KEYWORDS.functions.includes(upper)) return 'function';
  if (/^[0-9.]+$/.test(token)) return 'number';
  if (/^['"`]/.test(token)) return 'string';
  if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(token)) return 'identifier';
  return 'operator';
}

/**
 * Format an array of tokens into a readable SQL string.
 * @param {{ type: string, value: string }[]} tokens - Tokens from tokenize().
 * @param {{ indent?: number, uppercase?: boolean }} opts - Formatting options.
 * @returns {string} Formatted SQL.
 */
function formatTokens(tokens, opts) {
  const indentStr = ' '.repeat(opts.indent || 2);
  const upper = opts.uppercase !== false;
  let depth = 0;
  let result = '';
  let lineStart = true;

  const kw = v => upper ? v.toUpperCase() : v.toLowerCase();
  const pad = () => indentStr.repeat(depth);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const type = classify(tok.value);

    if (tok.type === 'lparen') {
      result += '(';
      depth++;
      lineStart = false;
      continue;
    }

    if (tok.type === 'rparen') {
      depth = Math.max(0, depth - 1);
      result += ')';
      lineStart = false;
      continue;
    }

    if (tok.type === 'comment') {
      result += (lineStart ? '' : '\n' + pad()) + tok.value + '\n' + pad();
      lineStart = true;
      continue;
    }

    if (type === 'major') {
      const v = kw(tok.value);
      result += (result.length > 0 ? '\n' + pad() : pad()) + v + ' ';
      lineStart = false;
      continue;
    }

    if (type === 'case') {
      const v = kw(tok.value);
      if (tok.value.toUpperCase() === 'CASE') {
        result += (lineStart ? pad() : '') + v + '\n';
        depth++;
        lineStart = true;
      } else if (tok.value.toUpperCase() === 'END') {
        depth = Math.max(0, depth - 1);
        result += '\n' + pad() + v;
        lineStart = false;
      } else {
        result += pad() + v + ' ';
        lineStart = false;
      }
      continue;
    }

    if (tok.type === 'operator' && tok.value === ',') {
      result += ',\n' + pad();
      lineStart = true;
      continue;
    }

    if (tok.type === 'operator' && tok.value === ';') {
      result += ';';
      lineStart = false;
      continue;
    }

    const display = (type === 'major' || type === 'minor' || type === 'case')
      ? kw(tok.value)
      : tok.value;

    result += (lineStart ? pad() : '') + display + ' ';
    lineStart = false;
  }

  return result.trim();
}

/**
 * Format a SQL string with indentation and keyword casing.
 * @param {string} sql - Raw SQL input.
 * @param {{ indent?: number, uppercase?: boolean, linesBetweenQueries?: number }} [opts] - Formatting options.
 * @returns {string} Formatted SQL string.
 */
function format(sql, opts = {}) {
  const options = { indent: 2, uppercase: true, linesBetweenQueries: 2, ...opts };
  const separator = ';';
  const queries = sql.split(/;\s*/g).filter(q => q.trim().length > 0);
  const gap = '\n'.repeat(options.linesBetweenQueries);

  return queries
    .map(q => {
      const tokens = tokenize(q);
      return formatTokens(tokens, options);
    })
    .join(gap + separator + gap)
    .trim();
}

/**
 * Remove extra whitespace and newlines from a SQL string.
 * @param {string} sql - Raw SQL input.
 * @returns {string} Minified SQL string.
 */
function minify(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Basic syntax validation: balanced parentheses and no unclosed string literals.
 * @param {string} sql - SQL string to validate.
 * @returns {{ valid: boolean, errors: string[] }} Validation result.
 */
function validate(sql) {
  const errors = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth < 0) { errors.push('Unexpected closing parenthesis at position ' + i); depth = 0; }
    }
  }

  if (depth > 0) errors.push('Unclosed parenthesis: ' + depth + ' opening(s) without closing');
  if (inSingle) errors.push("Unclosed single-quoted string literal");
  if (inDouble) errors.push('Unclosed double-quoted string literal');
  if (!/select|insert|update|delete|create|alter|drop|with/i.test(sql)) {
    errors.push('No recognizable SQL statement found');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Add ANSI color codes to SQL keywords for terminal output.
 * @param {string} sql - Raw SQL string.
 * @returns {string} SQL with ANSI color sequences for terminal display.
 */
function highlight(sql) {
  const tokens = tokenize(sql);
  return tokens.map(tok => {
    const type = classify(tok.value);
    switch (type) {
      case 'major':    return ANSI.cyan + ANSI.bold + tok.value.toUpperCase() + ANSI.reset;
      case 'minor':    return ANSI.blue + tok.value.toUpperCase() + ANSI.reset;
      case 'case':     return ANSI.magenta + tok.value.toUpperCase() + ANSI.reset;
      case 'function': return ANSI.yellow + tok.value.toUpperCase() + ANSI.reset;
      case 'string':   return ANSI.green + tok.value + ANSI.reset;
      case 'number':   return ANSI.red + tok.value + ANSI.reset;
      default:         return tok.value;
    }
  }).join(' ');
}

module.exports = { tokenize, classify, formatTokens, format, minify, validate, highlight };
