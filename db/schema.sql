-- ============================================================
--  SCHEDULED CAB BOOKING SYSTEM — schema.sql
--  Passwords hashed with SHA-256 (Node crypto built-in)
-- ============================================================

CREATE DATABASE IF NOT EXISTS cab_booking_db;
USE cab_booking_db;

-- ─────────────────────────────────────
-- 1. CUSTOMER
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer (
    customer_id   INT AUTO_INCREMENT PRIMARY KEY,
    first_name    VARCHAR(50)  NOT NULL,
    middle_name   VARCHAR(50),
    last_name     VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(64)  NOT NULL,
    city          VARCHAR(50)  NOT NULL,
    state         VARCHAR(50)  NOT NULL,
    pincode       CHAR(6)      NOT NULL
);

-- ─────────────────────────────────────
-- 2. CUSTOMER_PHONE
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_phone (
    customer_id  INT      NOT NULL,
    phone_number CHAR(10) NOT NULL,
    PRIMARY KEY (customer_id, phone_number),
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────
-- 3. DRIVER
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver (
    driver_id   INT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    last_name   VARCHAR(50) NOT NULL,
    license     VARCHAR(20) NOT NULL UNIQUE
);

-- ─────────────────────────────────────
-- 4. DRIVER_PHONE
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_phone (
    driver_id    INT      NOT NULL,
    phone_number CHAR(10) NOT NULL,
    PRIMARY KEY (driver_id, phone_number),
    FOREIGN KEY (driver_id) REFERENCES driver(driver_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────
-- 5. CAB
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cab (
    cab_id        INT AUTO_INCREMENT PRIMARY KEY,
    type          ENUM('Mini','Sedan','SUV') NOT NULL,
    model         VARCHAR(50) NOT NULL,
    state_code    CHAR(2)     NOT NULL,
    district_code CHAR(2)     NOT NULL,
    unique_number CHAR(4)     NOT NULL,
    UNIQUE KEY uq_plate (state_code, district_code, unique_number)
);

-- ─────────────────────────────────────
-- 6. LOCATION
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS location (
    location_id    INT AUTO_INCREMENT PRIMARY KEY,
    pickup_street  VARCHAR(100) NOT NULL,
    pickup_city    VARCHAR(50)  NOT NULL,
    pickup_pincode CHAR(6)      NOT NULL,
    drop_street    VARCHAR(100) NOT NULL,
    drop_city      VARCHAR(50)  NOT NULL,
    drop_pincode   CHAR(6)      NOT NULL
);

-- ─────────────────────────────────────
-- 7. BOOKING
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking (
    booking_id  INT AUTO_INCREMENT PRIMARY KEY,
    date        DATE NOT NULL,
    time        TIME NOT NULL,
    status      ENUM('Pending','Arrived','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
    customer_id INT NOT NULL,
    driver_id   INT NOT NULL,
    cab_id      INT NOT NULL,
    location_id INT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (driver_id)   REFERENCES driver(driver_id),
    FOREIGN KEY (cab_id)      REFERENCES cab(cab_id),
    FOREIGN KEY (location_id) REFERENCES location(location_id)
);

-- ─────────────────────────────────────
-- 8. PAYMENT
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    payment_method ENUM('UPI','Cash','Card') NOT NULL,
    amount         DECIMAL(10,2)             NOT NULL,
    payment_status ENUM('Paid','Pending')    NOT NULL DEFAULT 'Pending',
    booking_id     INT NOT NULL UNIQUE,
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id)
);

-- ─────────────────────────────────────
-- 9. ADMIN
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin (
    admin_id      INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(64) NOT NULL
);

-- ============================================================
--  SAMPLE DATA
--  All passwords hashed with SHA-256
--  Customers: password = password123
--    SHA256("password123") = ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
--  Admin: password = admin123
--    SHA256("admin123") = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- ============================================================

INSERT INTO admin (username, password_hash) VALUES
  ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

INSERT INTO customer (first_name, middle_name, last_name, email, password_hash, city, state, pincode) VALUES
  ('Riya',  NULL,    'Sharma', 'riya@example.com',  'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Delhi',   'Delhi',         '110001'),
  ('Arjun', 'Kumar', 'Verma',  'arjun@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Noida',   'Uttar Pradesh', '201301'),
  ('Sneha', NULL,    'Gupta',  'sneha@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Gurgaon', 'Haryana',       '122001');

INSERT INTO customer_phone VALUES
  (1,'9876543210'),(2,'9123456789'),(2,'9988776655'),(3,'9001122334');

INSERT INTO driver (first_name, middle_name, last_name, license) VALUES
  ('Rajesh', NULL,  'Yadav',   'DL-1420110012345'),
  ('Mohan',  'Lal', 'Singh',   'UP-1420120054321'),
  ('Suresh', NULL,  'Chauhan', 'HR-0520130067890');

INSERT INTO driver_phone VALUES
  (1,'9870001111'),(2,'9870002222'),(3,'9870003333');

INSERT INTO cab (type, model, state_code, district_code, unique_number) VALUES
  ('Mini',  'Maruti Alto',   'DL','1A','1234'),
  ('Sedan', 'Honda City',    'UP','14','5678'),
  ('SUV',   'Toyota Innova', 'HR','05','9101');

INSERT INTO location (pickup_street,pickup_city,pickup_pincode,drop_street,drop_city,drop_pincode) VALUES
  ('12 MG Road',        'Delhi','110001','5 Sector 18',   'Noida',  '201301'),
  ('7 Rajiv Chowk',     'Delhi','110001','22 Cyber City', 'Gurgaon','122001'),
  ('3 Connaught Place', 'Delhi','110001','9 Sector 62',   'Noida',  '201309');

INSERT INTO booking (date,time,status,customer_id,driver_id,cab_id,location_id) VALUES
  ('2025-07-10','09:00:00','Completed',1,1,1,1),
  ('2025-07-11','14:30:00','Pending',  2,2,2,2),
  ('2025-07-12','08:00:00','Arrived',  3,3,3,3);

INSERT INTO payment (payment_method,amount,payment_status,booking_id) VALUES
  ('UPI', 250.00,'Paid',   1),
  ('Cash',180.00,'Pending',2);
