'use strict';

// Renders the sidebar navigation on all tool subpages.
// Requires TOOLS to be loaded from tools.js before this script.
function renderSidebar() {
  const aside = document.querySelector('aside');
  if (!aside) return;

  // Detect which tool folder we are currently in.
  const currentFolder = decodeURIComponent(window.location.pathname).split('/').at(-2);

  const toolLinks = TOOLS.map(tool => {
    const href    = tool.folder ? `${tool.folder}/index.html` : '#';
    const active  = tool.folder === currentFolder ? ' class="active"' : '';
    return `<a href="${href}"${active}>${tool.name}</a>`;
  }).join('');

  aside.innerHTML = `
    <h2>Weitere Webtools</h2>
    <a href="../index.html" class="back-link">&#8592; Zur Übersicht</a>
    ${toolLinks}
  `;
}

renderSidebar();
