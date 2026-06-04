const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI no está definida en las variables de entorno (.env)');
  process.exit(1);
}

const run = async () => {
  try {
    console.log('Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Conectado exitosamente.');

    // Definición de esquema para la colección 'geografia'
    const GeografiaSchema = new mongoose.Schema({
      provincia: { type: String, required: true, unique: true },
      departamentos: [
        {
          departamento_partido: { type: String, required: true },
          localidades_barrios: [String]
        }
      ]
    }, { collection: 'geografia', timestamps: true });

    const Geografia = mongoose.models.Geografia || mongoose.model('Geografia', GeografiaSchema);

    // Ruta del JSON
    const jsonPath = path.join(__dirname, '../data/localidades_agrupado.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`No se encontró el archivo JSON de localidades en la ruta: ${jsonPath}`);
    }

    console.log('Leyendo archivo localidades_agrupado.json...');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    console.log(`Se cargaron ${data.length} provincias del archivo JSON.`);

    // Preparar operaciones Bulk Write para asegurar idempotencia
    const bulkOps = data.map(item => {
      const provinciaName = item.provincia.trim().toUpperCase();
      return {
        updateOne: {
          filter: { provincia: provinciaName },
          update: {
            $set: {
              provincia: provinciaName,
              departamentos: item.departamentos
            }
          },
          upsert: true
        }
      };
    });

    console.log('Ejecutando operaciones Bulk Update (idempotentes)...');
    const result = await Geografia.bulkWrite(bulkOps);
    
    console.log('¡Migración de geografía completada!');
    console.log(`- Coincidieron (Matched): ${result.matchedCount}`);
    console.log(`- Modificados (Modified): ${result.modifiedCount}`);
    console.log(`- Insertados (Upserted): ${result.upsertedCount}`);

  } catch (error) {
    console.error('Error durante la migración de geografía:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada.');
    process.exit(0);
  }
};

run();
