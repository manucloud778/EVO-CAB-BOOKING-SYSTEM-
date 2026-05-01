# 🚕 CabGo — Scheduled Cab Booking System

A full-stack DBMS academic project built with **MySQL + Node.js/Express + HTML/CSS/JS**.

---

## 📁 Project Structure

```
cab-booking-system/
├── server.js              ← Express backend (all API routes)
├── package.json
├── db/
│   └── schema.sql         ← MySQL schema + sample data
└── public/                ← Frontend (served by Express)
    ├── index.html         ← Book a cab
    ├── status.html        ← Update ride status
    ├── payment.html       ← Make payment
    ├── history.html       ← Booking history
    ├── admin.html         ← Admin dashboard
    ├── css/
    │   └── style.css
    └── js/
        ├── book.js
        ├── status.js
        ├── payment.js
        ├── history.js
        └── admin.js
```

---

## ⚙️ Setup & Run

### 1. Import Database
```bash
mysql -u root -p < db/schema.sql
```

### 2. Configure DB credentials
Open `server.js` and edit:
```js
const pool = mysql.createPool({
  host    : 'localhost',
  user    : 'root',
  password: 'YOUR_PASSWORD',   // ← change this
  database: 'cab_booking_db',
});
```

### 3. Install & Start
```bash
npm install
npm start
# → http://localhost:3000
```

---

## 🔌 API Reference

| Method | Endpoint                    | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | /api/customers              | Register customer              |
| GET    | /api/customers/:id          | Get customer profile           |
| GET    | /api/customers              | List all customers             |
| POST   | /api/drivers                | Register driver                |
| GET    | /api/drivers                | List all drivers               |
| POST   | /api/cabs                   | Add cab                        |
| GET    | /api/cabs                   | List all cabs                  |
| POST   | /api/locations              | Save pickup/drop location      |
| POST   | /api/book                   | Create booking                 |
| GET    | /api/booking/:id            | Get booking details            |
| GET    | /api/bookings               | All bookings (admin)           |
| GET    | /api/bookings/customer/:id  | Customer booking history       |
| PUT    | /api/booking/status         | Update booking status          |
| POST   | /api/payment                | Record payment                 |
| PUT    | /api/payment/confirm        | Confirm payment as Paid        |
| GET    | /api/payment/:booking_id    | Get payment for a booking      |
| GET    | /api/fare-estimate          | Estimate fare + ETA            |

---

## 🔄 Booking Workflow

```
Book → Pending → Arrived → Completed → Payment
                    ↓           ↓
                Cancelled   Cancelled
```

---

## 🗄️ Database Tables

1. `customer` — Customer master
2. `customer_phone` — Multi-valued phone numbers
3. `driver` — Driver master
4. `driver_phone` — Multi-valued phone numbers
5. `cab` — Vehicle details
6. `location` — Pickup & drop pairs
7. `booking` — Core booking table (FK to all above)
8. `payment` — Payment records (1-to-1 with booking)

---

## 🧪 Technologies

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.x
