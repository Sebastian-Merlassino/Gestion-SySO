const http = require('https');

function searchPackages(query) {
  return new Promise((resolve, reject) => {
    const url = `https://datos.gob.ar/api/3/action/package_search?q=${encodeURIComponent(query)}`;
    console.log(`Searching: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            if (json.success) {
              resolve(json.result.results);
              return;
            }
          }
          resolve([]);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', (err) => {
      resolve([]);
    });
  });
}

async function run() {
  const results = await searchPackages('clae');
  console.log(`Found ${results.length} packages:`);
  results.forEach((p) => {
    console.log(`- ID: ${p.name}`);
    console.log(`  Title: ${p.title}`);
    console.log('  Resources:');
    p.resources.forEach((r) => {
      console.log(`    - Name: ${r.name}`);
      console.log(`      Format: ${r.format}`);
      console.log(`      URL: ${r.url}`);
    });
  });
}

run();
