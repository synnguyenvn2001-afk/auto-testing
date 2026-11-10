const fs = require('fs');
const html = fs.readFileSync('artifacts/playwright-report/index.html', 'utf8');
const regex = /"testId":"([^"]+)"/g;
let m;
const ids = [];
while ((m = regex.exec(html)) !== null) {
  ids.push(m[1]);
}
console.log('Total testIds:', ids.length);
console.log('Includes exact target:', ids.includes('8cb4c0cf8dead44dcc83-a8b8264d9479b3f5b1c2'));
if (!ids.includes('8cb4c0cf8dead44dcc83-a8b8264d9479b3f5b1c2')) {
  console.log('Sample IDs:', ids.slice(0, 5));
}

// Search for any failed tests in index.html
const failedMatches = [...html.matchAll(/"status":"(failed|unexpected)"/g)];
console.log('Failed status count:', failedMatches.length);
