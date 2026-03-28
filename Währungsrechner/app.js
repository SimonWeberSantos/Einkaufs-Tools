'use strict';

// Single point of change: swap this URL to route through the .NET backend later.
const API_BASE = 'https://api.frankfurter.app';

const CURRENCIES = ['CHF', 'EUR', 'USD'];

// Exchange rates keyed by currency code, relative to EUR as base.
let rates = {};

async function fetchRates() {
  const res = await fetch(`${API_BASE}/latest?from=EUR&to=CHF,USD`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  rates = { EUR: 1, ...data.rates };
  renderRates(data.date);
}

function renderRates(date) {
  document.getElementById('rate-date').textContent = `(Stand: ${date})`;

  const pairs = [
    ['eur', 'chf', rates.CHF],
    ['eur', 'usd', rates.USD],
    ['chf', 'eur', 1 / rates.CHF],
    ['chf', 'usd', rates.USD / rates.CHF],
    ['usd', 'eur', 1 / rates.USD],
    ['usd', 'chf', rates.CHF / rates.USD],
  ];
  pairs.forEach(([from, to, value]) => {
    document.getElementById(`rate-${from}-${to}`).textContent = value.toFixed(4);
  });
}

function convertFrom(sourceCurrency, rawValue) {
  const value = parseFloat(rawValue);
  CURRENCIES.forEach(c => {
    if (c === sourceCurrency) return;
    const el = document.getElementById(`input-${c}`);
    if (isNaN(value) || rawValue === '') {
      el.value = '';
    } else {
      const inEur = value / rates[sourceCurrency];
      el.value = (inEur * rates[c]).toFixed(2);
    }
  });
}

function setupInputs() {
  CURRENCIES.forEach(currency => {
    document.getElementById(`input-${currency}`).addEventListener('input', function () {
      convertFrom(currency, this.value);
    });
  });
}

async function init() {
  try {
    await fetchRates();
    setupInputs();
  } catch {
    const el = document.getElementById('error-msg');
    el.textContent = 'Wechselkurse konnten nicht geladen werden. Bitte Seite neu laden.';
  }
}

init();
