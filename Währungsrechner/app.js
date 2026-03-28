// =================================================================
// Datei:    Währungsrechner/app.js
// Zweck:    Wechselkurse von der Frankfurter API laden und die
//           bidirektionale Umrechnung zwischen CHF, EUR und USD
//           in Echtzeit berechnen.
// API:      https://api.frankfurter.app (öffentlich, kein Key nötig)
//           → API_BASE austauschen, um später das .NET-Backend
//             als Proxy zu nutzen.
// =================================================================

'use strict';

// ─── Konfiguration ────────────────────────────────────────────────

// Einzige Stelle, die beim Wechsel auf das .NET-Backend angepasst wird
const API_BASE = 'https://api.frankfurter.app';

const CURRENCIES = ['CHF', 'EUR', 'USD'];

// Wechselkurse relativ zu EUR als Basiswährung (wird beim Laden befüllt)
let rates = {};


// ─── API-Aufruf ───────────────────────────────────────────────────

async function fetchRates() {
  const res = await fetch(`${API_BASE}/latest?from=EUR&to=CHF,USD`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // EUR selbst hat immer den Faktor 1
  rates = { EUR: 1, ...data.rates };
  renderRates(data.date);
}


// ─── Wechselkurs-Tabelle befüllen ─────────────────────────────────

function renderRates(date) {
  document.getElementById('rate-date').textContent = `(Stand: ${date})`;

  // Alle 6 Richtungen (3 Währungen × 2) aus den geladenen Kursen berechnen
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


// ─── Umrechnung ───────────────────────────────────────────────────

// Rechnet von sourceCurrency in alle anderen Währungen um.
// Zwischenschritt über EUR vermeidet direkte Kreuzkurs-Tabellen.
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


// ─── Input-Events ─────────────────────────────────────────────────

function setupInputs() {
  CURRENCIES.forEach(currency => {
    document.getElementById(`input-${currency}`).addEventListener('input', function () {
      convertFrom(currency, this.value);
    });
  });
}


// ─── Initialisierung ──────────────────────────────────────────────

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
