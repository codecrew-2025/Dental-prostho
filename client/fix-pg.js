const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'PGDashboard.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
const cleanLines = lines.slice(0, 3139);
fs.writeFileSync(filePath, cleanLines.join('\n'), 'utf8');
console.log('Fixed!');
