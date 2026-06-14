const http = require('https');

const packageIds = ['produccion-clae-clasificador-actividades-economicas', 'produccion-diccionario-claes', 'diccionario-claes'];

function fetchMetadata(packageId) {
  return new Promise((resolve, reject) => {
    const url = `https://datos.gob.ar/api/3/action/package_show?id=${packageId}`;
    console.log(`Fetching: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            if (json.success) {
              resolve(json.result);
              return;
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      resolve(null);
    });
  });
}

async function run() {
  for (const id of packageIds) {
    const result = await fetchMetadata(id);
    if (result) {
      console.log(`\nFound dataset for package ID: ${id}`);
      console.log(`Title: ${result.title}`);
      console.log('Resources:');
      result.resources.forEach((r) => {
        console.log(`- Name: ${r.name}`);
        console.log(`  Format: ${r.format}`);
        console.log(`  URL: ${r.url}`);
      });
      break;
    } else {
      console.log(`Package ID: ${id} not found.`);
    }
  }
}

run();
