const fs = require('fs');
const html = fs.readFileSync('artifacts/playwright-report/index.html', 'utf8');

const marker = 'window.playwrightReportBase64 = "';
const startIdx = html.indexOf(marker);
if (startIdx !== -1) {
  const dataStart = startIdx + marker.length;
  const dataEnd = html.indexOf('";', dataStart);
  const b64 = html.slice(dataStart, dataEnd);
  const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  const report = JSON.parse(jsonStr);

  function findTests(items, result = []) {
    for (const item of items) {
      if (item.testId) {
        result.push(item);
      }
      if (item.tests) findTests(item.tests, result);
      if (item.subSuites) findTests(item.subSuites, result);
      if (item.suites) findTests(item.suites, result);
      if (item.files) findTests(item.files, result);
    }
    return result;
  }

  const allTests = findTests(report.files || []);
  console.log('Total tests found:', allTests.length);
  
  const targetId = '8cb4c0cf8dead44dcc83-a8b8264d9479b3f5b1c2';
  const match = allTests.find(t => t.testId === targetId || t.testId?.includes('8cb4c0cf8dead44dcc83'));
  if (match) {
    console.log('MATCH FOUND!');
    console.log('Title:', match.title);
    console.log('Location:', match.location);
    console.log('Status:', match.status);
    console.log('Results:', JSON.stringify(match.results, null, 2));
  } else {
    console.log('No exact match for target ID.');
    const failed = allTests.filter(t => t.status === 'unexpected' || t.status === 'failed');
    console.log('Failed tests count:', failed.length);
    failed.forEach(f => {
      console.log('Failed testId:', f.testId, 'Title:', f.title);
      if (f.results) {
        f.results.forEach(r => {
          if (r.error) console.log('Error:', r.error.message || r.error);
        });
      }
    });
  }
} else {
  console.log('Marker not found');
}
