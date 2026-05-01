// ── admin.js ──────────────────────────────────────────
function adminLogout() { Auth.logoutAdmin(); window.location.href='admin-login.html'; }

(async () => {
  await Promise.all([loadBookings(), loadCustomers(), loadDrivers(), loadCabs()]);
})();

async function loadBookings() {
  const res  = await Auth.adminFetch('/api/bookings');
  const json = await res.json();
  if (!json.success) { if(res.status===401) return window.location.href='admin.html'; return; }
  const rows = json.data;
  const counts = { Pending:0, Arrived:0, Completed:0, Cancelled:0 };
  rows.forEach(r => counts[r.status]++);
  document.getElementById('statBookings').textContent  = rows.length;
  document.getElementById('statPending').textContent   = counts.Pending;
  document.getElementById('statCompleted').textContent = counts.Completed;
  document.getElementById('statArrived').textContent   = counts.Arrived;
  document.getElementById('statCancelled').textContent = counts.Cancelled;
  document.getElementById('bookingsBody').innerHTML = rows.map(b => `
    <tr>
      <td><strong>#${b.booking_id}</strong></td>
      <td>${b.date?.slice(0,10)}</td><td>${b.time}</td>
      <td>${b.customer_name}</td><td>${b.driver_name}</td><td>${b.cab_type}</td>
      <td>${b.pickup_city}</td><td>${b.drop_city}</td>
      <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
      <td><a href="status.html?id=${b.booking_id}" class="btn btn-outline btn-sm">View</a></td>
    </tr>
  `).join('');
}

async function loadCustomers() {
  const res  = await Auth.adminFetch('/api/customers');
  const json = await res.json();
  if (!json.success) return;
  document.getElementById('customersBody').innerHTML = json.data.map(c => `
    <tr>
      <td>#${c.customer_id}</td>
      <td>${c.first_name} ${c.last_name}</td>
      <td>${c.email}</td>
      <td>${c.city}</td>
      <td>${c.phones||'—'}</td>
      <td>${c.created_at?.slice(0,10)||'—'}</td>
    </tr>
  `).join('');
}

async function loadDrivers() {
  const res  = await fetch('/api/drivers');
  const json = await res.json();
  if (!json.success) return;
  document.getElementById('driversBody').innerHTML = json.data.map(d => `
    <tr><td>#${d.driver_id}</td><td>${d.first_name} ${d.last_name}</td><td>${d.license}</td><td>${d.phones||'—'}</td></tr>
  `).join('');
}

async function loadCabs() {
  const res  = await fetch('/api/cabs');
  const json = await res.json();
  if (!json.success) return;
  document.getElementById('cabsBody').innerHTML = json.data.map(c => `
    <tr><td>#${c.cab_id}</td><td>${c.type}</td><td>${c.model}</td><td>${c.state_code}${c.district_code}${c.unique_number}</td></tr>
  `).join('');
}

function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display='none');
  document.getElementById(`tab-${name}`).style.display='';
  document.querySelectorAll('#tabBtns .btn').forEach(b => { b.className='btn btn-outline btn-sm'; });
  btn.className = 'btn btn-primary btn-sm';
}
