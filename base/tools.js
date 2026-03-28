// =================================================================
// Datei:    base/tools.js
// Zweck:    Zentrales Tool-Register — einzige Stelle, an der
//           neue Tools eingetragen werden.
//           Wird von mainpage/app.js (Karten) und base/app.js
//           (Sidebar) ausgelesen.
// Einbinden: Als erstes Script auf allen Seiten laden.
// =================================================================

'use strict';

// Tool-Einträge:
//   name   — Anzeigename in Karte und Sidebar
//   folder — Unterordner relativ zu Einkaufs-Tools/ (null = noch nicht implementiert)
//   icon   — Emoji-Icon für die Karten-Ansicht
const TOOLS = [
  { name: 'Währungsrechner',           folder: 'Währungsrechner', icon: '💰' },
  { name: 'Granulat Gewichtsrechner',  folder: 'Granulat-Gewichtsrechner', icon: '⚖' },
  { name: 'Artikel Übersicht',          folder: 'Artikel-Übersicht', icon: '📋' },
  { name: 'Tool 4 - in Arbeit',        folder: 'Tool-4',          icon: '⚒️' },
  { name: 'Tool 5 - in Arbeit',        folder: 'Tool-5',          icon: '⚒️' },
];
