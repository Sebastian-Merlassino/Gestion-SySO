const http = require('https');
const fs = require('fs');
const path = require('path');

const csvUrl = 'https://cdn.produccion.gob.ar/cdn-cep/clae_agg.csv';
const outputPath = path.join(__dirname, 'clae_agg.csv');

http.get(csvUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download: ${res.statusCode}`);
    return;
  }

  const fileStream = fs.createWriteStream(outputPath);
  res.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Downloaded successfully to:', outputPath);
    
    // Read first 10 lines
    const content = fs.readFileSync(outputPath, 'utf8');
    const lines = content.split('\n');
    console.log('First 10 lines:');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  });
}).on('error', (err) => {
  console.error('Download error:', err);
});
