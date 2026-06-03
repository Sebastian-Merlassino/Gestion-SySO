const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Client Configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase Client SDK (useful for client/hybrid calls and testing)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Admin SDK
// This uses application default credentials or project ID for local emulator or GCP environment
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    console.log("Firebase Admin SDK inicializado correctamente.");
  } catch (error) {
    console.error("Error al inicializar Firebase Admin SDK:", error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

module.exports = {
  // Client SDK Exports
  app,
  auth,
  db,
  // Admin SDK Exports
  admin,
  adminDb,
  adminAuth
};
