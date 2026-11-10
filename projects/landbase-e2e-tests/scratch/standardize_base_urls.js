const fs = require('fs');
const path = require('path');

const dir = 'tests';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.ts'));
let totalReplaced = 0;

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  const target1 = "process.env.BASE_URL || 'https://landbase.vn'";
  const target2 = "process.env.BASE_URL || 'https://landbase.vn/'";
  const replacement = "process.env.BASE_URL || process.env.WEBAPP_URL || 'https://dev-webapp.laand.vn'";

  if (content.includes(target1)) {
    content = content.replaceAll(target1, replacement);
    changed = true;
  }
  if (content.includes(target2)) {
    content = content.replaceAll(target2, replacement);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('✅ Updated:', f);
    totalReplaced++;
  }
});

console.log('Done! Total test files updated:', totalReplaced);

