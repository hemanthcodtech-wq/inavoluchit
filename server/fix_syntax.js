const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, search, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(search, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. admin.js
replaceInFile(
  path.join(__dirname, 'routes', 'admin.js'),
  "orderBy: { createdAt: 'desc' });",
  "}).sort({ createdAt: 'desc' });"
);

// 2. auctions.js
replaceInFile(
  path.join(__dirname, 'routes', 'auctions.js'),
  "orderBy: {\n        createdAt: 'desc'\n      });",
  "}).sort({ createdAt: 'desc' });"
);

// 3. chits.js
replaceInFile(
  path.join(__dirname, 'routes', 'chits.js'),
  "res.status(500).json({ success: false, message: 'Server error generating preview calculation' });\n  });",
  "res.status(500).json({ success: false, message: 'Server error generating preview calculation' });\n  }\n});"
);

// 4. documents.js
replaceInFile(
  path.join(__dirname, 'routes', 'documents.js'),
  "cb(null, `doc-${cleanName}-${uniqueSuffix}${ext}`);\n  });",
  "cb(null, `doc-${cleanName}-${uniqueSuffix}${ext}`);\n  }\n});"
);

// 5. payments.js
replaceInFile(
  path.join(__dirname, 'routes', 'payments.js'),
  "const chit = await Chit.findOne({ id: chitId },\n      include: { members: true });",
  "const chit = await Chit.findById(chitId).lean();"
);

console.log('Syntax errors fixed!');
