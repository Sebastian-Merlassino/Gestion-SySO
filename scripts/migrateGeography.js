const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Firebase Configuration from environment
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Check if projectId is available
if (!firebaseConfig.projectId || firebaseConfig.projectId.includes('REPLACE')) {
  console.error("Error: Por favor, configura las variables de entorno de Firebase en el archivo .env antes de correr la migración.");
  process.exit(1);
}

// Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const runMigration = async () => {
  console.log("Iniciando migración de datos geográficos a Firestore...");

  const jsonPath = path.join(__dirname, '../src/data/localidades_agrupado.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: No se encontró el archivo JSON en la ruta: ${jsonPath}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const geodata = JSON.parse(rawData);

    console.log(`Se cargaron ${geodata.length} provincias del archivo JSON.`);

    for (const item of geodata) {
      const provinciaName = item.provincia.trim().toUpperCase();
      console.log(`Subiendo provincia: ${provinciaName}...`);

      // Document reference in the 'geografia' collection, using the province name as document ID
      const docRef = doc(db, 'geografia', provinciaName);
      
      // Store departments and their localities inside the province document
      await setDoc(docRef, {
        provincia: provinciaName,
        departamentos: item.departamentos,
        updatedAt: new Date().toISOString()
      });

      console.log(`Provincia ${provinciaName} migrada correctamente.`);
    }

    console.log("¡Migración completada con éxito!");
    process.exit(0);
  } catch (error) {
    console.error("Error durante la migración:", error);
    process.exit(1);
  }
};

runMigration();
