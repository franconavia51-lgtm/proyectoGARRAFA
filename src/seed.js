require('dotenv').config();
const bcrypt=require('bcryptjs');
const {Pool}=require('pg');
const pool=new Pool(process.env.DATABASE_URL
 ? {connectionString:process.env.DATABASE_URL}
 : {host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME||'garrafaya',user:process.env.DB_USER||'postgres',password:process.env.DB_PASSWORD});
(async()=>{
 let client;
 try{
  const adminPassword=process.env.ADMIN_PASSWORD||(process.env.NODE_ENV==='production'?null:'GarrafaYa2026!');
  if(!adminPassword) throw new Error('Define ADMIN_PASSWORD antes de crear el administrador en producción.');
  const hash=await bcrypt.hash(adminPassword,12);
  client=await pool.connect();
  await client.query('BEGIN');
  try{
   await client.query('SELECT pg_advisory_xact_lock($1)',[2026111701]);
   const initialized=await client.query("SELECT 1 FROM app_seed_state WHERE name='initial' FOR UPDATE");
   if(initialized.rowCount){
    await client.query('COMMIT');
    console.log('Datos iniciales ya creados.');
    return;
   }
  await client.query(`INSERT INTO roles(name,description) VALUES
   ('ADMIN','Administrador del sistema'),('OPERADOR','Operador logístico')
   ON CONFLICT(name) DO NOTHING`);
  await client.query(`INSERT INTO permissions(name,description) VALUES
   ('users.manage','Administrar usuarios'),('inventory.manage','Administrar inventario'),
   ('orders.manage','Administrar pedidos'),('routes.manage','Administrar rutas'),
   ('reports.view','Consultar reportes') ON CONFLICT(name) DO NOTHING`);
  const q=await client.query(`INSERT INTO users(username,email,password_hash)
   VALUES('admin','admin@garrafaya.bo',$1)
   ON CONFLICT(email) DO UPDATE SET username=EXCLUDED.username,password_hash=EXCLUDED.password_hash
   RETURNING id`,[hash]);
  const role=await client.query("SELECT id FROM roles WHERE name='ADMIN'");
  await client.query('INSERT INTO user_roles(user_id,role_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[q.rows[0].id,role.rows[0].id]);
  await client.query("INSERT INTO app_seed_state(name) VALUES('initial')");
  await client.query('COMMIT');
  console.log('Datos iniciales creados. Usuario: admin | correo: admin@garrafaya.bo');
  }catch(e){
   await client.query('ROLLBACK');
   throw e;
  }
 }catch(e){console.error(e);process.exitCode=1;}finally{if(client)client.release();await pool.end();}
})();
