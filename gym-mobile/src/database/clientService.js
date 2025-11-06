// src/database/clientService.js

import { getDatabase } from './db';

// Función simple para generar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// ========================================
// FUNCIONES DE VALIDACIÓN
// ========================================

// Validar formato de email
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validar formato de teléfono argentino
const validatePhoneFormat = (phone) => {
  if (!phone) return true; // Es opcional
  const phoneRegex = /^\+54\d{9,}$/;
  return phoneRegex.test(phone);
};

// Validar formato de DNI argentino
const validateDNIFormat = (dni) => {
  if (!dni) return false;
  const dniString = dni.toString().trim();
  
  // Debe ser exactamente 8 dígitos numéricos
  const dniRegex = /^\d{8}$/;
  if (!dniRegex.test(dniString)) {
    return false;
  }
  
  // Validaciones adicionales para DNI argentino
  const dniNumber = parseInt(dniString);
  
  // DNI debe estar en rango válido (aproximadamente 1.000.000 - 99.999.999)
  if (dniNumber < 1000000 || dniNumber > 99999999) {
    return false;
  }
  
  // No puede ser todos los mismos dígitos
  const allSameDigits = /^(\d)\1{7}$/.test(dniString);
  if (allSameDigits) {
    return false;
  }
  
  return true;
};

// Validar email único
const validateUniqueEmail = async (email, excludeId = null) => {
  const db = await getDatabase();
  let query = 'SELECT id FROM clientes WHERE LOWER(email) = LOWER(?) AND activo = 1';
  const params = [email.trim()];
  
  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  
  try {
    const existing = await db.getFirstAsync(query, params);
    return !existing; // true si es único
  } catch (error) {
    console.error('Error validando email:', error);
    return false;
  }
};

// Validar documento único
const validateUniqueDocumento = async (documento, excludeId = null) => {
  const db = await getDatabase();
  let query = 'SELECT id FROM clientes WHERE documento = ? AND activo = 1';
  const params = [documento.trim()];
  
  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  
  try {
    const existing = await db.getFirstAsync(query, params);
    return !existing;
  } catch (error) {
    console.error('Error validando documento:', error);
    return false;
  }
};

// Validar todos los datos del cliente
const validateClientData = async (clientData, isUpdate = false, clientId = null) => {
  const errors = [];
  
  // Campos obligatorios
  if (!clientData.nombre?.trim()) {
    errors.push('El nombre es obligatorio');
  } else if (clientData.nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }
  
  if (!clientData.apellido?.trim()) {
    errors.push('El apellido es obligatorio');
  } else if (clientData.apellido.trim().length < 2) {
    errors.push('El apellido debe tener al menos 2 caracteres');
  }
  
  if (!clientData.email?.trim()) {
    errors.push('El email es obligatorio');
  } else if (!validateEmailFormat(clientData.email)) {
    errors.push('Formato de email inválido');
  }
  
  if (!clientData.documento?.trim()) {
    errors.push('El documento es obligatorio');
  } else if (!validateDNIFormat(clientData.documento)) {
    const dniString = clientData.documento.toString().trim();
    if (!/^\d{8}$/.test(dniString)) {
      errors.push('El DNI debe tener exactamente 8 dígitos numéricos');
    } else if (parseInt(dniString) < 1000000) {
      errors.push('El DNI debe ser mayor a 1.000.000');
    } else if (parseInt(dniString) > 99999999) {
      errors.push('El DNI no puede ser mayor a 99.999.999');
    } else if (/^(\d)\1{7}$/.test(dniString)) {
      errors.push('El DNI no puede tener todos los dígitos iguales');
    } else {
      errors.push('Formato de DNI inválido');
    }
  }
  
  if (!clientData.montoMensual || clientData.montoMensual <= 0) {
    errors.push('El monto mensual debe ser mayor a 0');
  } else if (clientData.montoMensual > 1000000) {
    errors.push('El monto mensual no puede superar $1,000,000');
  }
  
  // Validar teléfono si existe
  if (clientData.telefono && !validatePhoneFormat(clientData.telefono)) {
    errors.push('Formato de teléfono inválido (debe ser +54 seguido de 9 dígitos)');
  }
  
  // Validar unicidad de email
  if (clientData.email) {
    const emailUnique = await validateUniqueEmail(
      clientData.email,
      isUpdate ? clientId : null
    );
    if (!emailUnique) {
      errors.push('Ya existe un cliente con este email');
    }
  }
  
  // Validar unicidad de documento
  if (clientData.documento) {
    const documentoUnique = await validateUniqueDocumento(
      clientData.documento,
      isUpdate ? clientId : null
    );
    if (!documentoUnique) {
      errors.push('Ya existe un cliente con este documento');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const clientService = {
  // Crear cliente
  create: async (clientData) => {
    const db = await getDatabase();
    const id = generateId();
    
    try {
      // ========================================
      // VALIDACIÓN PREVIA A LA INSERCIÓN
      // ========================================
      const validation = await validateClientData(clientData, false);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(', ');
        throw new Error(`Datos inválidos: ${errorMessage}`);
      }

      await db.runAsync(
        `INSERT INTO clientes (
          id, nombre, apellido, email, documento, 
          telefono, tipoPlan, montoMensual, estadoPago
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clientData.nombre.trim(),
          clientData.apellido.trim(),
          clientData.email.toLowerCase().trim(),
          clientData.documento.trim(),
          clientData.telefono || null,
          clientData.tipoPlan || 'mensual',
          parseFloat(clientData.montoMensual),
          'pendiente'
        ]
      );
      
      console.log(`✅ Cliente creado: ${clientData.nombre} (DNI: ${clientData.documento})`);
      return { ...clientData, id };
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      
      // Mejorar mensajes de error específicos de SQLite
      if (error.message.includes('UNIQUE constraint failed: clientes.email')) {
        throw new Error('Ya existe un cliente con ese email');
      } else if (error.message.includes('UNIQUE constraint failed: clientes.documento')) {
        throw new Error('Ya existe un cliente con ese DNI');
      }
      
      throw error;
    }
  },

  // Obtener todos los clientes
  getAll: async () => {
    const db = await getDatabase();
    try {
      const clientes = await db.getAllAsync('SELECT * FROM clientes WHERE activo = 1');
      return clientes;
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      throw error;
    }
  },

  // Obtener cliente por ID
  getById: async (id) => {
    const db = await getDatabase();
    try {
      const cliente = await db.getFirstAsync(
        'SELECT * FROM clientes WHERE id = ?',
        [id]
      );
      return cliente;
    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      throw error;
    }
  },

  // Actualizar cliente
  update: async (id, clientData) => {
    const db = await getDatabase();
    try {
      // Validar campos requeridos
      if (!clientData.nombre || !clientData.apellido || !clientData.email || !clientData.documento) {
        throw new Error('Campos requeridos faltantes: nombre, apellido, email, documento');
      }

      await db.runAsync(
        `UPDATE clientes SET 
          nombre = ?, apellido = ?, email = ?, 
          documento = ?, telefono = ?, 
          tipoPlan = ?, montoMensual = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          clientData.nombre.trim(),
          clientData.apellido.trim(),
          clientData.email.trim(),
          clientData.documento.trim(),
          clientData.telefono || null,
          clientData.tipoPlan || 'mensual',
          clientData.montoMensual || 0,
          id
        ]
      );
      console.log(`✅ Cliente actualizado: ${clientData.nombre}`);
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      throw error;
    }
  },

  // Eliminar cliente (soft delete)
  delete: async (id) => {
    const db = await getDatabase();
    try {
      await db.runAsync(
        'UPDATE clientes SET activo = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      console.log(`✅ Cliente eliminado: ${id}`);
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
      throw error;
    }
  },

  // Actualizar estado de pago
  updatePaymentStatus: async (id, estadoPago) => {
    const db = await getDatabase();
    try {
      await db.runAsync(
        `UPDATE clientes SET 
          estadoPago = ?, 
          fechaUltimoPago = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [estadoPago, id]
      );
      console.log(`✅ Estado de pago actualizado: ${estadoPago}`);
    } catch (error) {
      console.error('❌ Error actualizando pago:', error);
      throw error;
    }
  },

  // ========================================
  // FUNCIONES DE VALIDACIÓN PÚBLICAS
  // ========================================
  validateEmailFormat,
  validatePhoneFormat,
  validateDNIFormat,
  validateUniqueEmail,
  validateUniqueDocumento,
  validateClientData
};