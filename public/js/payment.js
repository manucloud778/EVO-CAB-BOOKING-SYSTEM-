// ── payment.js ────────────────────────────────────────
let selectedMethod = null;
let currentBookingId = null;

const urlId = new URLSearchParams(location.search).get('id');
if (urlId) { document.getElementById('booking_id').value = urlId; fetchForPayment(); }

async function fetchForPayment() {
  const id = document.getElementById('booking_id').value.trim();
  if (!id) return showAlert('error','Enter a booking ID.');
  try {
    const res  = await Auth.apiFetch(`/api/booking/${id}`);
    const json = await res.json();
    if (!json.success) return showAlert('error', json.message);
    const b = json.data;
    currentBookingId = b.booking_id;
    if (b.status !== 'Completed') return showAlert('error', `Booking is "${b.status}". Payment only after trip Completed.`);

    const pRes  = await Auth.apiFetch(`/api/payment/${id}`);
    const pJson = await pRes.json();
    if (pJson.success && pJson.data.payment_status === 'Paid') {
      document.getElementById('successCard').style.display = '';
      document.getElementById('payConfirmText').textContent = `Payment #${pJson.data.payment_id} via ${pJson.data.payment_method} — ₹${pJson.data.amount}`;
      return;
    }

    document.getElementById('rideSummary').innerHTML = `
      <div class="detail-row"><span class="key">Booking ID</span><span class="val">#${b.booking_id}</span></div>
      <div class="detail-row"><span class="key">Route</span><span class="val">${b.pickup_city} → ${b.drop_city}</span></div>
      <div class="detail-row"><span class="key">Driver</span><span class="val">${b.driver_name}</span></div>
      <div class="detail-row"><span class="key">Cab</span><span class="val">${b.cab_type} — ${b.model}</span></div>
    `;
    document.getElementById('payCard').style.display = '';
  } catch (e) { showAlert('error','Could not load booking.'); }
}

function selectMethod(el) {
  document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
  selectedMethod = el.dataset.method;
}

async function submitPayment() {
  const amount = document.getElementById('amount').value;
  if (!amount || amount <= 0) return showAlert('error','Enter a valid amount.');
  if (!selectedMethod)        return showAlert('error','Select a payment method.');

  const btn = document.getElementById('payBtn');
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Processing…';
  try {
    const pRes  = await Auth.apiFetch('/api/payment', { method:'POST', body:JSON.stringify({booking_id:currentBookingId,payment_method:selectedMethod,amount:Number(amount)}) });
    const pJson = await pRes.json();
    if (!pJson.success) throw new Error(pJson.message);

    const cRes  = await Auth.apiFetch('/api/payment/confirm', { method:'PUT', body:JSON.stringify({payment_id:pJson.data.payment_id}) });
    const cJson = await cRes.json();
    if (!cJson.success) throw new Error(cJson.message);

    document.getElementById('payCard').style.display='none';
    document.getElementById('successCard').style.display='';
    document.getElementById('payConfirmText').textContent = `Payment #${pJson.data.payment_id} of ₹${amount} via ${selectedMethod} recorded.`;
  } catch (e) { btn.disabled=false; btn.innerHTML='Pay Now'; showAlert('error',e.message); }
}

function showAlert(type, msg) {
  const el = document.getElementById('alert');
  el.className = `alert alert-${type==='error'?'error':type==='success'?'success':'info'} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 6000);
}
