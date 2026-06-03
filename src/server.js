const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { app: firebaseApp } = require('./config/firebaseConfig'); // Triggers Firebase initialization

const app = express();

// Connect to MongoDB
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Status route
app.get('/status', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    firebaseProject: process.env.FIREBASE_PROJECT_ID,
    port: process.env.PORT || 5000
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Ocurrió un error interno en el servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor de Gestión SySO corriendo en el puerto ${PORT}`);
});
