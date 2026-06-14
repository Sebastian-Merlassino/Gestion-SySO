const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'clae_agg.csv');

try {
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines in CSV: ${lines.length}`);
  
  const targetCodes = ['11111', '101011', '492290', '524120'];
  const matches = {};
  
  lines.forEach((line) => {
    const parts = line.split(',');
    const code = parts[0] ? parts[0].replace(/"/g, '').trim() : '';
    if (targetCodes.includes(code)) {
      matches[code] = line.trim();
    }
  });
  
  console.log('Matches found in CSV:');
  console.log(JSON.stringify(matches, null, 2));
} catch (e) {
  console.error(e);
}
