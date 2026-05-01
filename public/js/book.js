// ── book.js ───────────────────────────────────────────
document.getElementById('date').valueAsDate = new Date();

(async () => {
  try {
    const [drvRes, cabRes] = await Promise.all([
      fetch('/api/drivers'),
      fetch('/api/cabs'),
    ]);
    const { data: drivers } = await drvRes.json();
    const { data: cabs }    = await cabRes.json();

    const dSel    = document.getElementById('driver_id');
    dSel.innerHTML = '<option value="">Select driver…</option>' +
      drivers.map(d => `<option value="${d.driver_id}">${d.first_name} ${d.last_name}</option>`).join('');

    const cSel  = document.getElementById('cab_id');
    const tSel  = document.getElementById('cab_type');
    const allCabs = cabs;

    function filterCabs() {
      const type = tSel.value;
      const filtered = type ? allCabs.filter(c => c.type === type) : allCabs;
      cSel.innerHTML = '<option value="">Select cab…</option>' +
        filtered.map(c => `<option value="${c.cab_id}">${c.type} – ${c.model} (${c.state_code}${c.district_code}${c.unique_number})</option>`).join('');
    }
    tSel.addEventListener('change', filterCabs);
    filterCabs();
  } catch {
    showAlert('error', 'Failed to load drivers/cabs. Is the server running?');
  }
})();

async function estimateFare() {
  const km   = document.getElementById('distance_km').value;
  const type = document.getElementById('cab_type').value;
  if (!km || !type) return showAlert('error', 'Enter distance and select cab type first.');

  const res  = await fetch(`/api/fare-estimate?distance_km=${km}&cab_type=${type}`);
  const json = await res.json();
  if (!json.success) return showAlert('error', json.message);

  document.getElementById('fareAmt').textContent  = `₹${json.data.fare}`;
  document.getElementById('fareDist').textContent = `${json.data.distance_km} km`;
  document.getElementById('fareETA').textContent  = `${json.data.eta_minutes} min`;
  document.getElementById('fareType').textContent = json.data.cab_type;
  document.getElementById('fareBox').classList.add('show');
}

async function bookRide() {
  const btn = document.getElementById('bookBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Booking…';

  const locBody = {
    pickup_street : v('pickup_street'), pickup_city: v('pickup_city'), pickup_pincode: v('pickup_pincode'),
    drop_street   : v('drop_street'),   drop_city:   v('drop_city'),   drop_pincode:   v('drop_pincode'),
  };
  if (Object.values(locBody).some(x => !x)) {
    reset(btn); return showAlert('error', 'Fill all location fields.');
  }

  let location_id;
  try {
    const locRes  = await Auth.apiFetch('/api/locations', { method:'POST', body: JSON.stringify(locBody) });
    const locJson = await locRes.json();
    if (!locJson.success) throw new Error(locJson.message);
    location_id = locJson.data.location_id;
  } catch (e) { reset(btn); return showAlert('error', e.message); }

  const bookBody = { driver_id:Number(v('driver_id')), cab_id:Number(v('cab_id')), location_id, date:v('date'), time:v('time') };
  if (!bookBody.driver_id||!bookBody.cab_id||!bookBody.date||!bookBody.time) {
    reset(btn); return showAlert('error', 'Fill all ride detail fields.');
  }

  try {
    const bRes  = await Auth.apiFetch('/api/book', { method:'POST', body: JSON.stringify(bookBody) });
    const bJson = await bRes.json();
    if (!bJson.success) throw new Error(bJson.message);

    const { booking_id } = bJson.data;
    document.getElementById('bookingResult').style.display = '';
    document.getElementById('resultDetails').innerHTML = `
      <div class="detail-row"><span class="key">Booking ID</span><span class="val">#${booking_id}</span></div>
      <div class="detail-row"><span class="key">Date &amp; Time</span><span class="val">${bookBody.date} at ${bookBody.time}</span></div>
      <div class="detail-row"><span class="key">Status</span><span class="val"><span class="badge badge-pending">Pending</span></span></div>
    `;
    document.getElementById('statusLink').href = `status.html?id=${booking_id}`;
    document.getElementById('payLink').href    = `payment.html?id=${booking_id}`;
    showAlert('success', `Booking #${booking_id} confirmed!`);
    btn.innerHTML = '✅ Booked';
  } catch (e) { reset(btn); showAlert('error', e.message); }
}

function reset(btn) { btn.disabled=false; btn.innerHTML='🚕 Confirm Booking'; }
function v(id) { return document.getElementById(id)?.value?.trim()||''; }
function showAlert(type, msg) {
  const el = document.getElementById('alert');
  el.className = `alert alert-${type==='error'?'error':'success'} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 5000);
}
