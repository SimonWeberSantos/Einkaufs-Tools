// =================================================================
// Datei:    base/app.js
// Zweck:    Basis-Script für alle Tool-Unterseiten (body.has-aside).
//           Aufgaben:
//             1. Sidebar aus dem TOOLS-Register rendern
//             2. Aktiven Link anhand der aktuellen URL markieren
//             3. Mobiles Hamburger-Drawer-Menü initialisieren
// Benötigt: base/tools.js muss vor diesem Script geladen sein.
// =================================================================

'use strict';


// ─── Sidebar rendern ──────────────────────────────────────────────

function renderSidebar() {
  const aside = document.querySelector('aside');
  if (!aside) return;

  // Aktuellen Tool-Ordner aus der URL auslesen (vorletztes Pfad-Segment)
  const currentFolder = decodeURIComponent(window.location.pathname).split('/').at(-2);

  const toolLinks = TOOLS.map(tool => {
    const href   = tool.folder ? `../${tool.folder}/index.html` : '#';
    const active = tool.folder === currentFolder ? ' class="active"' : '';
    return `<a href="${href}"${active}>${tool.name}</a>`;
  }).join('');

  aside.innerHTML = `
    <h2>Weitere Webtools</h2>
    <a href="../index.html" class="back-link">&#8592; Zur Übersicht</a>
    ${toolLinks}
  `;
}

renderSidebar();


// ─── Mobiles Drawer-Menü ──────────────────────────────────────────

function setupMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const aside  = document.querySelector('aside');
  if (!toggle || !aside) return;

  // Backdrop-Element ins DOM injizieren (Styling via base/style.css)
  const backdrop = document.createElement('div');
  backdrop.id = 'menu-backdrop';
  document.body.appendChild(backdrop);

  function openMenu() {
    aside.classList.add('aside--open');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    aside.classList.remove('aside--open');
    document.body.classList.remove('menu-open');
  }

  toggle.addEventListener('click', openMenu);
  backdrop.addEventListener('click', closeMenu);

  // Drawer automatisch schliessen, wenn ein Link angeklickt wird
  aside.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
}

setupMobileMenu();
