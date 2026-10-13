const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && f !== 'auth.js');

files.forEach(file => {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  
  // This regex finds standard express response endings that erroneously have }); directly after them
  content = content.replace(/(res\.(?:status\(\d{3}\)\.)?json\([^)]+\);)\s*\}\);/g, '$1\n  }\n});');
  
  fs.writeFileSync(path.join(routesDir, file), content, 'utf8');
});

console.log('Global catch-block syntax fixed!');
