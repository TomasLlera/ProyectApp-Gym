// src/database/db.js

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'gimnasio.db';
let db = null;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('✅ Database inicializada');
    
    await createTables();
    return db;
  } catch (error) {
    console.error('❌ Error inicializando BD:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database no inicializada. Llamar initDatabase() primero.');
  }
  return db;
};

const createTables = async () => {
  try {
    // Tabla de Clientes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS clientes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        documento TEXT UNIQUE NOT NULL,
        telefono TEXT,
        tipoPlan TEXT DEFAULT 'mensual',
        montoMensual REAL NOT NULL,
        fechaVencimiento TEXT,
        estadoPago TEXT DEFAULT 'pendiente',
        fechaUltimoPago TEXT,
        fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP,
        activo INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de Rutinas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS rutinas (
        id TEXT PRIMARY KEY,
        clienteId TEXT NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        tipo TEXT DEFAULT 'personalizado',
        nivel TEXT DEFAULT 'principiante',
        duracionEstimada INTEGER DEFAULT 60,
        activa INTEGER DEFAULT 1,
        fechaInicio TEXT DEFAULT CURRENT_TIMESTAMP,
        notas TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(clienteId) REFERENCES clientes(id)
      );
    `);

    // Tabla de Días de Rutina (muchos a muchos)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS rutina_dias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rutinaId TEXT NOT NULL,
        dia TEXT NOT NULL,
        FOREIGN KEY(rutinaId) REFERENCES rutinas(id) ON DELETE CASCADE
      );
    `);

    // Tabla de Ejercicios
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ejercicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rutinaId TEXT NOT NULL,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        series INTEGER,
        repeticiones TEXT,
        peso TEXT,
        descanso TEXT,
        grupoMuscular TEXT,
        videoUrl TEXT,
        notas TEXT,
        orden INTEGER DEFAULT 0,
        FOREIGN KEY(rutinaId) REFERENCES rutinas(id) ON DELETE CASCADE
      );
    `);

    // Tabla de Pagos
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pagos (
        id TEXT PRIMARY KEY,
        clienteId TEXT NOT NULL,
        monto REAL NOT NULL,
        fecha TEXT DEFAULT CURRENT_TIMESTAMP,
        metodoPago TEXT DEFAULT 'efectivo',
        estado TEXT DEFAULT 'confirmado',
        notas TEXT,
        mes INTEGER,
        año INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(clienteId) REFERENCES clientes(id)
      );
    `);

    // Tabla de Grupos
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grupos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de Clientes en Grupos (muchos a muchos)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS grupo_clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupoId TEXT NOT NULL,
        clienteId TEXT NOT NULL,
        FOREIGN KEY(grupoId) REFERENCES grupos(id) ON DELETE CASCADE,
        FOREIGN KEY(clienteId) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `);

    // Tabla de Sincronización (para trackear cambios)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tabla TEXT NOT NULL,
        registroId TEXT NOT NULL,
        operacion TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        sincronizado INTEGER DEFAULT 0
      );
    `);

    console.log('✅ Todas las tablas creadas');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
};

export const closeDatabase = async () => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('✅ Database cerrada');
  }
};