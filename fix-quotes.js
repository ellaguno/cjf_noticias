const fs = require('fs');

// Create the correct title with Unicode quotes
const correctTitle = Buffer.from('e2809c564947494c4152c3814ee2809d2041204a55454345532053555320434f4c45474153204445204c41203454', 'hex').toString('utf8');

console.log('Correct title:', JSON.stringify(correctTitle));

// Read the pdf extractor file
const filePath = './server/src/services/pdf/pdfExtractor.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the incorrect title with the correct one
const oldTitle = '    \'"VIGILARÁN" A JUECES SUS COLEGAS DE LA 4T\',';
const newTitle = `    '${correctTitle}',`;

console.log('Looking for:', JSON.stringify(oldTitle));
console.log('Replacing with:', JSON.stringify(newTitle));

if (content.includes(oldTitle)) {
  content = content.replace(oldTitle, newTitle);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('File updated successfully!');
} else {
  console.log('Pattern not found in file');
  // Try to find similar patterns
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('VIGILARÁN')) {
      console.log(`Line ${index + 1}: ${JSON.stringify(line)}`);
    }
  });
}