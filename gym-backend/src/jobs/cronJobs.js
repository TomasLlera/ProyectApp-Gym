// src/jobs/cronJobs.js

const cron = require('node-cron');
const notificationService = require('../service/notificationService');

let jobs = [];

/**
 * Inicializar todos los cron jobs
 * Se ejecuta automáticamente cuando inicia el servidor
 */
const initCronJobs = () => {
  console.log('\n🚀 Inicializando tareas programadas...\n');

  // ============================================
  // 1. RECORDATORIO DIARIO A LAS 7:00 AM
  // ============================================
  const dailyReminder = cron.schedule('0 7 * * *', async () => {
    console.log('\n🔔 [CRON] Ejecutando recordatorio diario...');
    try {
      const resultado = await notificationService.recordatorioDiario();
      console.log(`✅ Recordatorio completado: ${resultado.enviados} enviados`);
    } catch (error) {
      console.error('❌ Error en recordatorio diario:', error.message);
    }
  });
  jobs.push(dailyReminder);
  console.log('✅ Recordatorio diario configurado para las 7:00 AM');

  // ============================================
  // 2. VERIFICAR PAGOS VENCIDOS (Diariamente 8:00 AM)
  // ============================================
  const checkPayments = cron.schedule('0 8 * * *', async () => {
    console.log('\n💳 [CRON] Verificando pagos vencidos...');
    try {
      const Client = require('../models/client');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const clientes = await Client.find({ activo: true });
      let vencidosEncontrados = 0;

      for (const cliente of clientes) {
        const estadoAnterior = cliente.estadoPago;
        cliente.actualizarEstadoPago();
        
        if (cliente.estadoPago === 'vencido' && estadoAnterior !== 'vencido') {
          console.log(`⚠️ ${cliente.nombre} ahora está vencido`);
          vencidosEncontrados++;
        }
        
        await cliente.save();
      }

      console.log(`✅ Verificación completada: ${vencidosEncontrados} nuevos vencidos`);
    } catch (error) {
      console.error('❌ Error verificando pagos:', error.message);
    }
  });
  jobs.push(checkPayments);
  console.log('✅ Verificación de pagos configurada para las 8:00 AM');

  // ============================================
  // 3. RECORDATORIO DE PAGO 3 DÍAS ANTES (9:00 AM)
  // ============================================
  const paymentReminder = cron.schedule('0 9 * * *', async () => {
    console.log('\n💰 [CRON] Enviando recordatorios de pago...');
    try {
      const Client = require('../models/client');
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const fechaLimite = new Date(hoy);
      fechaLimite.setDate(fechaLimite.getDate() + 3);

      const clientesPorVencer = await Client.find({
        activo: true,
        estadoPago: 'pagado',
        fechaVencimiento: {
          $gte: hoy,
          $lte: fechaLimite
        },
        telefono: { $exists: true, $ne: '' }
      });

      let recordatoriosEnviados = 0;

      for (const cliente of clientesPorVencer) {
        const diasRestantes = Math.ceil(
          (new Date(cliente.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24)
        );

        try {
          await notificationService.notificarVencimiento(cliente, diasRestantes);
          recordatoriosEnviados++;
        } catch (error) {
          console.error(`❌ Error con ${cliente.nombre}:`, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`✅ Recordatorios de pago enviados: ${recordatoriosEnviados}`);
    } catch (error) {
      console.error('❌ Error enviando recordatorios:', error.message);
    }
  });
  jobs.push(paymentReminder);
  console.log('✅ Recordatorio de pago configurado para las 9:00 AM');

  // ============================================
  // 4. REPORTE DIARIO (5:00 PM - Opcional)
  // ============================================
  const dailyReport = cron.schedule('0 17 * * *', async () => {
    console.log('\n📊 [CRON] Generando reporte diario...');
    try {
      const Client = require('../models/client');
      const Payment = require('../models/payment');

      const totalClientes = await Client.countDocuments({ activo: true });
      const clientesPagados = await Client.countDocuments({ 
        activo: true, 
        estadoPago: 'pagado' 
      });
      const clientesVencidos = await Client.countDocuments({ 
        activo: true, 
        estadoPago: 'vencido' 
      });

      const hoy = new Date();
      const ingresoHoy = await Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(hoy.setHours(0, 0, 0, 0)),
              $lt: new Date(hoy.setHours(23, 59, 59, 999))
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$monto' }
          }
        }
      ]);

      console.log('\n📈 REPORTE DEL DÍA:');
      console.log(`  👥 Total clientes: ${totalClientes}`);
      console.log(`  ✅ Clientes pagados: ${clientesPagados}`);
      console.log(`  ⚠️ Clientes vencidos: ${clientesVencidos}`);
      console.log(`  💰 Ingresos hoy: $${ingresoHoy[0]?.total || 0}`);
      console.log('');
    } catch (error) {
      console.error('❌ Error generando reporte:', error.message);
    }
  });
  jobs.push(dailyReport);
  console.log('✅ Reporte diario configurado para las 5:00 PM');

  console.log('\n✨ Todas las tareas programadas iniciadas correctamente\n');
};

/**
 * Detener todos los cron jobs
 * Se ejecuta cuando el servidor se cierra
 */
const stopCronJobs = () => {
  console.log('\n⛔ Deteniendo tareas programadas...');
  jobs.forEach(job => job.stop());
  jobs = [];
  console.log('✅ Todas las tareas han sido detenidas\n');
};

module.exports = {
  initCronJobs,
  stopCronJobs
};