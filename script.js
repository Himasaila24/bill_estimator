/**
 * Electricity Bill Estimator - Frontend JavaScript
 * College Java Micro-Project
 * --------------------------------------------------------------------------
 * Handles:
 * 1. Health check & connectivity with Core Java HttpServer backend
 * 2. Real-time client-side input validation and dynamic unit calculations
 * 3. Quick test preset handlers (50, 100, 150, 200, 250 units)
 * 4. Asynchronous REST API communication (POST /api/calculate)
 * 5. Dynamic rendering of progressive tariff slabs and visual distribution bar
 * 6. Printable receipt generation with browser window.print()
 * 7. Form resetting and user feedback notifications
 * --------------------------------------------------------------------------
 */

// Environment detection
const isGitHubPages = window.location.hostname.includes('github.io');
const isHttps = window.location.protocol === 'https:';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Determine Backend Base URL
// If running from file:// or localhost non-8080 port, point to http://localhost:8080
// If running on HTTPS (e.g. GitHub Pages), browser blocks mixed content to http://localhost, so API_BASE is empty
const API_BASE = (!isHttps && (window.location.protocol === 'file:' || !window.location.port || window.location.port !== '8080'))
  ? 'http://localhost:8080'
  : (isLocalhost && !isHttps ? `http://${window.location.hostname}:8080` : '');

// Client-side tariff calculation counter
let clientBillCounter = 1001;

/**
 * Client-Side Progressive Tariff Calculation Engine
 * Mirrors the exact logic from ElectricityBillServer.java:
 * Slab 1: 0 - 100 units @ ₹2.00
 * Slab 2: 101 - 200 units @ ₹3.00
 * Slab 3: > 200 units @ ₹5.00
 */
function calculateTariffClientSide(payload) {
  const previousReading = parseFloat(payload.previousReading);
  const currentReading = parseFloat(payload.currentReading);
  const unitsConsumed = currentReading - previousReading;
  let remainingUnits = unitsConsumed;

  const slabs = [];

  // Slab 1: First 100 units @ ₹2.00
  const slab1Units = Math.min(Math.max(remainingUnits, 0), 100);
  const slab1Amount = slab1Units * 2.0;
  slabs.push({
    slabName: 'Slab 1 (First 100 units)',
    range: '0 - 100 units',
    rate: 2.0,
    units: slab1Units,
    amount: slab1Amount
  });
  remainingUnits -= slab1Units;

  // Slab 2: Next 100 units @ ₹3.00 (101 - 200)
  const slab2Units = Math.min(Math.max(remainingUnits, 0), 100);
  const slab2Amount = slab2Units * 3.0;
  slabs.push({
    slabName: 'Slab 2 (Next 100 units)',
    range: '101 - 200 units',
    rate: 3.0,
    units: slab2Units,
    amount: slab2Amount
  });
  remainingUnits -= slab2Units;

  // Slab 3: Units above 200 @ ₹5.00
  const slab3Units = Math.max(remainingUnits, 0);
  const slab3Amount = slab3Units * 5.0;
  slabs.push({
    slabName: 'Slab 3 (Units above 200)',
    range: '> 200 units',
    rate: 5.0,
    units: slab3Units,
    amount: slab3Amount
  });

  const totalEnergyCharge = slab1Amount + slab2Amount + slab3Amount;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const timestampStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

  const billId = `BILL-${dateStr}-${clientBillCounter++}`;
  const billingPeriod = payload.billingPeriod || now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const consumerNumber = payload.consumerNumber || `EB-${Math.floor(10000 + Math.random() * 90000)}`;

  return {
    billId: billId,
    generatedAt: timestampStr,
    consumerName: payload.consumerName,
    consumerNumber: consumerNumber,
    billingPeriod: billingPeriod,
    previousReading: previousReading,
    currentReading: currentReading,
    unitsConsumed: unitsConsumed,
    totalEnergyCharge: totalEnergyCharge,
    totalBill: totalEnergyCharge,
    currency: 'INR',
    currencySymbol: '₹',
    slabs: slabs
  };
}

// DOM Elements Cache
const backendStatusPill = document.getElementById('backendStatusPill');
const backendStatusText = document.getElementById('backendStatusText');
const billForm = document.getElementById('billForm');
const consumerNameInput = document.getElementById('consumerName');
const consumerNumberInput = document.getElementById('consumerNumber');
const billingPeriodInput = document.getElementById('billingPeriod');
const previousReadingInput = document.getElementById('previousReading');
const currentReadingInput = document.getElementById('currentReading');

const calculateBtn = document.getElementById('calculateBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const resetBtn = document.getElementById('resetBtn');

const formAlert = document.getElementById('formAlert');
const alertIcon = document.getElementById('alertIcon');
const alertMessage = document.getElementById('alertMessage');

const nameError = document.getElementById('nameError');
const prevError = document.getElementById('prevError');
const currError = document.getElementById('currError');

const livePreviewBox = document.getElementById('livePreviewBox');
const previewPrev = document.getElementById('previewPrev');
const previewCurr = document.getElementById('previewCurr');
const previewUnits = document.getElementById('previewUnits');

const emptyResultCard = document.getElementById('emptyResultCard');
const resultCard = document.getElementById('resultCard');

// Result Breakdown Elements
const resBillId = document.getElementById('resBillId');
const resGeneratedAt = document.getElementById('resGeneratedAt');
const resTotalBill = document.getElementById('resTotalBill');
const resUnitsConsumed = document.getElementById('resUnitsConsumed');
const resConsumerName = document.getElementById('resConsumerName');
const resConsumerNumber = document.getElementById('resConsumerNumber');
const resBillingPeriod = document.getElementById('resBillingPeriod');
const resPrevReading = document.getElementById('resPrevReading');
const resCurrReading = document.getElementById('resCurrReading');
const resEnergyCharge = document.getElementById('resEnergyCharge');
const resGrandTotal = document.getElementById('resGrandTotal');
const slabBreakdownBody = document.getElementById('slabBreakdownBody');

const barSlab1 = document.getElementById('barSlab1');
const barSlab2 = document.getElementById('barSlab2');
const barSlab3 = document.getElementById('barSlab3');
const slabDistributionLabel = document.getElementById('slabDistributionLabel');

// Receipt Modal Elements
const receiptModal = document.getElementById('receiptModal');
const viewReceiptBtn = document.getElementById('viewReceiptBtn');
const directPrintBtn = document.getElementById('directPrintBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalPrintBtn = document.getElementById('modalPrintBtn');

const rcptBillId = document.getElementById('rcptBillId');
const rcptDate = document.getElementById('rcptDate');
const rcptConsumerName = document.getElementById('rcptConsumerName');
const rcptConsumerNumber = document.getElementById('rcptConsumerNumber');
const rcptPeriod = document.getElementById('rcptPeriod');
const rcptPrev = document.getElementById('rcptPrev');
const rcptCurr = document.getElementById('rcptCurr');
const rcptUnits = document.getElementById('rcptUnits');
const rcptTableBody = document.getElementById('rcptTableBody');
const rcptSubtotal = document.getElementById('rcptSubtotal');
const rcptTotal = document.getElementById('rcptTotal');

// Last successful calculation data
let currentBillData = null;

// ==========================================================================
// 1. BACKEND HEALTH CHECK
// ==========================================================================
async function checkBackendHealth() {
  if (isGitHubPages || (isHttps && !isLocalhost)) {
    backendStatusPill.className = 'status-pill web-mode';
    backendStatusText.textContent = 'GitHub Pages Mode (Active)';
    backendStatusPill.title = 'Running static deployment on GitHub Pages with built-in client tariff engine. For Java backend demo, run locally with start.bat!';
    return true;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      backendStatusPill.className = 'status-pill connected';
      backendStatusText.textContent = 'Java Server Connected (Port 8080)';
      backendStatusPill.title = 'Core Java HttpServer is active and serving requests.';
      return true;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    backendStatusPill.className = 'status-pill error';
    backendStatusText.textContent = 'Backend Offline (start.bat)';
    backendStatusPill.title = 'Local Java server not detected. Double-click start.bat to start it. Client fallback engine is active.';
    return false;
  }
}

// ==========================================================================
// 2. LIVE METER READING CALCULATION PREVIEW
// ==========================================================================
function updateLivePreview() {
  const prevVal = previousReadingInput.value.trim();
  const currVal = currentReadingInput.value.trim();

  previewPrev.textContent = prevVal !== '' ? prevVal : '-';
  previewCurr.textContent = currVal !== '' ? currVal : '-';

  if (prevVal === '' || currVal === '') {
    previewUnits.textContent = '0';
    clearFieldErrors();
    return;
  }

  const prev = parseFloat(prevVal);
  const curr = parseFloat(currVal);

  if (isNaN(prev) || isNaN(curr)) {
    previewUnits.textContent = '0';
    return;
  }

  if (curr < prev) {
    previewUnits.textContent = 'Invalid';
    previewUnits.style.color = 'var(--danger-500)';
    currError.textContent = `Current reading (${curr}) cannot be less than previous (${prev}).`;
    currentReadingInput.classList.add('input-error');
  } else {
    const diff = curr - prev;
    previewUnits.textContent = Number.isInteger(diff) ? diff : diff.toFixed(2);
    previewUnits.style.color = 'var(--primary-700)';
    currError.textContent = '';
    currentReadingInput.classList.remove('input-error');
  }
}

previousReadingInput.addEventListener('input', updateLivePreview);
currentReadingInput.addEventListener('input', updateLivePreview);

// Clear errors when consumer name changes
consumerNameInput.addEventListener('input', () => {
  if (consumerNameInput.value.trim() !== '') {
    nameError.textContent = '';
    consumerNameInput.classList.remove('input-error');
  }
});

function clearFieldErrors() {
  nameError.textContent = '';
  prevError.textContent = '';
  currError.textContent = '';
  consumerNameInput.classList.remove('input-error');
  previousReadingInput.classList.remove('input-error');
  currentReadingInput.classList.remove('input-error');
}

// ==========================================================================
// 3. QUICK TEST PRESET BUTTONS
// ==========================================================================
const presetButtons = document.querySelectorAll('.btn-preset');
presetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const units = parseFloat(btn.getAttribute('data-units'));

    // Populate sensible default values for quick testing
    consumerNameInput.value = 'Rahul Sharma';
    consumerNumberInput.value = 'CON-10492';
    billingPeriodInput.value = 'October 2026';
    
    // Set base previous reading and current reading to produce exact units
    const basePrevious = 1000;
    previousReadingInput.value = basePrevious;
    currentReadingInput.value = basePrevious + units;

    clearFieldErrors();
    hideAlert();
    updateLivePreview();

    // Trigger calculation
    billForm.dispatchEvent(new Event('submit', { cancelable: true }));
  });
});

// ==========================================================================
// 4. CLIENT-SIDE VALIDATION
// ==========================================================================
function validateClientInputs() {
  clearFieldErrors();
  hideAlert();
  let isValid = true;

  const nameVal = consumerNameInput.value.trim();
  const prevVal = previousReadingInput.value.trim();
  const currVal = currentReadingInput.value.trim();

  // Validate Consumer Name
  if (!nameVal) {
    nameError.textContent = 'Consumer name is required.';
    consumerNameInput.classList.add('input-error');
    consumerNameInput.focus();
    isValid = false;
  }

  // Validate Previous Reading
  if (prevVal === '') {
    prevError.textContent = 'Previous meter reading is required.';
    previousReadingInput.classList.add('input-error');
    if (isValid) previousReadingInput.focus();
    isValid = false;
  } else {
    const prev = parseFloat(prevVal);
    if (isNaN(prev)) {
      prevError.textContent = 'Previous reading must be a valid number.';
      previousReadingInput.classList.add('input-error');
      if (isValid) previousReadingInput.focus();
      isValid = false;
    } else if (prev < 0) {
      prevError.textContent = 'Previous reading cannot be negative.';
      previousReadingInput.classList.add('input-error');
      if (isValid) previousReadingInput.focus();
      isValid = false;
    }
  }

  // Validate Current Reading
  if (currVal === '') {
    currError.textContent = 'Current meter reading is required.';
    currentReadingInput.classList.add('input-error');
    if (isValid) currentReadingInput.focus();
    isValid = false;
  } else {
    const curr = parseFloat(currVal);
    const prev = parseFloat(prevVal);

    if (isNaN(curr)) {
      currError.textContent = 'Current reading must be a valid number.';
      currentReadingInput.classList.add('input-error');
      if (isValid) currentReadingInput.focus();
      isValid = false;
    } else if (curr < 0) {
      currError.textContent = 'Current reading cannot be negative.';
      currentReadingInput.classList.add('input-error');
      if (isValid) currentReadingInput.focus();
      isValid = false;
    } else if (!isNaN(prev) && curr < prev) {
      currError.textContent = `Current reading (${curr}) cannot be lower than previous reading (${prev}).`;
      currentReadingInput.classList.add('input-error');
      if (isValid) currentReadingInput.focus();
      isValid = false;
    }
  }

  return isValid;
}

// ==========================================================================
// 5. BILL CALCULATION (API POST REQUEST)
// ==========================================================================
billForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateClientInputs()) {
    showAlert('error', '⚠️ Please resolve the highlighted validation errors before calculating.');
    return;
  }

  // Set Loading State
  setLoadingState(true);
  hideAlert();

  // Prepare Payload
  const payload = {
    consumerName: consumerNameInput.value.trim(),
    consumerNumber: consumerNumberInput.value.trim(),
    billingPeriod: billingPeriodInput.value.trim(),
    previousReading: parseFloat(previousReadingInput.value.trim()),
    currentReading: parseFloat(currentReadingInput.value.trim())
  };

  // 1. If running on GitHub Pages or HTTPS remote, use client calculation engine directly
  if (isGitHubPages || (isHttps && !isLocalhost)) {
    setTimeout(() => {
      const clientData = calculateTariffClientSide(payload);
      currentBillData = clientData;
      renderBillResult(clientData);
      showAlert('success', '⚡ Electricity bill successfully calculated! (GitHub Pages Web Mode)');
      setLoadingState(false);
    }, 200);
    return;
  }

  // 2. Otherwise, attempt to call Core Java backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${API_BASE}/api/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = await response.json();

    if (!response.ok || !json.success) {
      const errMsg = json.message || `Server returned error (${response.status})`;
      showAlert('error', `❌ Validation Failed: ${errMsg}`);
      backendStatusPill.className = 'status-pill connected';
      backendStatusText.textContent = 'Java Server Connected (Port 8080)';
      return;
    }

    // Calculation Succeeded via Java Backend
    currentBillData = json.data;
    renderBillResult(json.data);
    showAlert('success', '✅ Electricity bill successfully calculated by Java backend!');
    backendStatusPill.className = 'status-pill connected';
    backendStatusText.textContent = 'Java Server Connected (Port 8080)';

  } catch (error) {
    console.warn('Java server unavailable, falling back to client tariff calculation:', error);
    // Seamless fallback to client engine so user is never blocked
    const fallbackData = calculateTariffClientSide(payload);
    currentBillData = fallbackData;
    renderBillResult(fallbackData);
    showAlert('info', 'ℹ️ Calculated via client fallback engine (Java backend is offline). Run start.bat to use the Core Java server.');
    backendStatusPill.className = 'status-pill error';
    backendStatusText.textContent = 'Backend Offline (start.bat)';
  } finally {
    setLoadingState(false);
  }
});

function setLoadingState(isLoading) {
  if (isLoading) {
    calculateBtn.disabled = true;
    btnSpinner.classList.remove('hidden');
    btnText.textContent = 'Calculating...';
  } else {
    calculateBtn.disabled = false;
    btnSpinner.classList.add('hidden');
    btnText.textContent = 'Calculate Bill';
  }
}

// ==========================================================================
// 6. RENDER CALCULATION RESULTS & SLAB BREAKDOWN
// ==========================================================================
function renderBillResult(data) {
  emptyResultCard.classList.add('hidden');
  resultCard.classList.remove('hidden');

  // Format currency helper
  const formatCur = (val) => '₹' + parseFloat(val).toFixed(2);
  const formatNum = (val) => Number.isInteger(parseFloat(val)) ? parseInt(val, 10) : parseFloat(val).toFixed(2);

  // Update Summary Banner
  resBillId.textContent = data.billId;
  resGeneratedAt.textContent = data.generatedAt;
  resTotalBill.textContent = parseFloat(data.totalBill).toFixed(2);
  resUnitsConsumed.textContent = formatNum(data.unitsConsumed);

  // Update Consumer Details
  resConsumerName.textContent = data.consumerName;
  resConsumerNumber.textContent = data.consumerNumber || 'N/A';
  resBillingPeriod.textContent = data.billingPeriod;
  resPrevReading.textContent = formatNum(data.previousReading) + ' kWh';
  resCurrReading.textContent = formatNum(data.currentReading) + ' kWh';

  // Render Itemized Slab Breakdown Table
  slabBreakdownBody.innerHTML = '';
  data.slabs.forEach(slab => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(slab.slabName)}</strong>
        <div style="font-size: 0.75rem; color: var(--slate-500);">${escapeHtml(slab.range)}</div>
      </td>
      <td class="font-mono">${formatNum(slab.units)} kWh</td>
      <td class="font-mono">₹${parseFloat(slab.rate).toFixed(2)}</td>
      <td class="text-right font-mono font-bold">${formatCur(slab.amount)}</td>
    `;
    slabBreakdownBody.appendChild(tr);
  });

  resEnergyCharge.textContent = formatCur(data.totalEnergyCharge);
  resGrandTotal.textContent = formatCur(data.totalBill);

  // Update Visual Progress Bar Distribution
  updateSlabProgressBar(data);

  // Scroll smoothly to result on smaller screens
  if (window.innerWidth < 1024) {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateSlabProgressBar(data) {
  const totalUnits = parseFloat(data.unitsConsumed);
  if (totalUnits <= 0) {
    barSlab1.style.width = '0%';
    barSlab2.style.width = '0%';
    barSlab3.style.width = '0%';
    slabDistributionLabel.textContent = '0 Units';
    return;
  }

  const slab1Units = data.slabs[0] ? parseFloat(data.slabs[0].units) : 0;
  const slab2Units = data.slabs[1] ? parseFloat(data.slabs[1].units) : 0;
  const slab3Units = data.slabs[2] ? parseFloat(data.slabs[2].units) : 0;

  const pct1 = ((slab1Units / totalUnits) * 100).toFixed(1);
  const pct2 = ((slab2Units / totalUnits) * 100).toFixed(1);
  const pct3 = ((slab3Units / totalUnits) * 100).toFixed(1);

  barSlab1.style.width = `${pct1}%`;
  barSlab2.style.width = `${pct2}%`;
  barSlab3.style.width = `${pct3}%`;

  barSlab1.title = `Slab 1: ${slab1Units} units (${pct1}%)`;
  barSlab2.title = `Slab 2: ${slab2Units} units (${pct2}%)`;
  barSlab3.title = `Slab 3: ${slab3Units} units (${pct3}%)`;

  slabDistributionLabel.textContent = `${totalUnits} Total Units (100% Calculated)`;
}

// ==========================================================================
// 7. PRINTABLE RECEIPT GENERATION & MODAL
// ==========================================================================
function populateReceipt(data) {
  const formatCur = (val) => '₹' + parseFloat(val).toFixed(2);
  const formatNum = (val) => Number.isInteger(parseFloat(val)) ? parseInt(val, 10) : parseFloat(val).toFixed(2);

  rcptBillId.textContent = data.billId;
  rcptDate.textContent = data.generatedAt.split(' ')[0];
  rcptConsumerName.textContent = data.consumerName;
  rcptConsumerNumber.textContent = data.consumerNumber || 'N/A';
  rcptPeriod.textContent = data.billingPeriod;

  rcptPrev.textContent = formatNum(data.previousReading);
  rcptCurr.textContent = formatNum(data.currentReading);
  rcptUnits.textContent = formatNum(data.unitsConsumed);

  rcptTableBody.innerHTML = '';
  data.slabs.forEach(slab => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(slab.slabName)}</strong> (${escapeHtml(slab.range)})
      </td>
      <td class="text-center font-mono">${formatNum(slab.units)}</td>
      <td class="text-right font-mono">₹${parseFloat(slab.rate).toFixed(2)}</td>
      <td class="text-right font-mono font-bold">${formatCur(slab.amount)}</td>
    `;
    rcptTableBody.appendChild(tr);
  });

  rcptSubtotal.textContent = formatCur(data.totalEnergyCharge);
  rcptTotal.textContent = formatCur(data.totalBill);
}

// Open Receipt Modal
viewReceiptBtn.addEventListener('click', () => {
  if (!currentBillData) return;
  populateReceipt(currentBillData);
  receiptModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

// Direct Quick Print
directPrintBtn.addEventListener('click', () => {
  if (!currentBillData) return;
  populateReceipt(currentBillData);
  receiptModal.classList.remove('hidden');
  setTimeout(() => {
    window.print();
  }, 150);
});

// Modal Print Button
modalPrintBtn.addEventListener('click', () => {
  window.print();
});

// Close Modal
closeModalBtn.addEventListener('click', closeReceiptModal);
receiptModal.addEventListener('click', (e) => {
  if (e.target === receiptModal) {
    closeReceiptModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !receiptModal.classList.contains('hidden')) {
    closeReceiptModal();
  }
});

function closeReceiptModal() {
  receiptModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ==========================================================================
// 8. RESET FUNCTIONALITY
// ==========================================================================
resetBtn.addEventListener('click', () => {
  billForm.reset();
  clearFieldErrors();
  hideAlert();
  updateLivePreview();

  currentBillData = null;
  emptyResultCard.classList.remove('hidden');
  resultCard.classList.add('hidden');
});

// ==========================================================================
// 9. ALERT NOTIFICATIONS HELPER
// ==========================================================================
function showAlert(type, message) {
  formAlert.className = `alert-box ${type}`;
  alertIcon.textContent = type === 'error' ? '⚠️' : (type === 'info' ? 'ℹ️' : '✅');
  alertMessage.textContent = message;
  formAlert.classList.remove('hidden');
}

function hideAlert() {
  formAlert.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// ==========================================================================
// 10. INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth();
  updateLivePreview();

  // Periodic heartbeat to keep server connection status live
  setInterval(checkBackendHealth, 10000);
});
