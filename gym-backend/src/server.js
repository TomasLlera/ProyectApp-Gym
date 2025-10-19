// src/server.js

const app = require('./app');
const connectDB = require('./config/database');
const { initCronJobs, stopCronJobs } = require('./jobs/cronJobs');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('🔄 Iniciando servidor...');
    
    // Conectar a MongoDB
    await connectDB();
    console.log('✅ Base de datos conectada');

    // Inicializar Google Calendar
    try {
      const googleCalendarService = require('./service/googleCalendarService');
      await googleCalendarService.authorize();
      console.log('✅ Google Calendar inicializado');
    } catch (error) {
      console.log('⚠️  Google Calendar no configurado:', error.message);
    }

    // Iniciar servidor Express
    const server = app.listen(PORT, () => {
      console.log('🚀 Servidor iniciado exitosamente');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      
      console.log('\n📋 Endpoints disponibles:');
      console.log(`   GET  http://localhost:${PORT}/api/hello`);
      console.log('\n✨ ¡Todo listo para desarrollar!');
    });

    // ============================================
    // INICIALIZAR CRON JOBS
    // ============================================
    initCronJobs();

    // Manejo elegante de cierre
    const gracefulShutdown = (signal) => {
      console.log(`\n⚠️  Cerrando servidor (${signal})...`);
      
      // Detener cron jobs
      stopCronJobs();
      
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

startServer();