// =================================================================
// Datei:    Granulat-Gewichtsrechner/app.js
// Zweck:    Stammdaten aus granulat.json laden, Desktop-Tabelle und
//           Mobile-Card-UI dynamisch rendern. Beide Layouts teilen
//           denselben State — ein Viewport-Wechsel verliert keine
//           Eingaben.
//
// Datenfluss:
//   User-Aktion → setState(rid, qty) → renderAll()
//                                        ├── renderDesktop()
//                                        └── renderMobile()
//
// Daten:    data/granulat.json — einzige Stelle für Gewichte und
//           Produkt-Namen, kein Hardcoding im JS.
// =================================================================

'use strict';

// ─── Konfiguration ────────────────────────────────────────────────

const DATA_URL = 'data/granulat.json';


// ─── Zentraler State (gemeinsam für Desktop & Mobile) ─────────────

// rowMeta: Map<rid, { pIdx, productName, size, materialName, weight }>
// Wird einmalig in buildRows() befüllt und danach nie verändert.
const rowMeta = new Map();

// state: { [rid]: qty }  — qty ist immer ≥ 0
// Einzige Stelle, die bei Nutzereingaben mutiert wird.
const state = {};

function getQty(rid)          { return state[rid] || 0; }
function toIdPart(name)       { return name.replace(/\s+/g, '_'); }

// Materialien in der Reihenfolge ihres ersten Auftretens (für Totale)
function getMaterialOrder() {
  const seen = new Set();
  const order = [];
  rowMeta.forEach(meta => {
    if (!seen.has(meta.materialName)) { seen.add(meta.materialName); order.push(meta.materialName); }
  });
  return order;
}

// Granulat-Bedarf pro Material aus dem aktuellen State berechnen
function computeTotals() {
  const totals = {};
  rowMeta.forEach((meta, rid) => {
    const g = getQty(rid) * meta.weight;
    totals[meta.materialName] = (totals[meta.materialName] || 0) + g;
  });
  return totals;
}


// ─── JSON laden ───────────────────────────────────────────────────

async function fetchData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


// ─── State-Mutation (einziger Schreibpunkt) ───────────────────────

function setState(rid, qty) {
  state[rid] = Math.max(0, parseInt(qty, 10) || 0);
  renderAll();
}


// ─── Beide Layouts synchron halten ────────────────────────────────

// Wird nach jeder State-Änderung aufgerufen.
// Beide Layouts sind immer im DOM — CSS zeigt/versteckt sie.
function renderAll() {
  renderDesktop();
  renderMobile();
  updateCopyButtons();
}


// =================================================================
// DESKTOP-LAYOUT
// =================================================================

// ─── Desktop-Tabelle einmalig aufbauen ────────────────────────────

// Befüllt tbody, totals-tbody und rowMeta aus den JSON-Daten.
function buildRows(data) {
  const tbody      = document.getElementById('table-body');
  const totalsBody = document.getElementById('totals-body');
  const seenMaterials = [];
  const seenSet = new Set();
  let rid = 0;

  data.products.forEach((product, pIdx) => {
    product.sizes.forEach(size => {
      const sizeKey = size.toString();
      product.materials.forEach(material => {
        if (!(sizeKey in material.weights)) return;

        const weight = material.weights[sizeKey];
        rowMeta.set(rid, { pIdx, productName: product.name, size, materialName: material.name, weight });
        state[rid] = 0;

        const tr = document.createElement('tr');
        tr.innerHTML =
          `<td>${product.name}</td>` +
          `<td class="cell-center">${size}</td>` +
          `<td>${material.name}</td>` +
          `<td class="cell-input">` +
            `<input type="number" id="qty-${rid}" min="0" step="1" value="0"` +
              ` data-rid="${rid}"` +
              ` aria-label="Stückzahl ${product.name} ${size} ${material.name}">` +
          `</td>` +
          `<td class="cell-center">${weight.toFixed(2)}</td>` +
          `<td class="cell-right" id="granulat-${rid}">0.00</td>`;
        tbody.appendChild(tr);

        if (!seenSet.has(material.name)) {
          seenSet.add(material.name);
          seenMaterials.push(material.name);
        }
        rid++;
      });
    });
  });

  seenMaterials.forEach(name => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${name}</td>` +
      `<td class="cell-right" id="total-${toIdPart(name)}">0.00</td>`;
    totalsBody.appendChild(tr);
  });
}

// ─── Desktop-Ansicht aus State neu zeichnen ───────────────────────

function renderDesktop() {
  const totals = computeTotals();

  rowMeta.forEach((meta, rid) => {
    const qty = getQty(rid);

    // Granulat-Zelle aktualisieren
    const granulatEl = document.getElementById(`granulat-${rid}`);
    if (granulatEl) granulatEl.textContent = (qty * meta.weight).toFixed(2);

    // Input synchronisieren (z.B. nach Änderung via Mobile)
    const input = document.getElementById(`qty-${rid}`);
    if (input && parseInt(input.value, 10) !== qty) input.value = qty;
  });

  // Material-Totale aktualisieren
  getMaterialOrder().forEach(name => {
    const el = document.getElementById(`total-${toIdPart(name)}`);
    if (el) el.textContent = (totals[name] || 0).toFixed(2);
  });
}

// ─── Desktop-Input-Events (Event-Delegation) ─────────────────────

function setupDesktopEvents() {
  document.getElementById('table-body').addEventListener('input', e => {
    if (!e.target.matches('input[type="number"]')) return;
    const rid = parseInt(e.target.dataset.rid, 10);
    setState(rid, e.target.value); // → renderAll()
  });
}


// =================================================================
// MOBILE-LAYOUT
// =================================================================

let mData   = null; // Referenz auf JSON-Daten für Dropdown-Logik
let editRid = -1;   // -1 = neuer Eintrag, ≥ 0 = Bearbeitung von rid


// ─── Grössen-Dropdown neu befüllen ───────────────────────────────

function repopulateSizes(pIdx) {
  const sizeSel = document.getElementById('m-select-size');
  sizeSel.innerHTML = '';
  if (!mData) return;
  mData.products[pIdx].sizes.forEach(size => {
    const opt = document.createElement('option');
    opt.value = size;
    opt.textContent = size;
    sizeSel.appendChild(opt);
  });
}

// ─── Material-Dropdown neu befüllen ──────────────────────────────

function repopulateMaterials(pIdx, size) {
  const matSel = document.getElementById('m-select-material');
  matSel.innerHTML = '';
  if (!mData) return;
  const sizeKey = size.toString();
  mData.products[pIdx].materials.forEach(mat => {
    if (!(sizeKey in mat.weights)) return;
    const opt = document.createElement('option');
    opt.value = mat.name;
    opt.textContent = mat.name;
    matSel.appendChild(opt);
  });
}

// ─── Selects kaskadierend auf eine bestimmte Kombination setzen ───

function setMobileSelectCascade(pIdx, size, materialName) {
  document.getElementById('m-select-product').value = pIdx;
  repopulateSizes(pIdx);
  document.getElementById('m-select-size').value = size;
  repopulateMaterials(pIdx, size);
  document.getElementById('m-select-material').value = materialName;
}

// ─── Mobile-Selects einmalig aufbauen + Cascade-Listener ─────────

function buildMobileSelects(data) {
  mData = data;
  const productSel = document.getElementById('m-select-product');

  data.products.forEach((product, pIdx) => {
    const opt = document.createElement('option');
    opt.value = pIdx;
    opt.textContent = product.name;
    productSel.appendChild(opt);
  });

  // Initiale Kaskade: erstes Produkt, erste Grösse
  repopulateSizes(0);
  repopulateMaterials(0, data.products[0].sizes[0]);

  // Produkt wechseln → Grössen + Materialien neu befüllen, Edit-Modus abbrechen
  productSel.addEventListener('change', () => {
    const pIdx = parseInt(productSel.value, 10);
    repopulateSizes(pIdx);
    repopulateMaterials(pIdx, parseInt(document.getElementById('m-select-size').value, 10));
    cancelEditMode();
  });

  // Grösse wechseln → Materialien neu befüllen, Edit-Modus abbrechen
  document.getElementById('m-select-size').addEventListener('change', () => {
    const pIdx = parseInt(productSel.value, 10);
    repopulateMaterials(pIdx, parseInt(document.getElementById('m-select-size').value, 10));
    cancelEditMode();
  });
}

// ─── Edit-Modus-Verwaltung ────────────────────────────────────────

// Nur Marker und Button-Text zurücksetzen (Qty bleibt — Nutzer kann weiterbrowsen)
function cancelEditMode() {
  editRid = -1;
  document.getElementById('m-btn-confirm').textContent = 'Übernehmen';
}

// Nach Bestätigung: Marker + Qty + Button zurücksetzen
function resetAfterConfirm() {
  editRid = -1;
  document.getElementById('m-input-qty').value = '';
  document.getElementById('m-btn-confirm').textContent = 'Übernehmen';
}


// ─── rid aus aktueller Formular-Auswahl suchen ───────────────────

function findRid(pIdx, size, materialName) {
  for (const [rid, meta] of rowMeta) {
    if (meta.pIdx === pIdx && meta.size === size && meta.materialName === materialName) return rid;
  }
  return null;
}


// ─── Mobile-Eintrags-Liste rendern ────────────────────────────────

function renderMobileEntries() {
  const list   = document.getElementById('m-entry-list');
  const active = [];
  rowMeta.forEach((meta, rid) => { if (getQty(rid) > 0) active.push({ rid, ...meta }); });

  if (active.length === 0) {
    list.innerHTML =
      '<li class="m-entry--empty">Noch keine Einträge. ' +
      'Produkt, Grösse und Material auswählen, Stückzahl eingeben und «Übernehmen» tippen.</li>';
    return;
  }

  list.innerHTML = active.map(({ rid, productName, size, materialName, weight }) => {
    const qty      = getQty(rid);
    const granulat = (qty * weight).toFixed(2);
    // \u202f = schmales geschütztes Leerzeichen (Tausendertrennzeichen-Konvention)
    return (
      '<li>' +
        '<span class="m-entry__label">' +
          `${productName}<br>` +
          `<small>${size}\u202fmm\u202f·\u202f${materialName}</small><br>` +
          `<span class="m-entry__qty">${qty}\u202f×\u202f${weight.toFixed(2)}\u202fkg\u202f=\u202f<strong>${granulat}\u202fkg</strong></span>` +
        '</span>' +
        `<button class="m-entry__btn" data-action="edit" data-rid="${rid}" aria-label="Bearbeiten">&#9998;</button>` +
        `<button class="m-entry__btn m-entry__btn--delete" data-action="delete" data-rid="${rid}" aria-label="Löschen">&times;</button>` +
      '</li>'
    );
  }).join('');
}

// ─── Mobile-Gesamtbedarf rendern ──────────────────────────────────

function renderMobileTotals() {
  const container = document.getElementById('m-totals');
  const hasEntries = [...rowMeta.keys()].some(rid => getQty(rid) > 0);

  if (!hasEntries) { container.innerHTML = ''; return; }

  const totals = computeTotals();
  container.innerHTML = getMaterialOrder()
    .filter(name => (totals[name] || 0) > 0)
    .map(name =>
      '<div class="m-totals__row">' +
        `<span class="m-totals__label">${name}</span>` +
        `<span class="m-totals__value">${totals[name].toFixed(2)}\u202fkg</span>` +
      '</div>'
    ).join('');
}

// ─── Mobile komplett neu zeichnen ─────────────────────────────────

function renderMobile() {
  renderMobileEntries();
  renderMobileTotals();
}

// ─── Mobile-Events ────────────────────────────────────────────────

function setupMobileEvents() {

  // Übernehmen-Button
  document.getElementById('m-btn-confirm').addEventListener('click', () => {
    const qty = parseInt(document.getElementById('m-input-qty').value, 10) || 0;

    if (editRid >= 0) {
      // Bearbeitungs-Modus: bestehenden Eintrag überschreiben
      setState(editRid, qty);
    } else {
      // Neu-Eingabe-Modus: rid aus aktueller Formular-Auswahl ermitteln
      const pIdx         = parseInt(document.getElementById('m-select-product').value, 10);
      const size         = parseInt(document.getElementById('m-select-size').value, 10);
      const materialName = document.getElementById('m-select-material').value;
      const rid          = findRid(pIdx, size, materialName);
      if (rid !== null) setState(rid, qty);
    }

    resetAfterConfirm();
  });

  // Bearbeiten / Löschen — Event-Delegation auf der Eintrags-Liste
  document.getElementById('m-entry-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const rid = parseInt(btn.dataset.rid, 10);

    if (btn.dataset.action === 'delete') {
      setState(rid, 0);                     // → renderAll()
      if (editRid === rid) cancelEditMode(); // laufende Bearbeitung abbrechen
    }

    if (btn.dataset.action === 'edit') {
      const meta = rowMeta.get(rid);
      setMobileSelectCascade(meta.pIdx, meta.size, meta.materialName);
      document.getElementById('m-input-qty').value        = getQty(rid);
      document.getElementById('m-btn-confirm').textContent = 'Speichern';
      editRid = rid;
      // Eingabe-Card in den sichtbaren Bereich scrollen
      document.getElementById('m-card-input').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}


// =================================================================
// ERGEBNIS KOPIEREN (Word / Outlook)
// =================================================================

// ─── Kopierbaren Inhalt aufbauen ──────────────────────────────────

// Gibt { html, plain } zurück:
//   html  — HTML-Tabelle mit Inline-Styles (Word/Outlook-kompatibel)
//   plain — Tabulatoren-getrennter Text als Fallback
function buildCopyContent() {
  const date = new Date().toLocaleDateString('de-CH');

  const activeRows = [];
  rowMeta.forEach((meta, rid) => {
    if (getQty(rid) > 0) activeRows.push({ rid, ...meta, qty: getQty(rid) });
  });

  const totals          = computeTotals();
  const activeMaterials = getMaterialOrder().filter(n => (totals[n] || 0) > 0);

  // ── HTML-Tabelle (inline Styles für Word/Outlook) ──────────────
  const tdStyle = 'padding:4px 8px;border:1px solid #cfd8dc;font-family:Calibri,Arial,sans-serif;font-size:11pt;';
  const thStyle = tdStyle + 'background:#d4f0d6;color:#1b5e20;font-weight:bold;';

  const htmlDataRows = activeRows.map(r => {
    const granulat = (r.qty * r.weight).toFixed(2);
    return (
      `<tr>` +
        `<td style="${tdStyle}">${r.productName}</td>` +
        `<td style="${tdStyle}">${r.size} mm</td>` +
        `<td style="${tdStyle}">${r.materialName}</td>` +
        `<td style="${tdStyle};text-align:right;">${r.qty}</td>` +
        `<td style="${tdStyle};text-align:right;">${r.weight.toFixed(2)}</td>` +
        `<td style="${tdStyle};text-align:right;font-weight:bold;">${granulat}</td>` +
      `</tr>`
    );
  }).join('');

  const htmlTotalRows = activeMaterials.map(name =>
    `<tr>` +
      `<td colspan="5" style="${tdStyle}color:#757575;">${name}</td>` +
      `<td style="${tdStyle};text-align:right;font-weight:bold;color:#1b5e20;">${totals[name].toFixed(2)} kg</td>` +
    `</tr>`
  ).join('');

  const html =
    `<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">` +
      `<thead>` +
        `<tr>` +
          `<th style="${thStyle}">Produkt</th>` +
          `<th style="${thStyle}">Grösse</th>` +
          `<th style="${thStyle}">Material</th>` +
          `<th style="${thStyle};text-align:right;">Stückzahl</th>` +
          `<th style="${thStyle};text-align:right;">kg&nbsp;/&nbsp;Stück</th>` +
          `<th style="${thStyle};text-align:right;">Granulat (kg)</th>` +
        `</tr>` +
      `</thead>` +
      `<tbody>${htmlDataRows}</tbody>` +
      `<tbody>` +
        `<tr><td colspan="6" style="${thStyle}">Gesamtbedarf pro Material</td></tr>` +
        `${htmlTotalRows}` +
      `</tbody>` +
    `</table>`;

  // ── Nur HTML-Tabelle ohne umgebenden Text: Word/Outlook nehmen sie direkt ──

  // ── Plaintext-Fallback (tab-getrennt, funktioniert in einfachen Editoren) ──
  const plain = [
    `Granulat-Berechnung (${date})`,
    '',
    ['Produkt', 'Grösse', 'Material', 'Stückzahl', 'kg/Stück', 'Granulat (kg)'].join('\t'),
    ...activeRows.map(r =>
      [r.productName, `${r.size} mm`, r.materialName, r.qty, r.weight.toFixed(2), (r.qty * r.weight).toFixed(2)].join('\t')
    ),
    '',
    'Gesamtbedarf pro Material',
    ...activeMaterials.map(name => `${name}\t\t\t\t\t${totals[name].toFixed(2)} kg`)
  ].join('\n');

  return { html, plain };
}


// ─── In Zwischenablage schreiben ──────────────────────────────────

async function copyResults(buttonEl) {
  const hasEntries = [...rowMeta.keys()].some(rid => getQty(rid) > 0);
  if (!hasEntries) return;

  const { html, plain } = buildCopyContent();

  try {
    // Clipboard API mit HTML-Format (Word/Outlook rendernd die Tabelle direkt)
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html':  new Blob([html],  { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' })
      })
    ]);
  } catch {
    // Fallback: nur Plaintext (ältere Browser / fehlende Berechtigung)
    try {
      await navigator.clipboard.writeText(plain);
    } catch {
      return; // Stille Fehlerbehandlung — kein Absturz
    }
  }

  // Visuelles Feedback: Button kurz als "Kopiert!" anzeigen
  const origText = buttonEl.textContent;
  buttonEl.textContent = '✓ Kopiert!';
  buttonEl.classList.add('copy-btn--success');
  buttonEl.disabled = true;
  setTimeout(() => {
    buttonEl.textContent = origText;
    buttonEl.classList.remove('copy-btn--success');
    buttonEl.disabled = false;
  }, 2000);
}


// ─── Kopier-Buttons aktivieren / deaktivieren ─────────────────────

function updateCopyButtons() {
  const hasEntries = [...rowMeta.keys()].some(rid => getQty(rid) > 0);
  ['copy-btn-desktop', 'copy-btn-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !hasEntries;
  });
}


// ─── Ladezustand ──────────────────────────────────────────────────

function setLoading(isLoading) {
  document.getElementById('loading-msg').hidden = !isLoading;
}

function showContent() {
  document.getElementById('content-wrapper').hidden = false;
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
}


// ─── Initialisierung ──────────────────────────────────────────────

async function init() {
  setLoading(true);
  try {
    const data = await fetchData();
    buildRows(data);           // Desktop-Tabelle + rowMeta aufbauen
    buildMobileSelects(data);  // Mobile-Dropdowns befüllen + Cascade-Listener
    setupDesktopEvents();      // Desktop-Input-Delegation
    setupMobileEvents();       // Mobile-Confirm + Eintrags-Delegation

    // Kopier-Buttons verdrahten (beide rufen dieselbe Funktion auf)
    document.getElementById('copy-btn-desktop').addEventListener('click', function () { copyResults(this); });
    document.getElementById('copy-btn-mobile').addEventListener('click',  function () { copyResults(this); });

    showContent();
    renderAll();               // Initialdarstellung (alle Werte = 0)
  } catch {
    showError('Stammdaten konnten nicht geladen werden. Bitte Seite neu laden.');
  } finally {
    setLoading(false);
  }
}

init();
