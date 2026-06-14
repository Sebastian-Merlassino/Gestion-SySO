// scripts/seed-geography.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const jsonPath = path.join(__dirname, '../src/data/localidades_agrupado.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: No se encontró el archivo JSON en: ${jsonPath}`);
    return;
  }

  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const geodata = JSON.parse(rawData);

    console.log(`Se cargaron ${geodata.length} provincias del archivo JSON.`);

    const rows = [];
    for (const item of geodata) {
      const provincia = item.provincia.trim().toUpperCase();
      if (!item.departamentos) continue;

      for (const dept of item.departamentos) {
        const departamento = dept.departamento_partido.trim().toUpperCase();
        if (!dept.localidades_barrios) continue;

        for (const loc of dept.localidades_barrios) {
          if (!loc) continue;
          rows.push({
            provincia: provincia,
            departamento_partido: departamento,
            localidad_barrio: loc.trim().toUpperCase()
          });
        }
      }
    }

    console.log(`Total de registros de localidades a insertar: ${rows.length}`);

    // Limpiar tabla existente para evitar duplicados en seedings sucesivos
    console.log('Limpiando registros existentes en la tabla geografia...');
    const { error: deleteErr } = await supabase
      .from('geografia')
      .delete()
      .neq('id', 0); // Borrar todo

    if (deleteErr) {
      console.error('Error al limpiar la tabla:', deleteErr);
      return;
    }
    console.log('Tabla geografia limpia.');

    // Insertar por lotes (batches) de 1000 registros para evitar sobrecargar la conexión
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      console.log(`Insertando lote ${i / batchSize + 1} de ${Math.ceil(rows.length / batchSize)} (registros: ${i} a ${Math.min(i + batchSize, rows.length)})...`);
      
      const { error: insertErr } = await supabase
        .from('geografia')
        .insert(batch);

      if (insertErr) {
        console.error(`Error al insertar lote ${i / batchSize + 1}:`, insertErr);
        return;
      }
    }

    console.log('¡Seeding de geografía completado con éxito!');

  } catch (error) {
    console.error('Error durante el seeding:', error);
  }
}

run();
