// ── status.js ─────────────────────────────────────────
const urlId = new URLSearchParams(location.search).get('id');
if (urlId) { document.getElementById('booking_id').value = urlId; fetchBooking(); }

async function fetchBooking() {
  const id = document.getElementById('booking_id').value.trim();
  if (!id) return showAlert('error','Enter a booking ID.');
  try {
    const res  = await Auth.apiFetch(`/api/booking/${id}`);
    const json = await res.json();
    if (!json.success) return showAlert('error', json.message);
    renderBooking(json.data);
  } catch { showAlert('error','Could not load booking.'); }
}

function renderBooking(b) {
  document.getElementById('bookingCard').style.display = '';
  const order = ['Pending','Arrived','Completed'];
  const isCancelled = b.status === 'Cancelled';
  const stepsHtml = order.map((s, i) => {
    let cls = '';
    const idx = order.indexOf(b.status);
    if (!isCancelled) { if(i<idx) cls='done'; else if(i===idx) cls='active'; }
    const line = i < order.length-1 ? '<div class="step-line"></div>' : '';
    return `<div class="step ${cls}"><div class="step-num">${i+1}</div>${s}</div>${line}`;
  }).join('') + (isCancelled ? '<div class="step" style="margin-left:.75rem"><div class="step-num" style="border-color:var(--danger);color:var(--danger)">✕</div>Cancelled</div>' : '');
  document.getElementById('stepsBar').innerHTML = stepsHtml;

  document.getElementById('detailRows').innerHTML = `
    <div class="detail-row"><span class="key">Booking ID</span><span class="val">#${b.booking_id}</span></div>
    <div class="detail-row"><span class="key">Date &amp; Time</span><span class="val">${b.date?.slice(0,10)} at ${b.time}</span></div>
    <div class="detail-row"><span class="key">Status</span><span class="val"><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></span></div>
    <div class="detail-row"><span class="key">Customer</span><span class="val">${b.customer_name}</span></div>
    <div class="detail-row"><span class="key">Driver</span><span class="val">${b.driver_name}</span></div>
    <div class="detail-row"><span class="key">Cab</span><span class="val">${b.cab_type} — ${b.model} (${b.plate})</span></div>
    <div class="detail-row"><span class="key">Pickup</span><span class="val">${b.pickup_street}, ${b.pickup_city} – ${b.pickup_pincode}</span></div>
    <div class="detail-row"><span class="key">Drop</span><span class="val">${b.drop_street}, ${b.drop_city} – ${b.drop_pincode}</span></div>
  `;

  const btns = document.getElementById('actionBtns');
  btns.innerHTML = '';
  const transitions = { Pending:[{label:'✅ Cab Arrived',status:'Arrived',cls:'btn-primary'},{label:'❌ Cancel',status:'Cancelled',cls:'btn-danger'}], Arrived:[{label:'🏁 Trip Completed',status:'Completed',cls:'btn-success'},{label:'❌ Cancel',status:'Cancelled',cls:'btn-danger'}], Completed:[], Cancelled:[] };
  const actions = transitions[b.status] || [];

  if (b.status === 'Completed') {
    btns.innerHTML = `<a href="payment.html?id=${b.booking_id}" class="btn btn-primary">💳 Proceed to Payment</a>`;
  } else {
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = `btn ${a.cls}`;
      btn.textContent = a.label;
      btn.onclick = () => updateStatus(b.booking_id, a.status);
      btns.appendChild(btn);
    });
  }
}

async function updateStatus(booking_id, status) {
  try {
    const res  = await Auth.apiFetch('/api/booking/status', { method:'PUT', body:JSON.stringify({booking_id,status}) });
    const json = await res.json();
    if (!json.success) return showAlert('error', json.message);
    showAlert('success', `Status updated to "${status}".`);
    setTimeout(fetchBooking, 800);
  } catch (e) { showAlert('error', e.message); }
}

function showAlert(type, msg) {
  const el = document.getElementById('alert');
  el.className = `alert alert-${type==='error'?'error':'success'} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 5000);
}
