require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

const pool = new Pool(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'garrafaya',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    });

(async () => {
  try {
    const schema = await fs.readFile(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Esquema de base de datos aplicado.');
  } catch (error) {
    console.error('No se pudo aplicar el esquema de base de datos:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
