// Agregar este endpoint al archivo calendar.js existente

// ============================================
// Subir rutina con DATOS COMPLETOS (para SQLite frontend)
// ============================================
router.post('/subir-rutina-completa', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, nivel, duracionEstimada, diasSemana, ejercicios, cliente } = req.body;

    console.log('📤 Recibiendo rutina completa desde frontend SQLite:', nombre);

    // Validar datos básicos
    if (!nombre || !cliente || !cliente.nombre) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos obligatorios: nombre y cliente'
      });
    }

    if (!diasSemana || diasSemana.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La rutina debe tener al menos un día asignado'
      });
    }

    // Crear objeto rutina temporal para Google Calendar
    const rutinaParaCalendar = {
      nombre: nombre,
      descripcion: descripcion || '',
      tipo: tipo || 'personalizada',
      nivel: nivel || 'principiante', 
      duracionEstimada: duracionEstimada || 60,
      diasSemana: diasSemana,
      ejercicios: ejercicios || []
    };

    // Crear objeto cliente temporal
    const clienteParaCalendar = {
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || ''
    };

    console.log('🔄 Procesando rutina para Google Calendar...');

    // Subir directamente a Google Calendar usando el servicio
    const resultado = await googleCalendarService.subirRutina(
      clienteParaCalendar,
      rutinaParaCalendar
    );

    console.log('✅ Rutina subida exitosamente a Google Calendar');

    res.json({
      success: true,
      message: `✅ ${resultado.eventosCreados} eventos creados en Google Calendar`,
      data: {
        rutina: nombre,
        cliente: cliente.nombre,
        eventosCreados: resultado.eventosCreados,
        diasProgramados: diasSemana
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo rutina completa:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});