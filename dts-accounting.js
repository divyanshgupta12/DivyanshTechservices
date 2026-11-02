/**
 * DTS Accounting — sales page (Demo | Buy Now | Renew)
 * Setup: ₹8,999 one-time · Renewals: Starter ₹3,999 | Business ₹8,999 | Enterprise ₹11,999
 * Demo: 7 days, one email + one phone, no renew
 */
const DTS_PRICING = {
  setupOneTime: 8999,
  demoDays: 7,
  renewalPlans: {
    Starter: { price: 3999, maxDevices: 1, label: 'Starter' },
    Business: { price: 8999, maxDevices: 2, label: 'Business' },
    Enterprise: { price: 11999, maxDevices: 3, label: 'Enterprise' },
  },
  features: [
    'GST billing (optional)',
    'E-Invoice & E-Way Bill',
    'Tally-style accounting',
    'AI Assistant',
    'GSTR-1 export',
    'Cloud sync via website database',
  ],
};

const DTS_API = '';
let dtsPurchaseTab = 'buy';
let dtsRazorpayEnabled = false;
let dtsRazorpayKey = '';
let dtsSelectedRenewalPlan = 'Starter';

function dtsPlanCardsHtml() {
  return Object.entries(DTS_PRICING.renewalPlans).map(([key, p]) => `
    <label class="flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${dtsSelectedRenewalPlan === key ? 'border-brand-purple bg-brand-purple/10' : 'border-white/10 hover:border-white/20'}">
      <input type="radio" name="dts-renew-plan" value="${key}" ${dtsSelectedRenewalPlan === key ? 'checked' : ''}
        onchange="dtsSelectRenewPlan('${key}')" class="mt-1 accent-brand-purple"/>
      <div class="flex-1">
        <div class="font-bold text-white">${p.label}</div>
        <div class="text-brand-emerald font-semibold">₹${p.price.toLocaleString('en-IN')}/year</div>
        <div class="text-xs text-slate-400">${p.maxDevices} PC license${p.maxDevices > 1 ? 's' : ''}</div>
      </div>
    </label>`).join('');
}

function renderDtsAccountingView() {
  return `
    <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div class="absolute inset-0 z-0">
        <div class="absolute top-0 right-1/4 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-1/4 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl"></div>
      </div>
      <div class="relative z-10 max-w-7xl mx-auto text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-purple/30 mb-6">
          <img src="DTs.png" alt="DTS" class="h-6 w-6 rounded" onerror="this.style.display='none'">
          <span class="text-xs font-semibold text-brand-purple tracking-wider uppercase">Software Product</span>
        </div>
        <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
          DTS <span class="text-gradient">Accounting</span>
        </h2>
        <p class="text-slate-400 max-w-2xl mx-auto text-lg mb-6">
          Future-ready accounting with AI — connects to divyanshtechservices.com database. Windows 10/11 · 64-bit.
        </p>
        <div class="flex flex-wrap justify-center gap-4 text-sm text-slate-300">
          <span><i class="fa-solid fa-check-circle text-brand-emerald mr-1"></i> ₹${DTS_PRICING.setupOneTime.toLocaleString('en-IN')} one-time purchase</span>
          <span><i class="fa-solid fa-check-circle text-brand-emerald mr-1"></i> Renewals from ₹3,999/year</span>
          <span><i class="fa-solid fa-check-circle text-brand-emerald mr-1"></i> 7-day demo available</span>
        </div>
      </div>
    </section>

    <section class="relative z-10 py-4 px-4 sm:px-6 lg:px-8 pb-16">
      <div class="max-w-3xl mx-auto glass rounded-3xl p-8 border border-white/10">
        <div class="grid md:grid-cols-2 gap-4 mb-8">
          ${DTS_PRICING.features.map(f => `
            <div class="flex items-start gap-2 text-sm text-slate-300">
              <i class="fa-solid fa-check text-brand-emerald mt-1"></i><span>${f}</span>
            </div>`).join('')}
        </div>

        <div class="flex flex-col sm:flex-row rounded-xl overflow-hidden border border-white/10 mb-6">
          <button type="button" id="dts-tab-buy" onclick="dtsSwitchPurchaseTab('buy')"
            class="flex-1 py-3 font-bold text-sm transition-all bg-brand-cyan/20 text-brand-cyan border-b sm:border-b-0 sm:border-r border-white/10">
            Buy Now — ₹${DTS_PRICING.setupOneTime.toLocaleString('en-IN')}
          </button>
          <button type="button" id="dts-tab-demo" onclick="dtsSwitchPurchaseTab('demo')"
            class="flex-1 py-3 font-bold text-sm transition-all text-slate-400 hover:bg-white/5 border-b sm:border-b-0 sm:border-r border-white/10">
            Demo (7 Days)
          </button>
          <button type="button" id="dts-tab-renew" onclick="dtsSwitchPurchaseTab('renew')"
            class="flex-1 py-3 font-bold text-sm transition-all text-slate-400 hover:bg-white/5">
            Renew Plan
          </button>
        </div>

        <div id="dts-panel-buy">
          <div class="text-center mb-6 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20">
            <div class="text-3xl font-bold text-white">₹${DTS_PRICING.setupOneTime.toLocaleString('en-IN')}</div>
            <div class="text-sm text-slate-400 mt-1">One-time software purchase · includes 1 year Business plan</div>
            <div class="text-xs text-brand-emerald mt-2">After first year, choose Starter / Business / Enterprise renewal</div>
          </div>
          <p id="dts-mode-label" class="text-xs text-brand-cyan mb-4 text-center">Loading payment...</p>
        </div>

        <div id="dts-panel-demo" class="hidden">
          <div class="text-center mb-6 p-4 rounded-xl bg-brand-emerald/5 border border-brand-emerald/20">
            <div class="text-lg font-bold text-brand-emerald">Free ${DTS_PRICING.demoDays}-Day Demo</div>
            <div class="text-sm text-slate-400 mt-1">One demo per email and phone — cannot be renewed or reused</div>
          </div>
        </div>

        <div id="dts-panel-renew" class="hidden">
          <div class="text-center mb-4 p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/20">
            <div class="text-sm text-slate-300">Annual renewal for existing paid licenses only</div>
            <div class="text-xs text-red-400 mt-1">Demo licenses cannot be renewed</div>
          </div>
          <div id="dts-renew-plans" class="grid gap-3 mb-4">${dtsPlanCardsHtml()}</div>
        </div>

        <div id="dts-fields-buy" class="space-y-3">
          <div class="grid md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Full Name *</label>
              <input id="dts-name" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="Your name" />
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1">Phone *</label>
              <input id="dts-phone" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="10-digit mobile" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Email *</label>
            <input id="dts-email" type="email" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="you@company.com" />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Company Name *</label>
            <input id="dts-company" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="Company / firm name" />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Company Address</label>
            <textarea id="dts-address" rows="2" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="Street, area"></textarea>
          </div>
          <div class="grid md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-slate-400 mb-1">City</label>
              <input id="dts-city" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="City" />
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1">State</label>
              <input id="dts-state" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="State" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">GSTIN (optional)</label>
            <input id="dts-gstin" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="22AAAAA0000A1Z5" />
          </div>
          <label class="flex items-start gap-3 p-3 rounded-xl border border-white/10 cursor-pointer">
            <input id="dts-terms" type="checkbox" class="mt-1 accent-brand-cyan"/>
            <span class="text-xs text-slate-400">I agree to the <button type="button" onclick="switchView('terms')" class="text-brand-cyan underline">Terms & Conditions</button> and authorize Divyansh Tech Services to contact me for software setup and support.</span>
          </label>
        </div>

        <div id="dts-fields-demo" class="hidden space-y-3">
          <div>
            <label class="block text-sm text-slate-400 mb-1">Full Name *</label>
            <input id="dts-demo-name" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="Your name" />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Email *</label>
            <input id="dts-demo-email" type="email" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="you@company.com" />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Phone *</label>
            <input id="dts-demo-phone" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="10-digit mobile (one-time use)" />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Company Name (optional)</label>
            <input id="dts-demo-company" class="w-full px-4 py-3 rounded-xl bg-brand-dark/50 border border-white/10 text-white" placeholder="Company name" />
          </div>
        </div>

        <button id="dts-buy-btn" class="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-lg hover:opacity-90 transition-all">
          Pay ₹${DTS_PRICING.setupOneTime.toLocaleString('en-IN')} — Buy Now
        </button>
        <button id="dts-demo-btn" class="hidden w-full mt-4 py-4 rounded-xl bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/50 font-bold">
          Get Demo License (${DTS_PRICING.demoDays} Days)
        </button>
        <button id="dts-renew-btn" class="hidden w-full mt-4 py-4 rounded-xl bg-brand-purple/20 text-brand-purple border border-brand-purple/50 font-bold">
          Renew — ₹${DTS_PRICING.renewalPlans.Starter.price.toLocaleString('en-IN')}/year
        </button>
        <p id="dts-status" class="mt-4 text-sm hidden"></p>
      </div>

      <div id="dts-success" class="hidden max-w-lg mx-auto mt-8 glass rounded-3xl p-8 border border-brand-emerald/30 bg-brand-emerald/5">
        <h3 class="font-display text-xl font-bold text-brand-emerald mb-2"><i class="fa-solid fa-circle-check mr-2"></i>Thank You!</h3>
        <p id="dts-s-rep" class="text-sm text-brand-cyan mb-4 hidden">Your license key is ready. Our representative will contact you soon to help set up your software.</p>
        <p id="dts-s-demo-note" class="text-sm text-yellow-400 mb-4 hidden">Demo valid for ${DTS_PRICING.demoDays} days only. Cannot be renewed — purchase full software when ready.</p>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between gap-4"><span class="text-slate-400">License key</span><code id="dts-s-key" class="text-brand-cyan break-all text-right"></code></div>
          <div class="flex justify-between gap-4"><span class="text-slate-400">Login email</span><code id="dts-s-email" class="text-white"></code></div>
          <div class="flex justify-between gap-4"><span class="text-slate-400">Password</span><code id="dts-s-pass" class="text-white"></code></div>
          <div id="dts-s-expiry-row" class="hidden flex justify-between gap-4"><span class="text-slate-400">Valid until</span><code id="dts-s-expiry" class="text-white"></code></div>
        </div>
        <p class="text-slate-400 text-sm mt-4">Download, install, and activate with your license key and login credentials.</p>
        <a id="dts-download-link" href="/DTS-Accounting-Setup-x64.exe" download class="block w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold text-center">
          <i class="fa-solid fa-download mr-2"></i>Download Windows App
        </a>
      </div>
    </section>
  `;
}

function dtsSelectRenewPlan(plan) {
  dtsSelectedRenewalPlan = plan;
  const price = DTS_PRICING.renewalPlans[plan]?.price || 3999;
  const renewBtn = document.getElementById('dts-renew-btn');
  if (renewBtn) renewBtn.textContent = `Renew ${plan} — ₹${price.toLocaleString('en-IN')}/year`;
  const plansEl = document.getElementById('dts-renew-plans');
  if (plansEl) plansEl.innerHTML = dtsPlanCardsHtml();
}

function dtsSwitchPurchaseTab(tab) {
  dtsPurchaseTab = tab;
  const status = document.getElementById('dts-status');
  if (status) {
    status.textContent = '';
    status.className = 'mt-4 text-sm hidden';
  }
  const tabs = { buy: 'dts-tab-buy', demo: 'dts-tab-demo', renew: 'dts-tab-renew' };
  const panels = { buy: 'dts-panel-buy', demo: 'dts-panel-demo', renew: 'dts-panel-renew' };
  const fields = { buy: 'dts-fields-buy', demo: 'dts-fields-demo', renew: 'dts-fields-buy' };

  Object.entries(tabs).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const active = key === tab;
    el.classList.toggle('bg-brand-cyan/20', active && key === 'buy');
    el.classList.toggle('text-brand-cyan', active && key === 'buy');
    el.classList.toggle('bg-brand-emerald/20', active && key === 'demo');
    el.classList.toggle('text-brand-emerald', active && key === 'demo');
    el.classList.toggle('bg-brand-purple/20', active && key === 'renew');
    el.classList.toggle('text-brand-purple', active && key === 'renew');
    if (!active) el.classList.add('text-slate-400');
    else el.classList.remove('text-slate-400');
  });

  Object.entries(panels).forEach(([key, id]) => {
    document.getElementById(id)?.classList.toggle('hidden', key !== tab);
  });

  document.getElementById('dts-fields-buy')?.classList.toggle('hidden', tab === 'demo');
  document.getElementById('dts-fields-demo')?.classList.toggle('hidden', tab !== 'demo');

  const buyBtn = document.getElementById('dts-buy-btn');
  const demoBtn = document.getElementById('dts-demo-btn');
  const renewBtn = document.getElementById('dts-renew-btn');
  buyBtn?.classList.toggle('hidden', tab !== 'buy');
  demoBtn?.classList.toggle('hidden', tab !== 'demo');
  renewBtn?.classList.toggle('hidden', tab !== 'renew');

  if (tab === 'demo') {
    demoBtn.onclick = dtsRequestDemo;
  } else if (tab === 'renew') {
    dtsSelectRenewPlan(dtsSelectedRenewalPlan);
    renewBtn.onclick = dtsRenewPay;
  } else if (dtsRazorpayEnabled) {
    buyBtn.onclick = dtsBuyPay;
  }
}

function dtsShowStatus(msg, ok) {
  const el = document.getElementById('dts-status');
  if (!el) return;
  el.classList.remove('hidden');
  el.className = 'mt-4 text-sm ' + (ok ? 'text-brand-emerald' : 'text-brand-danger');
  el.textContent = msg;
}

function dtsShowSuccess(data) {
  document.getElementById('dts-s-key').textContent = data.licenseKey;
  document.getElementById('dts-s-email').textContent = data.email;
  document.getElementById('dts-s-pass').textContent = data.password || 'Client@123';

  const rep = document.getElementById('dts-s-rep');
  const demoNote = document.getElementById('dts-s-demo-note');
  const expiryRow = document.getElementById('dts-s-expiry-row');

  if (data.isDemo) {
    rep?.classList.add('hidden');
    demoNote?.classList.remove('hidden');
    if (data.expiresUtc && expiryRow) {
      expiryRow.classList.remove('hidden');
      document.getElementById('dts-s-expiry').textContent = new Date(data.expiresUtc).toLocaleDateString();
    }
  } else if (data.representativeMessage) {
    rep?.classList.remove('hidden');
    demoNote?.classList.add('hidden');
    expiryRow?.classList.add('hidden');
  } else if (data.renewed) {
    rep?.classList.add('hidden');
    demoNote?.classList.add('hidden');
    expiryRow?.classList.add('hidden');
    dtsShowStatus('Subscription renewed successfully!', true);
  } else {
    rep?.classList.remove('hidden');
    demoNote?.classList.add('hidden');
  }

  document.getElementById('dts-success').classList.remove('hidden');
  if (!data.renewed) dtsShowStatus(data.message || 'Complete! Save your credentials.', true);
  window.scrollTo({ top: document.getElementById('dts-success').offsetTop - 80, behavior: 'smooth' });
}

async function dtsApiPost(path, body) {
  const res = await fetch(DTS_API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function dtsGetBuyForm() {
  return {
    name: document.getElementById('dts-name')?.value?.trim(),
    email: document.getElementById('dts-email')?.value?.trim(),
    phone: document.getElementById('dts-phone')?.value?.trim(),
    companyName: document.getElementById('dts-company')?.value?.trim(),
    companyAddress: document.getElementById('dts-address')?.value?.trim(),
    city: document.getElementById('dts-city')?.value?.trim(),
    state: document.getElementById('dts-state')?.value?.trim(),
    gstin: document.getElementById('dts-gstin')?.value?.trim(),
    agreedTerms: !!document.getElementById('dts-terms')?.checked,
  };
}

function dtsValidateBuyForm(f) {
  if (!f.name || !f.email || !f.phone || !f.companyName) {
    dtsShowStatus('Fill all required fields: name, email, phone, company', false);
    return false;
  }
  if (f.phone.replace(/\D/g, '').length < 10) {
    dtsShowStatus('Enter a valid 10-digit phone number', false);
    return false;
  }
  if (!f.agreedTerms) {
    dtsShowStatus('You must agree to Terms & Conditions', false);
    return false;
  }
  return true;
}

async function dtsRequestDemo() {
  const email = document.getElementById('dts-demo-email')?.value?.trim();
  const name = document.getElementById('dts-demo-name')?.value?.trim();
  const phone = document.getElementById('dts-demo-phone')?.value?.trim();
  const companyName = document.getElementById('dts-demo-company')?.value?.trim();
  if (!name || !email || !phone) {
    dtsShowStatus('Name, email, and phone are required for demo', false);
    return;
  }
  if (phone.replace(/\D/g, '').length < 10) {
    dtsShowStatus('Enter a valid 10-digit phone number', false);
    return;
  }
  try {
    dtsShowStatus('Generating demo license...', true);
    const res = await dtsApiPost('/api/orders/demo', {
      email, customerName: name, phone, companyName: companyName || null,
    });
    if (res.success && res.licenseKey) dtsShowSuccess(res);
    else dtsShowStatus(res.error || 'Failed', false);
  } catch (e) {
    dtsShowStatus(e.message, false);
  }
}

function dtsLoadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof Razorpay !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay'));
    document.head.appendChild(s);
  });
}

async function dtsRazorpayPay({ purchaseType, amount, description, extraBody }) {
  const f = dtsGetBuyForm();
  const isRenewal = purchaseType === 'renewal';

  if (!f.name || !f.email || !f.phone) {
    dtsShowStatus('Name, email, and phone are required', false);
    return;
  }
  if (f.phone.replace(/\D/g, '').length < 10) {
    dtsShowStatus('Enter a valid 10-digit phone number', false);
    return;
  }
  if (!isRenewal && !dtsValidateBuyForm(f)) return;

  if (!dtsRazorpayKey) {
    dtsShowStatus('Razorpay not configured — set RAZORPAY_KEY_ID on Netlify', false);
    return;
  }

  try {
    await dtsLoadRazorpayScript();
  } catch (e) {
    dtsShowStatus(e.message, false);
    return;
  }

  const rzp = new Razorpay({
    key: dtsRazorpayKey,
    amount: amount * 100,
    currency: 'INR',
    name: 'Divyansh Tech Services',
    description,
    prefill: { name: f.name, email: f.email, contact: f.phone },
    notes: { purchaseType, company: f.companyName },
    handler: async (response) => {
      try {
        dtsShowStatus('Confirming payment...', true);
        const res = await dtsApiPost('/api/orders/complete', {
          paymentId: response.razorpay_payment_id,
          purchaseType,
          email: f.email,
          customerName: f.name,
          phone: f.phone,
          companyName: f.companyName || f.name,
          companyAddress: f.companyAddress,
          city: f.city,
          state: f.state,
          gstin: f.gstin,
          agreedTerms: isRenewal ? true : f.agreedTerms,
          ...extraBody,
        });
        if (res.success && res.licenseKey) dtsShowSuccess(res);
        else dtsShowStatus(res.error || 'License failed', false);
      } catch (e) {
        dtsShowStatus(e.message, false);
      }
    },
    modal: { ondismiss: () => dtsShowStatus('Payment cancelled', false) },
  });
  rzp.open();
}

function dtsBuyPay() {
  dtsRazorpayPay({
    purchaseType: 'setup',
    amount: DTS_PRICING.setupOneTime,
    description: `DTS Accounting — One-time purchase ₹${DTS_PRICING.setupOneTime}`,
  });
}

function dtsRenewPay() {
  const plan = dtsSelectedRenewalPlan;
  const price = DTS_PRICING.renewalPlans[plan]?.price || 3999;
  dtsRazorpayPay({
    purchaseType: 'renewal',
    amount: price,
    description: `DTS Accounting ${plan} renewal — ₹${price}`,
    extraBody: { plan },
  });
}

async function initDtsAccountingPage() {
  dtsPurchaseTab = 'buy';
  dtsSelectedRenewalPlan = 'Starter';
  const buyBtn = document.getElementById('dts-buy-btn');
  const demoBtn = document.getElementById('dts-demo-btn');
  const modeLabel = document.getElementById('dts-mode-label');

  try {
    const cfg = await fetch(DTS_API + '/api/orders/razorpay/config').then(r => r.json());
    dtsRazorpayEnabled = cfg.enabled;
    dtsRazorpayKey = cfg.keyId || '';
    if (cfg.pricing) {
      DTS_PRICING.setupOneTime = cfg.pricing.setupOneTime || DTS_PRICING.setupOneTime;
      DTS_PRICING.demoDays = cfg.pricing.demoDays || DTS_PRICING.demoDays;
      if (cfg.pricing.renewalPlans) DTS_PRICING.renewalPlans = cfg.pricing.renewalPlans;
    }
  } catch {
    dtsRazorpayEnabled = false;
  }

  if (demoBtn) demoBtn.onclick = dtsRequestDemo;

  if (dtsRazorpayEnabled && dtsRazorpayKey) {
    modeLabel.textContent = 'Secure Razorpay checkout · your details are saved to our database';
    buyBtn.onclick = dtsBuyPay;
    buyBtn.textContent = `Pay ₹${DTS_PRICING.setupOneTime.toLocaleString('en-IN')} — Buy Now`;
    buyBtn.classList.remove('hidden');
  } else {
    modeLabel.textContent = 'Add RAZORPAY_KEY_ID in Netlify to enable live payments. Demo works without payment.';
    buyBtn.classList.add('hidden');
  }

  dtsSwitchPurchaseTab('buy');
}

const DTS_SOFTWARE_PRODUCTS = [
  {
    id: 'dts-accounting',
    name: 'DTS Accounting',
    version: '1.0.1',
    platform: 'Windows 10/11 · 64-bit',
    summary: 'GST billing, e-invoice, e-way bill, Tally-style accounts, GSTR-1 export, and an AI assistant. One-time purchase includes 1 year of the Business plan.',
    priceLabel: '₹8,999 one-time · renewals from ₹3,999/year',
    action: 'accounting',
    downloadUrl: '/DTS-Accounting-Setup-x64.exe',
  },
  {
    id: 'dts-mandi-haryana',
    name: 'DTS Mandi ERP — Haryana Edition',
    version: '1.3.5',
    platform: 'Windows · offline-first',
    summary: 'Grain-trader ERP for Haryana mandis: purchase (J Form), sale (I Form), stock, ledger, and trading margin. English UI on desktop.',
    releaseNotes: 'v1.3.5 — choose your data folder, safer migrate/restore (empty zips never wipe books), faster firm open, Outstanding links to Advances, and print/backup errors shown clearly.',
    installedHint: 'Already installed? Open DTS MANDI ERP → Update now. You do not download again from this page.',
    downloadUrl: '/DTS-Mandi-Haryana-x64.zip?v=1.3.5',
  },
];

function renderDtsSoftwareView() {
  return `
    <section class="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-10">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-brand-purple/30 mb-6">
            <img src="DTs.png" alt="DTS" class="h-6 w-6 rounded" onerror="this.style.display='none'">
            <span class="text-xs font-semibold text-brand-purple tracking-wider uppercase">Software</span>
          </div>
          <h2 class="font-display text-4xl sm:text-5xl font-bold text-white mb-4">DTS <span class="text-gradient">Software</span></h2>
          <p class="text-slate-400 max-w-2xl mx-auto text-lg">Current desktop products. Installed apps pick up newer builds from inside the app.</p>
        </div>
        <div id="dts-software-feed" class="mb-6"></div>
        <div id="dts-software-list" class="grid gap-6"></div>
      </div>
    </section>
  `;
}

function dtsSoftwareCard(product) {
  const notes = product.releaseNotes
    ? `<p class="text-sm text-slate-300 mt-3">${product.releaseNotes}</p>`
    : '';
  const hint = product.installedHint
    ? `<p class="text-sm text-brand-emerald mt-3">${product.installedHint}</p>`
    : '';
  const action = product.action === 'accounting' || product.id === 'dts-accounting'
    ? `<button type="button" onclick="switchView('dts-accounting')" class="mt-5 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-emerald text-brand-dark font-bold">Buy, demo, or renew</button>`
    : `<p class="text-xs text-slate-500 mt-5">Installer: <code class="text-brand-cyan">${product.downloadUrl || 'not published'}</code></p>`;
  return `
    <article class="glass rounded-3xl p-6 sm:p-8 border border-white/10 text-left">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <h3 class="font-display text-2xl font-bold text-white">${product.name}</h3>
        <span class="px-3 py-1 rounded-full bg-brand-cyan/15 text-brand-cyan text-xs font-bold">v${product.version || '—'}</span>
      </div>
      <p class="text-xs uppercase tracking-wider text-slate-500 mb-3">${product.platform || ''}</p>
      <p class="text-slate-300">${product.summary || ''}</p>
      ${product.priceLabel ? `<p class="text-brand-emerald font-semibold mt-3">${product.priceLabel}</p>` : ''}
      ${notes}
      ${hint}
      ${action}
    </article>
  `;
}

async function initDtsSoftwarePage() {
  const list = document.getElementById('dts-software-list');
  const feed = document.getElementById('dts-software-feed');
  if (!list) return;

  let products = DTS_SOFTWARE_PRODUCTS;
  try {
    const res = await fetch('/software-catalog.json', { cache: 'no-store' });
    if (res.ok) {
      const catalog = await res.json();
      if (Array.isArray(catalog.products) && catalog.products.length) products = catalog.products;
    }
  } catch { /* built-in list */ }

  list.innerHTML = products.map(dtsSoftwareCard).join('');

  if (!feed) return;
  try {
    const remote = await fetch('/api/app/update?softwareId=dts-mandi-haryana', { cache: 'no-store' }).then((r) => r.json());
    const advertised = String(remote.version || '');
    const url = String(remote.downloadUrl || '');
    const mandi = products.find((p) => p.id === 'dts-mandi-haryana');
    const expected = mandi?.version || '1.3.5';
    const pointsAtMandi = /mandi/i.test(url);
    if (advertised === expected && pointsAtMandi) {
      feed.innerHTML = `<div class="rounded-2xl border border-brand-emerald/40 bg-brand-emerald/10 px-4 py-3 text-sm text-brand-emerald">In-app updates are publishing Mandi v${advertised}.</div>`;
    } else {
      feed.innerHTML = `<div class="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">This page lists Mandi v${expected}. The public update feed is still on v${advertised || 'unknown'}${pointsAtMandi ? '' : ', and it still points at the accounting installer'}. Publish <code>version-mandi.js</code> and <code>DTS-Mandi-Haryana-x64.zip</code> for installed Mandi apps to receive v${expected}.</div>`;
    }
  } catch {
    feed.innerHTML = '';
  }
}
