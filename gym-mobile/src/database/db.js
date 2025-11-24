// src/database/db.js

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'gimnasio.db';
let db = null;

export const initDatabase = async () => {
  try {
    // Si ya existe una instancia, la cerramos primero
    if (db) {
      try {
        await db.closeAsync();
      } catch (closeError) {
        console.warn('Advertencia cerrando BD anterior:', closeError);
      }
    }
    
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('✅ Database inicializada');
    
    await createTables();
    return db;
  } catch (error) {
    console.error('❌ Error inicializando BD:', error);
    throw error;
  }
};

export const getDatabase = async () => {
  if (!db) {
    console.log('🔄 Base de datos no inicializada, reinicializando...');
    await initDatabase();
  }
  
  // Verificar que la conexión siga activa
  try {
    await db.getFirstAsync('SELECT 1');
    return db;
  } catch (error) {
    console.log('🔄 Conexión perdida, reinicializando BD...');
    await initDatabase();
    return db;
  }
};

// Función síncrona para compatibilidad (solo si la BD ya está inicializada)
export const getDatabaseSync = () => {
  if (!db) {
    throw new Error('Database no inicializada. Usar getDatabase() o initDatabase() primero.');
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
        email TEXT NOT NULL,
        documento TEXT NOT NULL,
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

    // Crear índices únicos que solo aplican a clientes activos
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_documento_activo 
      ON clientes (documento) WHERE activo = 1;
    `);

    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_email_activo 
      ON clientes (email) WHERE activo = 1;
    `);

    // Tabla de Rutinas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS rutinas (
        id TEXT PRIMARY KEY,
        clienteId TEXT, -- Permitir NULL para plantillas
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

    // Tabla de Biblioteca de Ejercicios (ejercicios predefinidos)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS biblioteca_ejercicios (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        grupoMuscular TEXT NOT NULL,
        equipamiento TEXT,
        dificultad TEXT DEFAULT 'intermedio',
        videoUrl TEXT,
        imagenUrl TEXT,
        instrucciones TEXT,
        seriesSugeridas INTEGER DEFAULT 3,
        repeticionesSugeridas TEXT DEFAULT '10-12',
        descansoSugerido TEXT DEFAULT '60 seg',
        notas TEXT,
        favorito INTEGER DEFAULT 0,
        usosCount INTEGER DEFAULT 0,
        activo INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Índices para búsqueda rápida
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_biblioteca_grupo 
      ON biblioteca_ejercicios(grupoMuscular) WHERE activo = 1;
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_biblioteca_favoritos 
      ON biblioteca_ejercicios(favorito) WHERE activo = 1 AND favorito = 1;
    `);

    console.log('✅ Tabla biblioteca_ejercicios creada');
    console.log('✅ Todas las tablas creadas');
    
    // Ejecutar migraciones
    await runMigrations();
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    // Migración 1: Permitir clienteId NULL en rutinas para plantillas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS rutinas_new (
        id TEXT PRIMARY KEY,
        clienteId TEXT, -- Permitir NULL para plantillas
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

    // Copiar datos existentes de rutinas
    await db.execAsync(`
      INSERT OR IGNORE INTO rutinas_new 
      SELECT * FROM rutinas;
    `);

    // Reemplazar tabla rutinas
    await db.execAsync(`DROP TABLE IF EXISTS rutinas_old;`);
    await db.execAsync(`ALTER TABLE rutinas RENAME TO rutinas_old;`);
    await db.execAsync(`ALTER TABLE rutinas_new RENAME TO rutinas;`);
    await db.execAsync(`DROP TABLE IF EXISTS rutinas_old;`);

    // Migración 2: Remover restricción UNIQUE de documento en clientes 
    // (Para permitir soft delete y reutilizar DNIs)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS clientes_new (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        email TEXT NOT NULL,
        documento TEXT NOT NULL,
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

    // Crear índice compuesto para garantizar unicidad solo en clientes activos
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_documento_activo 
      ON clientes_new (documento) WHERE activo = 1;
    `);

    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_email_activo 
      ON clientes_new (email) WHERE activo = 1;
    `);

    // Copiar datos existentes de clientes
    await db.execAsync(`
      INSERT OR IGNORE INTO clientes_new 
      SELECT * FROM clientes;
    `);

    // Reemplazar tabla clientes
    await db.execAsync(`DROP TABLE IF EXISTS clientes_old;`);
    await db.execAsync(`ALTER TABLE clientes RENAME TO clientes_old;`);
    await db.execAsync(`ALTER TABLE clientes_new RENAME TO clientes;`);
    await db.execAsync(`DROP TABLE IF EXISTS clientes_old;`);

    console.log('✅ Migraciones completadas');
  } catch (error) {
    console.log('ℹ️ Migraciones omitidas (tabla ya actualizada):', error.message);
  }
};

export const closeDatabase = async () => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('✅ Database cerrada');
  }
};