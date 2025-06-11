const { execSync } = require('child_process');
const fs = require('fs');

// Extract the exact first title from the PDF content
const pdfPath = './storage/pdf/2025-06-05.pdf';

if (fs.existsSync(pdfPath)) {
  const command = `pdftotext -f 2 -l 4 "${pdfPath}" -`;
  const content = execSync(command, { 
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 
  });
  
  // Find the first title
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('VIGILARÁN')) {
      console.log('Found line:', JSON.stringify(line));
      console.log('Hex:', Buffer.from(line, 'utf8').toString('hex'));
      break;
    }
  }
  
  // Also try cleaning it the same way as the algorithm
  let cleanContent = content;
  cleanContent = cleanContent.replace(/OCHO COLUMNAS\s*/gi, '');
  cleanContent = cleanContent.replace(/Jueves \d+ de \w+ de \d{4}/gi, '');
  cleanContent = cleanContent.replace(/Página \d+/gi, '');
  cleanContent = cleanContent.replace(/\[PAGE \d+\]/g, '');
  
  console.log('\nAfter cleaning - first 100 chars:');
  console.log(JSON.stringify(cleanContent.substring(0, 100)));
  
  // Check if the title exists in cleaned content
  const testTitle = '"VIGILARÁN" A JUECES SUS COLEGAS DE LA 4T';
  console.log('\nSearching for title:', JSON.stringify(testTitle));
  console.log('Found at position:', cleanContent.indexOf(testTitle));
}