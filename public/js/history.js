// ── history.js ────────────────────────────────────────
async function loadHistory(customerId) {
  const id = customerId || Auth.getCustomer()?.id;
  if (!id) return showAlert('error','Not logged in.');
  try {
    const res  = await Auth.apiFetch(`/api/bookings/customer/${id}`);
    const json = await res.json();
    if (!json.success) return showAlert('error', json.message);
    const rows = json.data;
    document.getElementById('historySection').style.display = '';
    if (!rows.length) { document.getElementById('emptyState').style.display=''; return; }
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('historyBody').innerHTML = rows.map(b => `
      <tr>
        <td><strong>#${b.booking_id}</strong></td>
        <td>${b.date?.slice(0,10)}</td>
        <td>${b.time}</td>
        <td>${b.pickup_city}</td>
        <td>${b.drop_city}</td>
        <td>${b.cab_type} – ${b.model}</td>
        <td>${b.driver_name}</td>
        <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
        <td style="display:flex;gap:.4rem;flex-wrap:wrap;">
          <a href="status.html?id=${b.booking_id}" class="btn btn-outline btn-sm">Status</a>
          ${b.status==='Completed'?`<a href="payment.html?id=${b.booking_id}" class="btn btn-primary btn-sm">Pay</a>`:''}
        </td>
      </tr>
    `).join('');
  } catch { showAlert('error','Failed to load bookings.'); }
}

function showAlert(type, msg) {
  const el = document.getElementById('alert');
  el.className = `alert alert-${type==='error'?'error':'success'} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 5000);
}
