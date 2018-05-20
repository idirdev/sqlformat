# sqlformat

> **[EN]** Format messy SQL queries into clean, readable multi-line output — or minify them for production use — directly from the CLI or your Node.js code.
> **[FR]** Formatez des requêtes SQL désordonnées en sortie multi-lignes lisible — ou minifiez-les pour la production — directement depuis la CLI ou votre code Node.js.

---

## Features / Fonctionnalités

**[EN]**
- Formats SQL with proper indentation and keyword capitalization
- Recognizes major SQL keywords: SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, etc.
- Handles subqueries with automatic depth indentation
- Comma-separated lists broken onto individual lines for readability
- AND / OR clauses indented for clarity
- `--minify` flag to collapse whitespace for compact single-line output
- Reads from a file or stdin — pipe-friendly
- Zero external dependencies — pure JavaScript tokenizer

**[FR]**
- Formate SQL avec une indentation appropriée et la capitalisation des mots-clés
- Reconnaît les mots-clés SQL majeurs : SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, etc.
- Gère les sous-requêtes avec indentation automatique de la profondeur
- Listes séparées par virgules découpées en lignes individuelles pour la lisibilité
- Clauses AND / OR indentées pour la clarté
- Flag `--minify` pour compresser les espaces en une sortie compacte sur une ligne
- Lit depuis un fichier ou stdin — compatible avec les pipes
- Aucune dépendance externe — tokeniseur JavaScript pur

---

## Installation

```bash
npm install -g @idirdev/sqlformat
```

---

## CLI Usage / Utilisation CLI

```bash
# Format a SQL file
# Formater un fichier SQL
sqlformat query.sql

# Format SQL from stdin (pipe)
# Formater du SQL depuis stdin (pipe)
echo "select id,name from users where active=1 and age>18" | sqlformat

# Minify SQL (remove extra whitespace)
# Minifier SQL (supprimer les espaces superflus)
sqlformat query.sql --minify

# Pipe minified SQL
# Piper du SQL minifié
cat big-query.sql | sqlformat --minify

# Custom indentation (4 spaces)
# Indentation personnalisée (4 espaces)
sqlformat query.sql --indent "    "
```

### Example Output / Exemple de sortie

```
Input:  select u.id,u.name,o.total from users u left join orders o on u.id=o.user_id where u.active=1 and o.total>100 order by o.total desc limit 20

Output (formatted):
SELECT u.id,
  u.name,
  o.total
FROM users u
LEFT JOIN orders o
  ON u.id = o.user_id
WHERE u.active = 1
  AND o.total > 100
ORDER BY o.total desc
LIMIT 20

Output (minified):
SELECT u.id, u.name, o.total FROM users u LEFT JOIN orders o ON u.id=o.user_id WHERE u.active=1 AND o.total>100 ORDER BY o.total desc LIMIT 20
```

---

## API (Programmatic) / API (Programmation)

```js
const { format, minify, tokenize, KEYWORDS } = require('@idirdev/sqlformat');

const sql = 'select id,name,email from users where active=1 and role="admin" order by name limit 10';

// Format with default options (uppercase keywords, 2-space indent)
// Formater avec les options par défaut (mots-clés en majuscules, indentation 2 espaces)
console.log(format(sql));
// SELECT id,
//   name,
//   email
// FROM users
// WHERE active = 1
//   AND role = "admin"
// ORDER BY name
// LIMIT 10

// Format with custom options
// Formater avec des options personnalisées
format(sql, { indent: '    ', uppercase: false });
// select id,
//     name,
//     email
// from users ...

// Minify — collapse to a single line
// Minifier — réduire à une seule ligne
minify(sql);
// => 'SELECT id, name, email FROM users WHERE active=1 AND role="admin" ORDER BY name LIMIT 10'

// Tokenize for custom processing
// Tokeniser pour un traitement personnalisé
const tokens = tokenize('SELECT id FROM users');
// => [{ type: 'keyword', value: 'SELECT' }, { type: 'ident', value: 'id' }, ...]

// Check if a word is a SQL keyword
// Vérifier si un mot est un mot-clé SQL
KEYWORDS.has('SELECT'); // => true
KEYWORDS.has('myTable'); // => false
```

---

## License

MIT © idirdev
