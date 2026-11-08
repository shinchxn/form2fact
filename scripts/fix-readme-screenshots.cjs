const fs = require('fs');
const p = 'D:/Projects/form2fact/README.md';
let s = fs.readFileSync(p, 'utf8');
// Fix directory prefix
s = s.replace(/docs\/assets\/screenshots\//g, 'docs/screenshots/');
// Fix mismatched filenames
const fixes = [
  ['docs/screenshots/04-document-upload.png', 'docs/screenshots/04-application-details.png'],
  ['docs/screenshots/05-document-viewer.png', 'docs/screenshots/06-evidence-viewer.png'],
  ['docs/screenshots/06-evidence-extraction.png', 'docs/screenshots/05-document-upload.png'],
  ['docs/screenshots/07-pairwise-verification.png', 'docs/screenshots/07-pairwise-comparison.png'],
  ['docs/screenshots/10-aicte-rules.png', 'docs/screenshots/10-regulatory-rules.png'],
];
for (const [a, b] of fixes) s = s.replace(a, b);
fs.writeFileSync(p, s);
console.log('done');
// verify all referenced screenshots exist
const refs = [...s.matchAll(/docs\/screenshots\/([^\)]+\.png)/g)].map(m => m[1]);
const missing = refs.filter(r => !require('fs').existsSync('D:/Projects/form2fact/docs/screenshots/' + r));
console.log('referenced:', refs.length, 'missing:', missing.length, missing);
