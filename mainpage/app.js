'use strict';

// Renders the tool cards on the landing page from the central tool registry.
// Requires TOOLS to be loaded from tools.js before this script.
function renderToolCards() {
  const main = document.querySelector('main');
  if (!main) return;

  main.innerHTML = TOOLS.map(tool => {
    const href = tool.folder ? `${tool.folder}/index.html` : '#';
    return `<a href="${href}">${tool.name}<br><span class="icon">${tool.icon}</span></a>`;
  }).join('');
}

renderToolCards();
