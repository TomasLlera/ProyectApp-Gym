// src/server.js
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    console.log('🔄 Iniciando servidor...');
    
    // Conectar a MongoDB Atlas
    await connectDB();
    console.log('✅ Base de datos conectada');

    // Iniciar servidor Express
    const server = app.listen(PORT, () => {
      console.log('🚀 Servidor iniciado exitosamente');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      
      console.log('\n📋 Endpoints disponibles:');
      console.log(`   GET  http://localhost:${PORT}/api/hello`);
      console.log('\n✨ ¡Todo listo para desarrollar!');
    });

    // Manejo elegante de cierre
    const gracefulShutdown = (signal) => {
      console.log(`\n⚠️  Cerrando servidor (${signal})...`);
      server.close(() => {
        console.log('👋 Servidor cerrado exitosamente');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error.message);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();
