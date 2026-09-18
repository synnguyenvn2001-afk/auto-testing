const fs = require('node:fs');
const path = require('node:path');

const authStatePath = path.resolve(__dirname, '..', 'playwright', '.auth', 'user.json');
const artifactsDir = path.resolve(__dirname, '..', 'artifacts', 'scratch');

function artifactPath(fileName) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  return path.join(artifactsDir, fileName);
}

module.exports = { authStatePath, artifactPath };
