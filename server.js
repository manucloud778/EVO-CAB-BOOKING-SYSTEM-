// ============================================================
//  SCHEDULED CAB BOOKING SYSTEM — server.js
//  Auth uses Node built-in crypto — NO bcryptjs/jsonwebtoken
//  Run: npm install  →  npm start
// ============================================================

const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const crypto  = require('crypto');   // built-in, no install needed
const path    = require('path');

const app  = express();
const PORT = 3000;

const SECRET       = 'cabgo_customer_secret_2024';
const ADMIN_SECRET = 'cabgo_admin_secret_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host:'localhost', user:'root', password:'2004', database:'cab_booking_db',
  waitForConnections:true, connectionLimit:10,
});

// ── Crypto helpers (Node built-in only) ──────────────────
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function signToken(payload, secret, expiresInSeconds) {
  const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const exp    = Math.floor(Date.now()/1000) + expiresInSeconds;
  const body   = Buffer.from(JSON.stringify({...payload,exp})).toString('base64url');
  const sig    = crypto.createHmac('sha256',secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token, secret) {
  const parts = (token||'').split('.');
  if (parts.length!==3) throw new Error('Malformed token');
  const [header,body,sig] = parts;
  const expected = crypto.createHmac('sha256',secret).update(`${header}.${body}`).digest('base64url');
  if (sig!==expected) throw new Error('Invalid token');
  const payload = JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
  if (payload.exp < Math.floor(Date.now()/1000)) throw new Error('Token expired');
  return payload;
}

// ── Helpers ───────────────────────────────────────────────
const ok  = (res,data)      => res.status(200).json({success:true,data});
const err = (res,msg,c=400) => res.status(c).json({success:false,message:msg});

function authCustomer(req,res,next) {
  const token = (req.headers.authorization||'').replace('Bearer ','').trim();
  if (!token) return err(res,'Not authenticated. Please log in.',401);
  try { req.user = verifyToken(token,SECRET); next(); }
  catch { err(res,'Invalid or expired session.',401); }
}

function authAdmin(req,res,next) {
  const token = (req.headers.authorization||'').replace('Bearer ','').trim();
  if (!token) return err(res,'Admin access required.',401);
  try { req.admin = verifyToken(token,ADMIN_SECRET); next(); }
  catch { err(res,'Invalid or expired admin session.',401); }
}

// ============================================================
//  AUTH — CUSTOMER
// ============================================================

app.post('/api/auth/register', async (req,res) => {
  const {first_name,middle_name,last_name,email,password,city,state,pincode,phones} = req.body;
  if (!first_name||!last_name||!email||!password||!city||!state||!pincode)
    return err(res,'All required fields must be filled.');
  if (password.length<6) return err(res,'Password must be at least 6 characters.');
  const conn = await pool.getConnection();
  try {
    const [[existing]] = await conn.query('SELECT customer_id FROM customer WHERE email=?',[email]);
    if (existing) return err(res,'Email already registered. Please log in.');
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO customer (first_name,middle_name,last_name,email,password_hash,city,state,pincode) VALUES (?,?,?,?,?,?,?,?)`,
      [first_name,middle_name||null,last_name,email,hashPassword(password),city,state,pincode]
    );
    const customer_id = r.insertId;
    if (phones?.length)
      await conn.query(`INSERT INTO customer_phone (customer_id,phone_number) VALUES ?`,[phones.map(p=>[customer_id,p])]);
    await conn.commit();
    const name  = `${first_name} ${last_name}`;
    const token = signToken({customer_id,email,name},SECRET,7*24*3600);
    ok(res,{customer_id,name,email,token});
  } catch(e) { await conn.rollback(); err(res,e.message); }
  finally { conn.release(); }
});

app.post('/api/auth/login', async (req,res) => {
  const {email,password} = req.body;
  if (!email||!password) return err(res,'Email and password are required.');
  const [[customer]] = await pool.query('SELECT * FROM customer WHERE email=?',[email]);
  if (!customer||hashPassword(password)!==customer.password_hash)
    return err(res,'Invalid email or password.');
  const name  = `${customer.first_name} ${customer.last_name}`;
  const token = signToken({customer_id:customer.customer_id,email:customer.email,name},SECRET,7*24*3600);
  ok(res,{customer_id:customer.customer_id,name,email:customer.email,token});
});

app.get('/api/auth/me', authCustomer, (req,res) => ok(res,req.user));

// ============================================================
//  AUTH — ADMIN
// ============================================================

app.post('/api/admin/login', async (req,res) => {
  const {username,password} = req.body;
  if (!username||!password) return err(res,'Username and password required.');
  const [[admin]] = await pool.query('SELECT * FROM admin WHERE username=?',[username]);
  if (!admin||hashPassword(password)!==admin.password_hash)
    return err(res,'Invalid credentials.');
  const token = signToken({admin_id:admin.admin_id,username:admin.username},ADMIN_SECRET,8*3600);
  ok(res,{admin_id:admin.admin_id,username:admin.username,token});
});

app.get('/api/admin/me', authAdmin, (req,res) => ok(res,req.admin));

// ============================================================
//  CUSTOMERS
// ============================================================

app.get('/api/customers', authAdmin, async (_req,res) => {
  const [rows] = await pool.query(
    `SELECT c.customer_id,c.first_name,c.last_name,c.email,c.city,
            GROUP_CONCAT(cp.phone_number) AS phones
     FROM customer c LEFT JOIN customer_phone cp USING(customer_id) GROUP BY c.customer_id`
  );
  ok(res,rows);
});

app.get('/api/customers/:id', authCustomer, async (req,res) => {
  if (req.user.customer_id!=req.params.id) return err(res,'Forbidden.',403);
  const [rows] = await pool.query(
    `SELECT c.*,GROUP_CONCAT(cp.phone_number) AS phones
     FROM customer c LEFT JOIN customer_phone cp USING(customer_id)
     WHERE c.customer_id=? GROUP BY c.customer_id`,[req.params.id]
  );
  if (!rows.length) return err(res,'Not found.',404);
  ok(res,rows[0]);
});

// ============================================================
//  DRIVERS
// ============================================================

app.post('/api/drivers', authAdmin, async (req,res) => {
  const {first_name,middle_name,last_name,license,phones} = req.body;
  if (!first_name||!last_name||!license) return err(res,'Missing driver fields.');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO driver (first_name,middle_name,last_name,license) VALUES (?,?,?,?)`,
      [first_name,middle_name||null,last_name,license]
    );
    const driver_id = r.insertId;
    if (phones?.length)
      await conn.query(`INSERT INTO driver_phone (driver_id,phone_number) VALUES ?`,[phones.map(p=>[driver_id,p])]);
    await conn.commit();
    ok(res,{driver_id});
  } catch(e) { await conn.rollback(); err(res,e.message); }
  finally { conn.release(); }
});

app.get('/api/drivers', async (_req,res) => {
  const [rows] = await pool.query(
    `SELECT d.*,GROUP_CONCAT(dp.phone_number) AS phones
     FROM driver d LEFT JOIN driver_phone dp USING(driver_id) GROUP BY d.driver_id`
  );
  ok(res,rows);
});

// ============================================================
//  CABS
// ============================================================

app.post('/api/cabs', authAdmin, async (req,res) => {
  const {type,model,state_code,district_code,unique_number} = req.body;
  if (!type||!model||!state_code||!district_code||!unique_number) return err(res,'Missing cab fields.');
  const [r] = await pool.query(
    `INSERT INTO cab (type,model,state_code,district_code,unique_number) VALUES (?,?,?,?,?)`,
    [type,model,state_code,district_code,unique_number]
  );
  ok(res,{cab_id:r.insertId});
});

app.get('/api/cabs', async (_req,res) => {
  const [rows] = await pool.query('SELECT * FROM cab');
  ok(res,rows);
});

// ============================================================
//  LOCATIONS
// ============================================================

app.post('/api/locations', authCustomer, async (req,res) => {
  const {pickup_street,pickup_city,pickup_pincode,drop_street,drop_city,drop_pincode} = req.body;
  if (!pickup_street||!pickup_city||!pickup_pincode||!drop_street||!drop_city||!drop_pincode)
    return err(res,'Missing location fields.');
  const [r] = await pool.query(
    `INSERT INTO location (pickup_street,pickup_city,pickup_pincode,drop_street,drop_city,drop_pincode) VALUES (?,?,?,?,?,?)`,
    [pickup_street,pickup_city,pickup_pincode,drop_street,drop_city,drop_pincode]
  );
  ok(res,{location_id:r.insertId});
});

// ============================================================
//  BOOKINGS
// ============================================================

app.post('/api/book', authCustomer, async (req,res) => {
  const {driver_id,cab_id,location_id,date,time} = req.body;
  const customer_id = req.user.customer_id;
  if (!driver_id||!cab_id||!location_id||!date||!time) return err(res,'Missing booking fields.');
  const [[drv]] = await pool.query('SELECT driver_id FROM driver WHERE driver_id=?',[driver_id]);
  if (!drv) return err(res,'Driver not found.',404);
  const [[cab]] = await pool.query('SELECT cab_id FROM cab WHERE cab_id=?',[cab_id]);
  if (!cab) return err(res,'Cab not found.',404);
  const [[loc]] = await pool.query('SELECT location_id FROM location WHERE location_id=?',[location_id]);
  if (!loc) return err(res,'Location not found.',404);
  const [r] = await pool.query(
    `INSERT INTO booking (date,time,status,customer_id,driver_id,cab_id,location_id) VALUES (?,?,'Pending',?,?,?,?)`,
    [date,time,customer_id,driver_id,cab_id,location_id]
  );
  ok(res,{booking_id:r.insertId,status:'Pending'});
});

app.get('/api/booking/:id', authCustomer, async (req,res) => {
  const [rows] = await pool.query(
    `SELECT b.*,
            CONCAT(c.first_name,' ',c.last_name) AS customer_name,
            CONCAT(d.first_name,' ',d.last_name) AS driver_name,
            cb.type AS cab_type,cb.model,
            CONCAT(cb.state_code,cb.district_code,cb.unique_number) AS plate,
            l.pickup_street,l.pickup_city,l.pickup_pincode,
            l.drop_street,l.drop_city,l.drop_pincode
     FROM booking b
     JOIN customer c USING(customer_id) JOIN driver d USING(driver_id)
     JOIN cab cb USING(cab_id) JOIN location l USING(location_id)
     WHERE b.booking_id=?`,[req.params.id]
  );
  if (!rows.length) return err(res,'Booking not found.',404);
  if (rows[0].customer_id!==req.user.customer_id) return err(res,'Forbidden.',403);
  ok(res,rows[0]);
});

app.get('/api/bookings/customer/:id', authCustomer, async (req,res) => {
  if (req.user.customer_id!=req.params.id) return err(res,'Forbidden.',403);
  const [rows] = await pool.query(
    `SELECT b.booking_id,b.date,b.time,b.status,l.pickup_city,l.drop_city,
            CONCAT(d.first_name,' ',d.last_name) AS driver_name,cb.type AS cab_type,cb.model
     FROM booking b JOIN location l USING(location_id) JOIN driver d USING(driver_id) JOIN cab cb USING(cab_id)
     WHERE b.customer_id=? ORDER BY b.date DESC,b.time DESC`,[req.params.id]
  );
  ok(res,rows);
});

app.get('/api/bookings', authAdmin, async (_req,res) => {
  const [rows] = await pool.query(
    `SELECT b.booking_id,b.date,b.time,b.status,
            CONCAT(c.first_name,' ',c.last_name) AS customer_name,
            CONCAT(d.first_name,' ',d.last_name) AS driver_name,
            cb.type AS cab_type,l.pickup_city,l.drop_city
     FROM booking b JOIN customer c USING(customer_id) JOIN driver d USING(driver_id)
     JOIN cab cb USING(cab_id) JOIN location l USING(location_id)
     ORDER BY b.date DESC,b.time DESC`
  );
  ok(res,rows);
});

app.put('/api/booking/status', authCustomer, async (req,res) => {
  const {booking_id,status} = req.body;
  const allowed = ['Pending','Arrived','Completed','Cancelled'];
  if (!booking_id||!allowed.includes(status)) return err(res,`status must be one of: ${allowed.join(', ')}`);
  const [[booking]] = await pool.query('SELECT * FROM booking WHERE booking_id=?',[booking_id]);
  if (!booking) return err(res,'Booking not found.',404);
  if (booking.customer_id!==req.user.customer_id) return err(res,'Forbidden.',403);
  const transitions = {Pending:['Arrived','Cancelled'],Arrived:['Completed','Cancelled'],Completed:[],Cancelled:[]};
  if (!transitions[booking.status].includes(status))
    return err(res,`Cannot move from '${booking.status}' to '${status}'.`);
  await pool.query('UPDATE booking SET status=? WHERE booking_id=?',[status,booking_id]);
  ok(res,{booking_id,previous:booking.status,current:status});
});

// ============================================================
//  PAYMENTS
// ============================================================

app.post('/api/payment', authCustomer, async (req,res) => {
  const {booking_id,payment_method,amount} = req.body;
  if (!booking_id||!payment_method||!amount) return err(res,'Missing payment fields.');
  const [[booking]] = await pool.query('SELECT * FROM booking WHERE booking_id=?',[booking_id]);
  if (!booking) return err(res,'Booking not found.',404);
  if (booking.customer_id!==req.user.customer_id) return err(res,'Forbidden.',403);
  if (booking.status!=='Completed') return err(res,'Payment only allowed after trip is Completed.');
  const [[existing]] = await pool.query('SELECT payment_id FROM payment WHERE booking_id=?',[booking_id]);
  if (existing) return err(res,'Payment already recorded for this booking.');
  const [r] = await pool.query(
    `INSERT INTO payment (payment_method,amount,payment_status,booking_id) VALUES (?,?,?,?)`,
    [payment_method,amount,'Pending',booking_id]
  );
  ok(res,{payment_id:r.insertId});
});

app.put('/api/payment/confirm', authCustomer, async (req,res) => {
  const {payment_id} = req.body;
  if (!payment_id) return err(res,'payment_id required.');
  const [[pay]] = await pool.query('SELECT * FROM payment WHERE payment_id=?',[payment_id]);
  if (!pay) return err(res,'Payment not found.',404);
  if (pay.payment_status==='Paid') return err(res,'Already Paid.');
  await pool.query('UPDATE payment SET payment_status=? WHERE payment_id=?',['Paid',payment_id]);
  ok(res,{payment_id,payment_status:'Paid'});
});

app.get('/api/payment/:booking_id', authCustomer, async (req,res) => {
  const [rows] = await pool.query('SELECT * FROM payment WHERE booking_id=?',[req.params.booking_id]);
  if (!rows.length) return err(res,'Payment not found.',404);
  ok(res,rows[0]);
});

// ============================================================
//  FARE ESTIMATE  (public)
// ============================================================
app.get('/api/fare-estimate', (req,res) => {
  const rates = {Mini:{base:30,perKm:8},Sedan:{base:50,perKm:12},SUV:{base:80,perKm:18}};
  const km   = parseFloat(req.query.distance_km);
  if (isNaN(km)||km<=0) return err(res,'Provide a valid distance_km.');
  const rate = rates[req.query.cab_type];
  if (!rate) return err(res,'cab_type must be Mini, Sedan, or SUV.');
  ok(res,{cab_type:req.query.cab_type,distance_km:km,fare:(rate.base+km*rate.perKm).toFixed(2),eta_minutes:Math.ceil((km/40)*60)});
});

app.listen(PORT, () => console.log(`\n🚕  CabGo →  http://localhost:${PORT}\n`));
