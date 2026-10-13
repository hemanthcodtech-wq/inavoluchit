const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, search, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(search, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
}

// admin.js
replaceInFile(
  path.join(__dirname, 'routes', 'admin.js'),
  "        payments: true\n      },\n      orderBy: { createdAt: 'desc' });",
  "      }).sort({ createdAt: -1 });"
);

// auctions.js
replaceInFile(
  path.join(__dirname, 'routes', 'auctions.js'),
  "    const chit = await Chit.findOne({ id: chitId },\n      include: {\n        members: {\n          include: { user: true }\n        }\n      });",
  "    const chit = await Chit.findById(chitId).lean();"
);

// documents.js
replaceInFile(
  path.join(__dirname, 'routes', 'documents.js'),
  "    const user = await User.findOne({ id: userId },\n      select: {\n        id: true,\n        memberId: true,\n        name: true,\n",
  "    const user = await User.findById(userId).select('memberId name');\n//"
);

// payments.js
replaceInFile(
  path.join(__dirname, 'routes', 'payments.js'),
  "            memberId: true\n          }\n        }\n      },\n      orderBy: { createdAt: 'desc' });",
  "          }\n        }\n      }).sort({ createdAt: -1 });"
);

console.log('Syntax errors fixed 2!');
