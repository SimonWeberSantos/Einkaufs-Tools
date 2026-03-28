// =================================================================
// Datei:    mainpage/app.js
// Zweck:    Rendert die Tool-Karten auf der Startseite dynamisch
//           aus dem zentralen TOOLS-Register.
//           Nicht implementierte Tools (folder: null) erhalten
//           einen deaktivierten Link (#).
// Benötigt: base/tools.js muss vor diesem Script geladen sein.
// =================================================================

'use strict';

function renderToolCards() {
  const main = document.querySelector('main');
  if (!main) return;

  main.innerHTML = TOOLS.map(tool => {
    const href = tool.folder ? `${tool.folder}/index.html` : '#';
    return `<a href="${href}">${tool.name}<br><span class="icon">${tool.icon}</span></a>`;
  }).join('');
}

renderToolCards();
