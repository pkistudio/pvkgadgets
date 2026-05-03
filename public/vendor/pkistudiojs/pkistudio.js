(() => {
  let defaultInstance = null;
  const APP_VERSION = '0.2.2';

  const APP_STYLES = `:host {
  color-scheme: light;
  --bg: #eef1f5;
  --window: #f8f8f8;
  --chrome: #f2f2f2;
  --panel: #ffffff;
  --panel-border: #b8c0ca;
  --tree-line: #b9b9b9;
  --text: #111827;
  --muted: #5b6470;
  --accent: #2563eb;
  --selection: #cfe8ff;
  --selection-border: #99c7ee;
  --folder: #f3c14f;
  --folder-edge: #c69324;
  --leaf: #f7f7f7;
  --leaf-edge: #8b8b8b;
  --comment: #4b5563;
  --danger: #b91c1c;
}

* {
  box-sizing: border-box;
}

:host {
  display: block;
  margin: 0;
  min-height: 100vh;
  font-family: Tahoma, "MS UI Gothic", "Yu Gothic UI", system-ui, sans-serif;
  font-size: 13px;
  color: var(--text);
  background: linear-gradient(#f7f9fc, var(--bg));
}

main {
  width: min(1220px, calc(100% - 24px));
  margin: 0 auto;
  padding: 14px 0;
}

.menu {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  align-items: center;
  margin-bottom: 0;
  border: 1px solid var(--panel-border);
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  padding: 4px;
  background: linear-gradient(#ffffff, var(--chrome));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.menu button {
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 4px 12px;
  color: var(--text);
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.menu button:hover,
.menu button:focus-visible {
  outline: none;
  border-color: #9dbce5;
  background: #eaf3ff;
}

.menu-group {
  position: relative;
}

.submenu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  display: grid;
  min-width: 230px;
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 3px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

.submenu[hidden] {
  display: none;
}

.submenu button {
  width: 100%;
  text-align: left;
  white-space: nowrap;
}

.hero {
  display: none;
}

.badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  padding: 8px 12px;
  color: var(--muted);
  background: rgba(15, 23, 42, 0.48);
}

h1 {
  margin: 0;
  font-size: clamp(2.4rem, 7vw, 5.5rem);
  letter-spacing: -0.07em;
  line-height: 0.94;
}

p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.card {
  border: 1px solid var(--panel-border);
  border-radius: 0 0 6px 6px;
  padding: 8px;
  background: var(--window);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
}

input[type="file"] {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.viewer {
  min-height: 560px;
  max-height: calc(100vh - 150px);
  overflow: auto;
  border: 1px solid var(--panel-border);
  border-radius: 3px;
  padding: 4px 6px;
  background: var(--panel);
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.35;
}

.viewer.empty {
  display: grid;
  place-items: center;
  padding: 32px;
  color: var(--muted);
}

.viewer.dragover {
  border-color: var(--accent);
  background: #eef6ff;
}

.tree {
  display: grid;
  gap: 0;
  min-width: 900px;
}

details.node {
  position: relative;
  border: 0;
  border-radius: 0;
  background: transparent;
}

details.node details.node {
  margin-left: 19px;
}

details.node details.node::before {
  content: "";
  position: absolute;
  top: -2px;
  bottom: 8px;
  left: -11px;
  border-left: 1px dotted var(--tree-line);
}

summary {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  align-items: flex-start;
  min-height: 19px;
  padding: 1px 4px 1px 0;
  cursor: default;
  list-style: none;
  white-space: nowrap;
  line-height: 16px;
}

summary::-webkit-details-marker {
  display: none;
}

summary::before {
  display: none;
}

.node-toggle {
  display: inline-grid;
  place-items: center;
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  flex: 0 0 auto;
  margin-top: 2px;
  margin-right: 2px;
  border: 1px solid #7f7f7f;
  color: #333;
  background: #fff;
  font: 10px/1 Arial, sans-serif;
  cursor: pointer;
  user-select: none;
}

.node-toggle .toggle-open {
  display: none;
}

details[open] > summary .node-toggle .toggle-open {
  display: inline;
}

details[open] > summary .node-toggle .toggle-closed {
  display: none;
}

details.node:not(:has(.children)) > summary .node-toggle {
  border-color: transparent;
  background: transparent;
  cursor: default;
  pointer-events: none;
}

details.node:not(:has(.children)) > summary .node-toggle .toggle-open,
details.node:not(:has(.children)) > summary .node-toggle .toggle-closed {
  display: none;
}

summary::after {
  content: "";
  position: absolute;
  top: 9px;
  left: 8px;
  width: 11px;
  border-top: 1px dotted var(--tree-line);
  transform: translateX(-100%);
}

.icon {
  position: relative;
  width: 15px;
  height: 12px;
  flex: 0 0 auto;
  margin-top: 2px;
  margin-right: 2px;
}

.icon[data-node-icon] {
  cursor: context-menu;
}

.icon.folder::before {
  content: "";
  position: absolute;
  left: 1px;
  top: 1px;
  width: 7px;
  height: 4px;
  border: 1px solid var(--folder-edge);
  border-bottom: 0;
  background: #ffe08a;
}

.icon.folder::after {
  content: "";
  position: absolute;
  left: 0;
  top: 4px;
  width: 14px;
  height: 8px;
  border: 1px solid var(--folder-edge);
  background: linear-gradient(#ffe28f, var(--folder));
}

.icon.leaf::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 0;
  width: 10px;
  height: 12px;
  border: 1px solid var(--leaf-edge);
  background: linear-gradient(135deg, transparent 0 18%, #dcdcdc 19% 26%, var(--leaf) 27%);
}

.icon.encapsulated::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 0;
  width: 10px;
  height: 12px;
  border: 1px solid #5f6f84;
  background:
    linear-gradient(135deg, transparent 0 18%, #d5dbe3 19% 26%, transparent 27%),
    linear-gradient(90deg, transparent 0 2px, #d89b20 2px 5px, transparent 5px),
    repeating-linear-gradient(180deg, transparent 0 2px, #6f5324 2px 3px, transparent 3px 4px),
    linear-gradient(#f8fbff, #dfe8f4);
  background-position: 0 0, 0 0, 3px 1px, 0 0;
  background-size: auto, auto, 2px 9px, auto;
}

summary:hover .node-line {
  background: #eef6ff;
}

details[open] > summary .node-line {
  border-color: transparent;
}

.node-line {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 4px;
  min-height: 16px;
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 0 3px;
  line-height: 16px;
}

.tag {
  color: #111827;
  font-weight: 400;
}

.pill {
  border: 0;
  border-radius: 0;
  padding: 0;
  color: var(--muted);
  background: transparent;
  font-size: inherit;
}

.constructed {
  color: #166534;
}

.value {
  color: #111827;
}

.hex,
.comment {
  color: var(--comment);
}

.content {
  display: none;
}

.field {
  overflow-wrap: anywhere;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.46);
  font: 0.86rem/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.field span {
  display: block;
  margin-bottom: 4px;
  color: var(--muted);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 0.74rem;
}

.children {
  display: grid;
  gap: 0;
  padding: 0;
}

.error {
  border: 1px solid #e7a4a4;
  border-radius: 3px;
  padding: 10px;
  color: var(--danger);
  background: #fff5f5;
}

.notice {
  margin-top: 8px;
  font-size: 12px;
}

.node-context-menu {
  position: fixed;
  z-index: 20;
  min-width: 150px;
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 3px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

.node-context-menu[hidden] {
  display: none;
}

.node-context-menu button[hidden] {
  display: none;
}

.context-menu-group {
  position: relative;
}

.node-context-menu button {
  display: block;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 4px 18px 4px 8px;
  color: var(--text);
  background: transparent;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.context-submenu-trigger::after {
  content: "\\203a";
  position: absolute;
  right: 8px;
}

.node-context-submenu {
  position: absolute;
  top: -3px;
  left: 100%;
  z-index: 21;
  display: none;
  min-width: 150px;
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 3px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

.node-context-menu.open-left .node-context-submenu {
  right: 100%;
  left: auto;
}

.context-menu-group:hover .node-context-submenu,
.context-menu-group:focus-within .node-context-submenu,
.context-menu-group.submenu-open .node-context-submenu {
  display: block;
}

.node-context-menu button:hover,
.node-context-menu button:focus-visible {
  outline: none;
  border-color: #9dbce5;
  background: #eaf3ff;
}

.edit-dialog {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.22);
}

.edit-dialog[hidden] {
  display: none;
}

.edit-panel {
  width: min(520px, calc(100vw - 28px));
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  padding: 10px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

.der-panel {
  width: min(620px, calc(100vw - 28px));
}

.der-group {
  margin: 0 0 8px;
  border: 1px solid var(--panel-border);
  border-radius: 3px;
  padding: 8px 10px 10px;
}

.der-group legend {
  padding: 0 4px;
  color: var(--text);
}

.der-identifier-grid {
  display: grid;
  grid-template-columns: minmax(175px, 1fr) minmax(145px, 0.85fr) minmax(135px, 0.75fr);
  gap: 6px;
  align-items: stretch;
}

.der-subgroup {
  margin: 0;
  border: 1px solid #c9cdd3;
  border-radius: 2px;
  padding: 8px 10px;
}

.der-radio-list {
  display: grid;
  gap: 5px;
}

.der-radio-list label,
.der-length-row label {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  white-space: nowrap;
}

.edit-panel .der-radio-list label,
.edit-panel .der-length-row label {
  display: flex;
}

.der-panel input[type="radio"],
.der-panel input[type="checkbox"] {
  width: auto;
  flex: 0 0 auto;
}

.der-index-field,
.der-length-row {
  display: grid;
  gap: 8px;
  align-items: center;
}

.der-length-row {
  grid-template-columns: auto 1fr;
}

.der-panel input[readonly],
.der-panel textarea[readonly] {
  background: #f7f7f7;
}

.der-tag-name {
  margin-top: 6px;
  border: 1px solid #c9cdd3;
  border-radius: 2px;
  padding: 8px;
  text-align: center;
  background: #f7f7f7;
}

.der-content-summary {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 12px;
  align-items: center;
  margin-bottom: 6px;
}

.der-value-preview {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Consolas, "Courier New", monospace;
}

.der-panel textarea {
  width: 100%;
  min-height: 98px;
  resize: vertical;
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 6px 8px;
  font: 12px/1.4 Consolas, "Courier New", monospace;
}

.time-panel {
  width: min(440px, calc(100vw - 28px));
}

.octet-panel {
  width: min(560px, calc(100vw - 28px));
}

.about-panel {
  width: min(380px, calc(100vw - 28px));
}

.about-name {
  margin: 0 0 6px;
  color: var(--text);
  font-size: 18px;
  font-weight: 700;
}

.about-version {
  margin-bottom: 8px;
  font-family: Consolas, "Courier New", monospace;
}

.about-description {
  margin-bottom: 10px;
}

.octet-panel textarea {
  width: 100%;
  min-height: 150px;
  resize: vertical;
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 6px 8px;
  font: 12px/1.4 Consolas, "Courier New", monospace;
}

.bit-unused-row {
  display: grid;
  grid-template-columns: auto minmax(72px, 110px);
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.bit-unused-row[hidden] {
  display: none;
}

.octet-tools {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

.octet-tools button {
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 5px 12px;
  color: #111827;
  background: linear-gradient(#ffffff, #e7e9ee);
  font: inherit;
  cursor: pointer;
}

.time-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(150px, auto);
  gap: 8px 10px;
  align-items: start;
}

.time-fields {
  display: grid;
  gap: 8px;
}

.time-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.time-row label,
.time-zone-options label,
.time-tag-options label {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  white-space: nowrap;
}

.edit-panel .time-row label,
.edit-panel .time-zone-options label,
.edit-panel .time-tag-options label {
  display: flex;
}

.time-panel input[type="radio"],
.time-panel input[type="checkbox"] {
  width: auto;
  flex: 0 0 auto;
}

.time-panel input[type="date"],
.time-panel input[type="time"] {
  font: 12px/1.4 Consolas, "Courier New", monospace;
}

.time-tag-options,
.time-zone-options {
  display: flex;
  gap: 5px;
  flex-direction: column;
}

.time-zone-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(72px, auto));
  align-items: center;
}

.time-offset-row {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}

.time-offset-row input {
  min-width: 0;
}

.edit-panel label {
  display: grid;
  gap: 6px;
}

.edit-panel input {
  width: 100%;
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 6px 8px;
  font: 12px/1.4 Consolas, "Courier New", monospace;
}

.edit-title {
  margin: 0 0 8px;
  color: var(--text);
  font-weight: 700;
}

.edit-error {
  min-height: 18px;
  margin-top: 6px;
  color: var(--danger);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.edit-actions button {
  border: 1px solid #8f98a3;
  border-radius: 3px;
  padding: 5px 14px;
  color: #111827;
  background: linear-gradient(#ffffff, #e7e9ee);
  font: inherit;
  cursor: pointer;
}

.edit-actions button:disabled {
  color: #8a8f98;
  cursor: not-allowed;
  background: #f1f2f4;
}

@media (max-width: 640px) {
  .der-identifier-grid,
  .der-length-row,
  .der-content-summary,
  .time-grid,
  .time-row {
    grid-template-columns: 1fr;
  }
}`;

  const APP_MARKUP = `<main>
  <nav class="menu" aria-label="Application actions">
    <div class="menu-group">
      <button type="button" data-action="toggle-load-menu" aria-haspopup="menu" aria-expanded="false">Load</button>
      <div id="loadMenu" class="submenu" role="menu" hidden>
        <button type="button" role="menuitem" data-action="open">from File</button>
        <button type="button" role="menuitem" data-action="load-clipboard-pem">from Clipboard as PEM</button>
        <button type="button" role="menuitem" data-action="load-clipboard-hex">from Clipboard as HEX</button>
      </div>
    </div>
    <div class="menu-group">
      <button type="button" data-action="toggle-save-menu" aria-haspopup="menu" aria-expanded="false">Save</button>
      <div id="saveMenu" class="submenu" role="menu" hidden>
        <button type="button" role="menuitem" data-action="save-der-file">to File as DER</button>
      </div>
    </div>
    <button type="button" data-action="close">Close</button>
    <div class="menu-group">
      <button type="button" data-action="toggle-tools-menu" aria-haspopup="menu" aria-expanded="false">Tools</button>
      <div id="toolsMenu" class="submenu" role="menu" hidden>
        <button type="button" role="menuitem" data-action="expand-all">Expand All</button>
        <button type="button" role="menuitem" data-action="collapse-all">Collapse All</button>
      </div>
    </div>
    <button type="button" data-action="about">About</button>
  </nav>

  <section class="hero">
    <div class="badge">pkistudio · ASN.1 DER Viewer · :8080</div>
    <h1>View DER as a Tree</h1>
    <p>
      Parse ASN.1 DER binaries in your browser and inspect tags, lengths, offsets, and values as a tree.
      File contents are never uploaded to the server.
    </p>
  </section>

  <section class="card">
    <input id="fileInput" type="file" accept=".der,.pem,.cer,.crt,.csr,.p7b,.p7c,.crl,.bin,application/pkix-cert,application/pkcs10,application/octet-stream,text/plain" hidden />
    <div id="viewer" class="viewer empty">No DER / PEM file selected yet.</div>
    <p id="fileNotice" class="notice">
      PEM and headerless base64 input are decoded before parsing.
    </p>
  </section>
</main>

<div id="nodeContextMenu" class="node-context-menu" role="menu" hidden>
  <button type="button" role="menuitem" data-node-action="edit">Edit</button>
  <button type="button" role="menuitem" data-node-action="insert-before">Insert before</button>
  <button type="button" role="menuitem" data-node-action="add-child">Add</button>
  <button type="button" role="menuitem" data-node-action="delete">Delete</button>
  <div class="context-menu-group" role="none">
    <button type="button" class="context-submenu-trigger" role="menuitem" data-node-action="send-to" aria-haspopup="menu" aria-expanded="false">Send to</button>
    <div class="node-context-submenu" role="menu" aria-label="Send to">
      <button type="button" role="menuitem" data-node-action="send-new-window">New Window</button>
      <button type="button" role="menuitem" data-node-action="send-new-window-extracted" hidden>New Window as Extracted</button>
      <button type="button" role="menuitem" data-node-action="copy-tree">Clipboard as Tree Text</button>
      <button type="button" role="menuitem" data-node-action="copy-hex">Clipboard as HEX Text</button>
    </div>
  </div>
</div>

<div id="derDialog" class="edit-dialog" hidden>
  <form id="derForm" class="edit-panel der-panel">
    <p id="derTitle" class="edit-title">Edit DER</p>
    <fieldset class="der-group">
      <legend>Identifier</legend>
      <div class="der-identifier-grid">
        <fieldset class="der-subgroup">
          <legend>Class</legend>
          <div class="der-radio-list">
            <label><input type="radio" name="derClass" value="0" disabled /> Universal</label>
            <label><input type="radio" name="derClass" value="1" disabled /> Application</label>
            <label><input type="radio" name="derClass" value="2" disabled /> Context-specific</label>
            <label><input type="radio" name="derClass" value="3" disabled /> Private</label>
          </div>
        </fieldset>
        <fieldset class="der-subgroup">
          <legend>Method</legend>
          <div class="der-radio-list">
            <label><input type="radio" name="derMethod" value="constructed" disabled /> Structured</label>
            <label><input type="radio" name="derMethod" value="primitive" disabled /> Primitive</label>
          </div>
        </fieldset>
        <fieldset class="der-subgroup der-index-field">
          <legend>Index</legend>
          <input id="derIndex" type="number" readonly />
        </fieldset>
      </div>
      <div id="derTagName" class="der-tag-name"></div>
    </fieldset>
    <fieldset class="der-group">
      <legend>Length</legend>
      <div class="der-length-row">
        <label><input id="derIndefinite" type="checkbox" disabled /> Indefinite</label>
        <input id="derLength" type="text" readonly />
      </div>
    </fieldset>
    <fieldset class="der-group">
      <legend>Content</legend>
      <div class="der-content-summary">
        <button type="button" data-der-action="edit-content">Edit...</button>
        <output id="derValuePreview" class="der-value-preview"></output>
      </div>
      <textarea id="derHex" readonly spellcheck="false"></textarea>
    </fieldset>
    <div class="edit-actions">
      <button type="submit">OK</button>
      <button type="button" data-der-action="cancel">Cancel</button>
    </div>
  </form>
</div>

<div id="editDialog" class="edit-dialog" hidden>
  <form id="editForm" class="edit-panel">
    <p id="editTitle" class="edit-title">Edit</p>
    <label>
      Value
      <input id="editValue" name="value" autocomplete="off" />
    </label>
    <div id="editError" class="edit-error" role="alert"></div>
    <div class="edit-actions">
      <button type="button" data-edit-action="cancel">Cancel</button>
      <button type="submit">Apply</button>
    </div>
  </form>
</div>

<div id="timeDialog" class="edit-dialog" hidden>
  <form id="timeForm" class="edit-panel time-panel">
    <p id="timeTitle" class="edit-title">Time</p>
    <div class="time-grid">
      <div class="time-fields">
        <input id="timeDate" type="date" required />
        <div class="time-row">
          <input id="timeClock" type="time" step="1" required />
          <label><input id="timeZeroOmitted" type="checkbox" disabled /> Zero Omitted</label>
        </div>
        <label>
          Fractions
          <input id="timeFractions" type="text" inputmode="numeric" autocomplete="off" disabled />
        </label>
      </div>
      <fieldset class="der-subgroup">
        <legend>Tag</legend>
        <div class="time-tag-options">
          <label><input type="radio" name="timeTag" value="auto" disabled /> Auto</label>
          <label><input type="radio" name="timeTag" value="23" disabled /> UTCTime</label>
          <label><input type="radio" name="timeTag" value="24" disabled /> GeneralizedTime</label>
        </div>
      </fieldset>
    </div>
    <fieldset class="der-group">
      <legend>Zone</legend>
      <div class="time-zone-options">
        <label><input type="radio" name="timeZone" value="gmt" checked /> GMT</label>
        <label><input type="radio" name="timeZone" value="local" /> Local</label>
      </div>
      <div class="time-offset-row">
        <select id="timeOffsetSign" disabled>
          <option value="+">+</option>
          <option value="-">-</option>
        </select>
        <input id="timeOffsetHours" type="number" min="0" max="23" value="0" disabled />
        <input id="timeOffsetMinutes" type="number" min="0" max="59" value="0" disabled />
      </div>
    </fieldset>
    <div id="timeError" class="edit-error" role="alert"></div>
    <div class="edit-actions">
      <button type="submit">OK</button>
      <button type="button" data-time-action="cancel">Cancel</button>
    </div>
  </form>
</div>

<div id="octetDialog" class="edit-dialog" hidden>
  <form id="octetForm" class="edit-panel octet-panel">
    <p id="octetTitle" class="edit-title">OCTET STRING (HEX)</p>
    <label id="bitUnusedRow" class="bit-unused-row" hidden>
      Unused bits
      <input id="bitUnusedBits" type="number" min="0" max="7" step="1" value="0" />
    </label>
    <textarea id="octetHex" spellcheck="false"></textarea>
    <div class="octet-tools">
      <button type="button" data-octet-action="load-file">Load from...</button>
      <input id="octetFileInput" type="file" hidden />
    </div>
    <div id="octetError" class="edit-error" role="alert"></div>
    <div class="edit-actions">
      <button type="submit">Apply</button>
      <button type="button" data-octet-action="cancel">Cancel</button>
    </div>
  </form>
</div>

<div id="aboutDialog" class="edit-dialog" hidden>
  <section class="edit-panel about-panel" role="dialog" aria-labelledby="aboutTitle" aria-modal="true">
    <p id="aboutTitle" class="about-name">PkiStudioJS</p>
    <p class="about-version">Version ${APP_VERSION}</p>
    <p class="about-description">Browser-based ASN.1 DER viewer and editor.</p>
    <div class="edit-actions">
      <button type="button" data-about-action="close">Close</button>
    </div>
  </section>
</div>`;

  function resolveMount(mount) {
    if (typeof mount === 'string') {
      const element = document.querySelector(mount);
      if (!element) throw new Error(`pkistudio mount target was not found: ${mount}`);
      return element;
    }

    if (mount) return mount;

    const element = document.querySelector('[data-pkistudio-mount], [data-pkistudio], #pkistudio');
    if (!element) throw new Error('pkistudio mount target was not found');
    return element;
  }

  function createAppRoot(mount, options) {
    const useShadowRoot = options.shadowRoot !== false && typeof mount.attachShadow === 'function';
    const root = mount instanceof ShadowRoot
      ? mount
      : useShadowRoot
        ? (mount.shadowRoot || mount.attachShadow({ mode: 'open' }))
        : mount;

    root.innerHTML = `<style>${APP_STYLES}</style>${APP_MARKUP}`;
    return root;
  }

  function init(options = {}) {
    const mount = resolveMount(options.mount);
    const scope = createAppRoot(mount, options);
    const fileInput = scope.querySelector('#fileInput');
    const menu = scope.querySelector('.menu');
    const loadMenu = scope.querySelector('#loadMenu');
    const saveMenu = scope.querySelector('#saveMenu');
    const toolsMenu = scope.querySelector('#toolsMenu');
    const viewer = scope.querySelector('#viewer');
    const fileNotice = scope.querySelector('#fileNotice');
    const nodeContextMenu = scope.querySelector('#nodeContextMenu');
    const derDialog = scope.querySelector('#derDialog');
    const derForm = scope.querySelector('#derForm');
    const derTitle = scope.querySelector('#derTitle');
    const derIndex = scope.querySelector('#derIndex');
    const derIndefinite = scope.querySelector('#derIndefinite');
    const derLength = scope.querySelector('#derLength');
    const derTagName = scope.querySelector('#derTagName');
    const derValuePreview = scope.querySelector('#derValuePreview');
    const derHex = scope.querySelector('#derHex');
    const editDialog = scope.querySelector('#editDialog');
    const editForm = scope.querySelector('#editForm');
    const editTitle = scope.querySelector('#editTitle');
    const editValue = scope.querySelector('#editValue');
    const editError = scope.querySelector('#editError');
    const timeDialog = scope.querySelector('#timeDialog');
    const timeForm = scope.querySelector('#timeForm');
    const timeTitle = scope.querySelector('#timeTitle');
    const timeDate = scope.querySelector('#timeDate');
    const timeClock = scope.querySelector('#timeClock');
    const timeZeroOmitted = scope.querySelector('#timeZeroOmitted');
    const timeFractions = scope.querySelector('#timeFractions');
    const timeOffsetSign = scope.querySelector('#timeOffsetSign');
    const timeOffsetHours = scope.querySelector('#timeOffsetHours');
    const timeOffsetMinutes = scope.querySelector('#timeOffsetMinutes');
    const timeError = scope.querySelector('#timeError');
    const octetDialog = scope.querySelector('#octetDialog');
    const octetForm = scope.querySelector('#octetForm');
    const octetTitle = scope.querySelector('#octetTitle');
    const bitUnusedRow = scope.querySelector('#bitUnusedRow');
    const bitUnusedBits = scope.querySelector('#bitUnusedBits');
    const octetHex = scope.querySelector('#octetHex');
    const octetFileInput = scope.querySelector('#octetFileInput');
    const octetError = scope.querySelector('#octetError');
    const aboutDialog = scope.querySelector('#aboutDialog');
    
    const CLASS_NAMES = ['Universal', 'Application', 'Context-specific', 'Private'];
    const UNIVERSAL_TAGS = {
      1: 'BOOLEAN',
      2: 'INTEGER',
      3: 'BIT STRING',
      4: 'OCTET STRING',
      5: 'NULL',
      6: 'OBJECT IDENTIFIER',
      10: 'ENUMERATED',
      12: 'UTF8String',
      16: 'SEQUENCE',
      17: 'SET',
      18: 'NumericString',
      19: 'PrintableString',
      20: 'TeletexString',
      22: 'IA5String',
      23: 'UTCTime',
      24: 'GeneralizedTime',
      30: 'BMPString'
    };
    
    const ITEM_TRUNCATE_THRESHOLD = 255;
    const ITEM_TEXT_LIMIT = 250;
    const DER_CONTENT_HEX_LIMIT = 4096;
    let oidNames = {};
    let currentBytes = null;
    let currentNodes = [];
    let nodeById = new Map();
    let activeContextNodeId = null;
    let activeDerNodeId = null;
    let activeDerMode = 'view';
    let activeEditNodeId = null;
    let activeTimeNodeId = null;
    let activeOctetNodeId = null;
    let nextNodeId = 1;
    
    async function loadOidNames() {
      try {
        const response = await fetch(options.oidUrl || 'oids.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        oidNames = await response.json();
        if (currentNodes.length > 0) renderCurrentDocument();
      } catch (error) {
        console.warn('OID names could not be loaded.', error);
      }
    }
    
    function formatBytes(bytes) {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let index = 0;
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
      }
      return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
    }
    
    function escapeHtml(value) {
      return String(value).replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char]));
    }
    
    function truncateItemText(value) {
      const text = String(value);
      return text.length >= ITEM_TRUNCATE_THRESHOLD ? `${text.slice(0, ITEM_TEXT_LIMIT)}...` : text;
    }
    
    function toHex(bytes, maxLength = 32) {
      const length = Math.min(bytes.length, maxLength);
      const hex = Array.from(bytes.slice(0, length), (byte) => byte.toString(16).padStart(2, '0')).join(' ');
      return bytes.length > maxLength ? `${hex} ...` : hex;
    }
    
    function toCompactHex(bytes, maxLength = 42) {
      const length = Math.min(bytes.length, maxLength);
      const hex = Array.from(bytes.slice(0, length), (byte) => byte.toString(16).padStart(2, '0')).join('');
      return bytes.length > maxLength ? `${hex}...` : hex;
    }
    
    function toLowerHexString(bytes) {
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    
    function toPrintableAscii(bytes) {
      return Array.from(bytes, (byte) => (byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '.')).join('');
    }
    
    function concatBytes(parts) {
      const totalLength = parts.reduce((total, part) => total + part.length, 0);
      const bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
      }
      return bytes;
    }
    
    function bytesToBase64(bytes) {
      let binary = '';
      for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
      return btoa(binary);
    }
    
    function bytesEqual(left, right) {
      if (left.length !== right.length) return false;
      for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) return false;
      }
      return true;
    }
    
    function encodeBase128(value) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid tag number');
      const bytes = [value & 0x7f];
      value = Math.floor(value / 128);
      while (value > 0) {
        bytes.unshift((value & 0x7f) | 0x80);
        value = Math.floor(value / 128);
      }
      return bytes;
    }
    
    function encodeIdentifier(node) {
      const first = (node.tagClass << 6) | (node.constructed ? 0x20 : 0);
      if (node.tagNumber < 31) return new Uint8Array([first | node.tagNumber]);
      return new Uint8Array([first | 0x1f, ...encodeBase128(node.tagNumber)]);
    }
    
    function encodeLength(length) {
      if (!Number.isSafeInteger(length) || length < 0) throw new Error('Invalid length');
      if (length < 0x80) return new Uint8Array([length]);
    
      const bytes = [];
      let value = length;
      while (value > 0) {
        bytes.unshift(value & 0xff);
        value = Math.floor(value / 256);
      }
      return new Uint8Array([0x80 | bytes.length, ...bytes]);
    }
    
    function getNodeValueBytes(node) {
      return node.valueBytes || new Uint8Array();
    }
    
    function encodeValue(node) {
      if (node.constructed) return encodeNodes(node.children);
    
      if (node.encapsulated && node.tagClass === 0 && node.tagNumber === 3) {
        const value = getNodeValueBytes(node);
        const unusedBits = value.length ? value[0] : 0;
        return concatBytes([new Uint8Array([unusedBits]), encodeNodes(node.children)]);
      }
    
      if (node.encapsulated && node.tagClass === 0 && node.tagNumber === 4) {
        return encodeNodes(node.children);
      }
    
      return getNodeValueBytes(node);
    }
    
    function encodeNode(node) {
      const value = encodeValue(node);
      if (node.indefinite) return concatBytes([encodeIdentifier(node), new Uint8Array([0x80]), value, new Uint8Array([0x00, 0x00])]);
      return concatBytes([encodeIdentifier(node), encodeLength(value.length), value]);
    }
    
    function encodeNodes(nodes) {
      return concatBytes(nodes.map((node) => encodeNode(node)));
    }
    
    function decodeAscii(bytes) {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
    
    function isPemText(text) {
      return /-----BEGIN [^-]+-----/.test(text);
    }

    function normalizeBase64Text(text) {
      const base64 = text.replace(/\s+/g, '');
      if (!base64 || base64.length % 4 !== 0) return '';
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return '';
      if (/=/.test(base64.slice(0, -2))) return '';
      return base64;
    }
    
    function base64ToBytes(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    
    function decodePem(text) {
      const blockPattern = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/g;
      const blocks = [];
      let match;
    
      while ((match = blockPattern.exec(text)) !== null) {
        const base64 = match[2]
          .split(/\r?\n/)
          .filter((line) => !line.includes(':'))
          .join('')
          .replace(/\s+/g, '');
        if (!base64) throw new Error(`PEM block ${match[1]} has no base64 data`);
        blocks.push(base64ToBytes(base64));
      }
    
      if (blocks.length === 0) throw new Error('Could not read a PEM BEGIN/END block');
    
      const totalLength = blocks.reduce((total, block) => total + block.length, 0);
      const bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const block of blocks) {
        bytes.set(block, offset);
        offset += block.length;
      }
      return bytes;
    }

    function decodeHeaderlessPem(text) {
      const base64 = normalizeBase64Text(text);
      if (!base64) throw new Error('Headerless PEM data must be valid base64 text');
      const bytes = base64ToBytes(base64);
      parseElements(bytes, 0, bytes.length);
      return bytes;
    }
    
    function getDerBytes(bytes) {
      const text = decodeAscii(bytes);
      if (isPemText(text)) return { bytes: decodePem(text), format: 'PEM' };
      try {
        return { bytes: decodeHeaderlessPem(text), format: 'headerless PEM' };
      } catch (_) {
        // Fall through to raw DER/BER bytes when the text is not a valid base64-encoded ASN.1 value.
      }
      return { bytes, format: 'DER' };
    }
    
    function hexToBytes(text) {
      const hex = text.replace(/\s+/g, '');
      if (!hex) throw new Error('HEX data is empty');
      if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('HEX text may contain only 0-9 and a-f');
      if (hex.length % 2 !== 0) throw new Error('HEX text must contain an even number of digits');
    
      const bytes = new Uint8Array(hex.length / 2);
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = parseInt(hex.slice(index * 2, (index * 2) + 2), 16);
      }
      return bytes;
    }
    
    function hexToBytesAllowEmpty(text) {
      const hex = text.replace(/\s+/g, '');
      if (!hex) return new Uint8Array();
      return hexToBytes(hex);
    }
    
    function decodeBmpString(bytes) {
      const codes = [];
      for (let index = 0; index + 1 < bytes.length; index += 2) {
        codes.push((bytes[index] << 8) | bytes[index + 1]);
      }
      return String.fromCharCode(...codes);
    }
    
    function decodeInteger(bytes) {
      if (bytes.length === 0) return '0';
      if (bytes.length > 8) return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    
      let value = 0n;
      for (const byte of bytes) value = (value << 8n) | BigInt(byte);
      if ((bytes[0] & 0x80) !== 0) value -= 1n << BigInt(bytes.length * 8);
      return value.toString();
    }
    
    function decodeOid(bytes) {
      if (bytes.length === 0) return '';
      const first = bytes[0];
      const parts = first >= 80 ? [2, first - 80] : [Math.floor(first / 40), first % 40];
      let value = 0;
      for (let index = 1; index < bytes.length; index += 1) {
        value = (value * 128) + (bytes[index] & 0x7f);
        if ((bytes[index] & 0x80) === 0) {
          parts.push(value);
          value = 0;
        }
      }
      return parts.join('.');
    }
    
    function encodeOidPart(value) {
      const bytes = [value & 0x7f];
      value = Math.floor(value / 128);
      while (value > 0) {
        bytes.unshift((value & 0x7f) | 0x80);
        value = Math.floor(value / 128);
      }
      return bytes;
    }
    
    function encodeOid(text) {
      const trimmed = text.trim();
      if (!/^\d+(?:\.\d+)+$/.test(trimmed)) throw new Error('Enter the OID in 1.2.840... format');
    
      const parts = trimmed.split('.').map((part) => Number(part));
      if (parts.some((part) => !Number.isSafeInteger(part) || part < 0)) throw new Error('Each OID arc must be a safe non-negative integer');
      if (parts[0] > 2) throw new Error('The first OID arc must be 0, 1, or 2');
      if (parts[0] < 2 && parts[1] > 39) throw new Error('When the first OID arc is 0 or 1, the second arc must be 0..39');
    
      const bytes = [parts[0] * 40 + parts[1]];
      for (const part of parts.slice(2)) bytes.push(...encodeOidPart(part));
      return new Uint8Array(bytes);
    }
    
    function padNumber(value, length = 2) {
      return String(value).padStart(length, '0');
    }
    
    function isEditableTimeNode(node) {
      return node.tagClass === 0 && (node.tagNumber === 23 || node.tagNumber === 24);
    }
    
    function parseDerTime(node, text) {
      const pattern = node.tagNumber === 23
        ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})$/
        : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(Z|[+-]\d{4})$/;
      const match = pattern.exec(text.trim());
      if (!match) throw new Error(`Enter ${getTagName(node)} in ${node.tagNumber === 23 ? 'YYMMDDHHMMSSZ or YYMMDDHHMMSS+0900' : 'YYYYMMDDHHMMSSZ or YYYYMMDDHHMMSS+0900'} format`);
    
      const year = node.tagNumber === 23
        ? (Number(match[1]) >= 50 ? 1900 + Number(match[1]) : 2000 + Number(match[1]))
        : Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const second = Number(match[6]);
      const zone = match[7];
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute ||
        date.getUTCSeconds() !== second
      ) {
        throw new Error(`${getTagName(node)} contains an invalid date or time`);
      }
    
      return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        zone: zone === 'Z' ? 'gmt' : 'local',
        offsetSign: zone === 'Z' ? '+' : zone[0],
        offsetHours: zone === 'Z' ? 0 : Number(zone.slice(1, 3)),
        offsetMinutes: zone === 'Z' ? 0 : Number(zone.slice(3, 5))
      };
    }
    
    function formatDateInput(parts) {
      return `${parts.year}-${padNumber(parts.month)}-${padNumber(parts.day)}`;
    }
    
    function formatTimeInput(parts) {
      return `${padNumber(parts.hour)}:${padNumber(parts.minute)}:${padNumber(parts.second)}`;
    }
    
    function formatDisplayTime(node, text) {
      try {
        const parts = parseDerTime(node, text);
        const zone = parts.zone === 'gmt' ? 'GMT' : `${parts.offsetSign}${padNumber(parts.offsetHours)}${padNumber(parts.offsetMinutes)}`;
        return `${parts.year}/${padNumber(parts.month)}/${padNumber(parts.day)} ${padNumber(parts.hour)}:${padNumber(parts.minute)}:${padNumber(parts.second)} [${zone}]`;
      } catch (_) {
        return text;
      }
    }
    
    function encodeDerTime(node, parts) {
      const { year, month, day, hour, minute, second } = parts;
      if (node.tagNumber === 23) {
        if (year < 1950 || year > 2049) throw new Error('UTCTime must be between 1950 and 2049');
        return `${padNumber(year % 100)}${padNumber(month)}${padNumber(day)}${padNumber(hour)}${padNumber(minute)}${padNumber(second)}${parts.zoneSuffix}`;
      }
    
      return `${padNumber(year, 4)}${padNumber(month)}${padNumber(day)}${padNumber(hour)}${padNumber(minute)}${padNumber(second)}${parts.zoneSuffix}`;
    }
    
    function getTimeFormParts() {
      if (!timeDate.value || !timeClock.value) throw new Error('Enter both date and time');
      const [year, month, day] = timeDate.value.split('-').map((part) => Number(part));
      const [hour, minute, second = 0] = timeClock.value.split(':').map((part) => Number(part));
      if ([year, month, day, hour, minute, second].some((value) => !Number.isInteger(value))) throw new Error('Invalid date or time');
    
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day ||
        date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute ||
        date.getUTCSeconds() !== second
      ) {
        throw new Error('Invalid date or time');
      }
    
      const zone = timeForm.querySelector('input[name="timeZone"]:checked')?.value || 'gmt';
      let zoneSuffix = 'Z';
    
      if (zone === 'local') {
        const hours = Number(timeOffsetHours.value);
        const minutes = Number(timeOffsetMinutes.value);
        if (!Number.isInteger(hours) || hours < 0 || hours > 23 || !Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
          throw new Error('Invalid time zone offset');
        }
        zoneSuffix = `${timeOffsetSign.value}${padNumber(hours)}${padNumber(minutes)}`;
      }
    
      return { year, month, day, hour, minute, second, zoneSuffix };
    }
    
    function isAscii(text) {
      return /^[\x00-\x7F]*$/.test(text);
    }
    
    function encodeBmpString(text) {
      const bytes = new Uint8Array(text.length * 2);
      for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        bytes[index * 2] = code >> 8;
        bytes[(index * 2) + 1] = code & 0xff;
      }
      return bytes;
    }
    
    function validateStringValue(node, text) {
      switch (node.tagNumber) {
        case 18:
          if (!/^[0-9 ]*$/.test(text)) throw new Error('NumericString may contain only digits and spaces');
          break;
        case 19:
          if (!/^[A-Za-z0-9 '()+,\-./:=?]*$/.test(text)) throw new Error('PrintableString contains unsupported characters');
          break;
        case 20:
        case 22:
          if (!isAscii(text)) throw new Error(`${getTagName(node)} may contain only ASCII characters`);
          break;
        case 23:
          if (!/^\d{12}(?:Z|[+-]\d{4})$/.test(text)) throw new Error('Enter UTCTime in YYMMDDHHMMSSZ or YYMMDDHHMMSS+0900 format');
          break;
        case 24:
          if (!/^\d{14}(?:Z|[+-]\d{4})$/.test(text)) throw new Error('Enter GeneralizedTime in YYYYMMDDHHMMSSZ or YYYYMMDDHHMMSS+0900 format');
          break;
        default:
          break;
      }
    }
    
    function isEditableTextNode(node) {
      return node.tagClass === 0 && [12, 18, 19, 20, 22, 23, 24, 30].includes(node.tagNumber);
    }
    
    function isEditableOidNode(node) {
      return node.tagClass === 0 && node.tagNumber === 6;
    }
    
    function isEditableOctetStringNode(node) {
      return node.tagClass === 0 && node.tagNumber === 4 && !node.constructed;
    }
    
    function isEditableBitStringNode(node) {
      return node.tagClass === 0 && node.tagNumber === 3 && !node.constructed;
    }
    
    function isEditableBinaryNode(node) {
      return isEditableOctetStringNode(node) || isEditableBitStringNode(node);
    }
    
    function isEditableNode(node) {
      return !node.constructed;
    }
    
    function getEditableNodeText(node) {
      if (isEditableOidNode(node)) return decodeOid(getNodeValueBytes(node));
      if (node.tagNumber === 30) return decodeBmpString(getNodeValueBytes(node));
      return decodeAscii(getNodeValueBytes(node));
    }
    
    function encodeEditableNodeValue(node, text) {
      if (isEditableOidNode(node)) return encodeOid(text);
      validateStringValue(node, text);
      if (node.tagNumber === 30) return encodeBmpString(text);
      return new TextEncoder().encode(text);
    }
    
    function getTagName(node) {
      if (node.eoc) return 'EndOfContent';
      if (node.tagClass === 0) return UNIVERSAL_TAGS[node.tagNumber] || `Universal ${node.tagNumber}`;
      return `[${node.tagNumber}] ${CLASS_NAMES[node.tagClass]}`;
    }

    function formatLengthText(node) {
      return node.indefinite ? 'Indefinite' : String(node.length);
    }
    
    function formatDisplayValue(node) {
      const valueBytes = getNodeValueBytes(node);
      const value = describeValue(node);
    
      if (node.constructed) return '';
      if (node.tagClass !== 0) return valueBytes.length ? toCompactHex(valueBytes, 72) : '';
        if (node.encapsulated && node.tagNumber !== 3) return '';
    
      switch (node.tagNumber) {
        case 1:
        case 2:
        case 10:
        case 5:
          return value;
        case 3:
          return valueBytes.length ? `[unused bits: ${valueBytes[0]}]` : '[invalid BIT STRING]';
        case 4:
          return '';
        case 6:
          return `{${value}}`;
        case 12:
        case 18:
        case 19:
        case 20:
        case 22:
        case 30:
          return `"${value}"`;
        case 23:
        case 24:
          return `"${formatDisplayTime(node, value)}"`;
        default:
          return valueBytes.length ? toCompactHex(valueBytes, 72) : '';
      }
    }
    
    function formatDisplayHex(node) {
      if (node.constructed) return '';
    
      const valueBytes = getNodeValueBytes(node);
      if (node.tagClass !== 0) return '';
    
      if (node.tagNumber === 3) {
        return valueBytes.length > 1 ? toCompactHex(valueBytes.slice(1), 42) : '';
      }
    
      return valueBytes.length ? toCompactHex(valueBytes, 42) : '';
    }
    
    function getEncapsulatedLabel(node) {
      return '';
    }
    
    function getOidComment(node) {
      if (node.tagClass !== 0 || node.tagNumber !== 6) return '';
      return oidNames[describeValue(node)] || '';
    }
    
    function describeValue(node) {
      const value = getNodeValueBytes(node);
      if (node.tagClass !== 0) return value.length ? toHex(value) : '(empty)';
    
      switch (node.tagNumber) {
        case 1:
          return value.length === 1 ? (value[0] === 0 ? 'FALSE' : 'TRUE') : 'Invalid BOOLEAN';
        case 2:
        case 10:
          return decodeInteger(value);
        case 3:
          return value.length ? `unused bits: ${value[0]}, data: ${toHex(value.slice(1))}` : 'Invalid BIT STRING';
        case 4:
          return toHex(value);
        case 5:
          return value.length === 0 ? 'NULL' : 'Invalid NULL';
        case 6:
          return decodeOid(value);
        case 12:
        case 18:
        case 19:
        case 20:
        case 22:
        case 23:
        case 24:
          return decodeAscii(value);
        case 30:
          return decodeBmpString(value);
        default:
          return value.length ? toHex(value) : '(empty)';
      }
    }
    
    function parseLength(bytes, offset, end) {
      if (offset >= end) throw new Error(`offset ${offset}: missing length`);
      const first = bytes[offset++];
      if ((first & 0x80) === 0) return { length: first, offset, indefinite: false };
    
      const octets = first & 0x7f;
      if (octets === 0) return { length: 0, offset, indefinite: true };
      if (octets > 6) throw new Error(`offset ${offset - 1}: length is too large`);
      if (offset + octets > end) throw new Error(`offset ${offset - 1}: length ends before all bytes are available`);
    
      let length = 0;
      for (let index = 0; index < octets; index += 1) length = (length * 256) + bytes[offset++];
      return { length, offset, indefinite: false };
    }

    function isEndOfContent(bytes, offset, end) {
      return offset + 2 <= end && bytes[offset] === 0x00 && bytes[offset + 1] === 0x00;
    }
    
    function parseIdentifier(bytes, offset, end) {
      if (offset >= end) throw new Error(`offset ${offset}: missing tag`);
      const start = offset;
      const first = bytes[offset++];
      const tagClass = first >> 6;
      const constructed = (first & 0x20) !== 0;
      let tagNumber = first & 0x1f;
    
      if (tagNumber === 0x1f) {
        tagNumber = 0;
        let count = 0;
        while (true) {
          if (offset >= end) throw new Error(`offset ${start}: high-tag-number form ends early`);
          const byte = bytes[offset++];
          tagNumber = (tagNumber * 128) + (byte & 0x7f);
          count += 1;
          if ((byte & 0x80) === 0) break;
          if (count > 6) throw new Error(`offset ${start}: tag number is too large`);
        }
      }
    
      return { tagClass, constructed, tagNumber, offset };
    }
    
    function parseElement(bytes, offset, end, depth = 0) {
      if (isEndOfContent(bytes, offset, end)) throw new Error(`offset ${offset}: unexpected EndOfContent outside an indefinite-length value`);

      const start = offset;
      const identifier = parseIdentifier(bytes, offset, end);
      offset = identifier.offset;
      const lengthInfo = parseLength(bytes, offset, end);
      offset = lengthInfo.offset;
      if (lengthInfo.indefinite && !identifier.constructed) throw new Error(`offset ${start}: indefinite length is only supported for constructed values`);

      const valueStart = offset;
      let valueEnd = valueStart + lengthInfo.length;
      let endOffset = valueEnd;
      let children = [];

      if (lengthInfo.indefinite) {
        const parsed = parseElementsUntilEndOfContent(bytes, valueStart, end, depth + 1);
        children = parsed.nodes;
        valueEnd = parsed.eocStart;
        endOffset = parsed.offset;
      }

      if (valueEnd > end) throw new Error(`offset ${start}: value exceeds the input range`);
    
      const node = {
        ...identifier,
        start,
        headerLength: valueStart - start,
        length: valueEnd - valueStart,
        indefinite: lengthInfo.indefinite,
        valueStart,
        valueEnd,
        end: endOffset,
        depth,
        children,
        encapsulated: false,
        valueBytes: bytes.slice(valueStart, valueEnd),
        dirty: false,
        validationError: ''
      };
    
      if (node.constructed && !node.indefinite) {
        node.children = parseElements(bytes, valueStart, valueEnd, depth + 1);
      } else if (node.tagClass === 0 && (node.tagNumber === 3 || node.tagNumber === 4)) {
        const nestedStart = node.tagNumber === 3 ? valueStart + 1 : valueStart;
        const canContainDer = node.tagNumber === 4 || (node.tagNumber === 3 && valueStart < valueEnd && bytes[valueStart] === 0);
        if (canContainDer && nestedStart < valueEnd) {
          try {
            const nested = parseElements(bytes, nestedStart, valueEnd, depth + 1);
            if (nested.length > 0) {
              node.children = nested;
              node.encapsulated = true;
            }
          } catch (_) {
            node.children = [];
          }
        }
      }
    
      return node;
    }

    function parseElementsUntilEndOfContent(bytes, offset, end, depth = 0) {
      const nodes = [];

      while (offset < end) {
        if (isEndOfContent(bytes, offset, end)) return { nodes, offset: offset + 2, eocStart: offset };

        const node = parseElement(bytes, offset, end, depth);
        if (node.end <= offset) throw new Error(`offset ${offset}: parser could not advance`);
        nodes.push(node);
        offset = node.end;
      }

      throw new Error(`offset ${offset}: missing EndOfContent for indefinite-length value`);
    }
    
    function indexNodes(nodes) {
      nodeById = new Map();
      nextNodeId = 1;
    
      function visit(node) {
        node.id = String(nextNodeId++);
        nodeById.set(node.id, node);
        for (const child of node.children) visit(child);
      }
    
      for (const node of nodes) visit(node);
    }
    
    function parseElements(bytes, offset, end, depth = 0) {
      const nodes = [];
      while (offset < end) {
        const node = parseElement(bytes, offset, end, depth);
        if (node.end <= offset) throw new Error(`offset ${offset}: parser could not advance`);
        nodes.push(node);
        offset = node.end;
      }
      if (offset !== end) throw new Error(`offset ${offset}: DER boundary mismatch`);
      return nodes;
    }
    
    function getNodeIconName(node) {
      if (node.encapsulated) return 'encapsulated';
      if (node.constructed || node.children.length > 0) return 'folder';
      return 'leaf';
    }
    
    function getVisibleChildren(node) {
      if (node.encapsulated) return [];
      if (!node.indefinite) return node.children;
      return [...node.children, createEndOfContentNode(node)];
    }

    function createEndOfContentNode(parent) {
      return {
        id: `${parent.id}-eoc`,
        eoc: true,
        tagClass: 0,
        constructed: false,
        tagNumber: 0,
        start: parent.valueEnd,
        headerLength: 2,
        length: 0,
        valueStart: parent.valueEnd + 2,
        valueEnd: parent.valueEnd + 2,
        end: parent.valueEnd + 2,
        depth: parent.depth + 1,
        children: [],
        encapsulated: false,
        valueBytes: new Uint8Array(),
        dirty: false,
        validationError: ''
      };
    }
    
    function getNodeLineParts(node) {
      const tagName = getTagName(node);
      const value = formatDisplayValue(node);
      const hex = formatDisplayHex(node);
      const oidComment = getOidComment(node);
      const encapsulatedLabel = getEncapsulatedLabel(node);
      return [
        tagName,
        `(${formatLengthText(node)})`,
        value,
        hex ? `// ${hex}` : '',
        oidComment ? `// ${oidComment}` : '',
        encapsulatedLabel
      ].filter(Boolean);
    }
    
    function getNodeLineText(node) {
      return getNodeLineParts(node).join(' ');
    }
    
    function renderNode(node) {
      const tagName = getTagName(node);
      const value = formatDisplayValue(node);
      const open = ' open';
      const icon = getNodeIconName(node);
      const hex = formatDisplayHex(node);
      const oidComment = getOidComment(node);
      const encapsulatedLabel = getEncapsulatedLabel(node);
      const lineParts = getNodeLineParts(node);
      const lineText = lineParts.join(' ');
      const truncatedLineText = truncateItemText(lineText);
      const isTruncated = truncatedLineText !== lineText;
      const valueMarkup = value ? `<span class="value">${escapeHtml(value)}</span>` : '';
      const hexMarkup = hex ? `<span class="hex">// ${escapeHtml(hex)}</span>` : '';
      const oidMarkup = oidComment ? `<span class="comment">// ${escapeHtml(oidComment)}</span>` : '';
      const encapsulated = encapsulatedLabel ? `<span class="pill constructed">${escapeHtml(encapsulatedLabel)}</span>` : '';
      const iconAttributes = node.eoc ? '' : `data-node-icon data-node-id="${node.id}"`;
      const nodeLineContent = isTruncated
        ? `<span class="tag">${escapeHtml(truncatedLineText)}</span>`
        : `
              <span class="tag">${escapeHtml(tagName)}</span>
            <span class="pill">(${escapeHtml(formatLengthText(node))})</span>
              ${valueMarkup}
              ${hexMarkup}
              ${oidMarkup}
              ${encapsulated}
            `;
      const visibleChildren = getVisibleChildren(node);
      const children = visibleChildren.length
        ? `<div class="children">${visibleChildren.map((child) => renderNode(child)).join('')}</div>`
        : '';
    
      return `
        <details class="node"${open}>
          <summary>
            <span class="node-toggle" data-node-toggle aria-hidden="true"><span class="toggle-closed">+</span><span class="toggle-open">−</span></span>
            <span class="icon ${icon}" ${iconAttributes} aria-hidden="true"></span>
            <span class="node-line">
              ${nodeLineContent}
            </span>
          </summary>
          <div class="content">
            <div class="field"><span>Tag</span>${escapeHtml(tagName)} (${node.tagNumber})</div>
            <div class="field"><span>Header</span>${node.headerLength} bytes</div>
            <div class="field"><span>Value range</span>${node.valueStart}..${node.valueEnd}</div>
            <div class="field"><span>Value</span>${escapeHtml(value)}</div>
          </div>
          ${children}
        </details>
      `;
    }
    
    function countNodes(nodes) {
      return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
    }
    
    function renderCurrentDocument() {
      if (currentNodes.length === 0) {
        viewer.classList.add('empty');
        viewer.innerHTML = 'All nodes have been deleted.';
        return;
      }
    
      viewer.classList.remove('empty');
      viewer.innerHTML = `<div class="tree">${currentNodes.map((node) => renderNode(node)).join('')}</div>`;
    }
    
    function rebuildDocumentFromModel() {
      currentBytes = encodeNodes(currentNodes);
      currentNodes = parseElements(currentBytes, 0, currentBytes.length);
      indexNodes(currentNodes);
      renderCurrentDocument();
    }

    function getNodeBytes(nodeId) {
      const node = nodeById.get(String(nodeId));
      if (!node) throw new Error('The node was not found');
      return encodeNode(node);
    }

    function getCheckedValue(name) {
      return scope.querySelector(`input[name="${name}"]:checked`)?.value || '';
    }
    
    function updateNodeValueBytes(nodeId, valueBytes) {
      const node = nodeById.get(nodeId);
      if (!node) throw new Error('The node to edit was not found');
      if (node.constructed) throw new Error('This node value cannot be edited directly');
    
      node.valueBytes = valueBytes;
      node.length = valueBytes.length;
      node.children = [];
      node.encapsulated = false;
      node.dirty = true;
      node.validationError = '';
      rebuildDocumentFromModel();
    }
    
    function removeNodeById(nodes, nodeId) {
      const index = nodes.findIndex((node) => node.id === nodeId);
      if (index >= 0) {
        nodes.splice(index, 1);
        return true;
      }
    
      return nodes.some((node) => removeNodeById(node.children, nodeId));
    }

    function insertNodeBeforeById(nodes, nodeId, newNode) {
      const index = nodes.findIndex((node) => node.id === nodeId);
      if (index >= 0) {
        nodes.splice(index, 0, newNode);
        return true;
      }

      return nodes.some((node) => insertNodeBeforeById(node.children, nodeId, newNode));
    }

    function createNodeFromDerForm() {
      const tagClass = Number(getCheckedValue('derClass'));
      const constructed = getCheckedValue('derMethod') === 'constructed';
      const tagNumber = Number(derIndex.value);

      if (!Number.isInteger(tagClass) || tagClass < 0 || tagClass > 3) throw new Error('Select a valid class');
      if (!Number.isSafeInteger(tagNumber) || tagNumber < 0) throw new Error('Index must be a non-negative integer');

      const valueBytes = constructed ? new Uint8Array() : hexToBytesAllowEmpty(derHex.value);
      return {
        tagClass,
        constructed,
        tagNumber,
        start: 0,
        headerLength: 0,
        length: valueBytes.length,
        valueStart: 0,
        valueEnd: valueBytes.length,
        end: 0,
        depth: 0,
        children: [],
        encapsulated: false,
        valueBytes,
        indefinite: constructed && derIndefinite.checked,
        dirty: true,
        validationError: ''
      };
    }

    function insertNodeBefore(targetNodeId, newNode) {
      if (!insertNodeBeforeById(currentNodes, targetNodeId, newNode)) throw new Error('The insertion point was not found');
      rebuildDocumentFromModel();
    }

    function addChildNode(parentNodeId, newNode) {
      const parent = nodeById.get(parentNodeId);
      if (!parent) throw new Error('The parent node was not found');
      if (!parent.constructed) throw new Error('Children can only be added to structured nodes');
      parent.children.push(newNode);
      rebuildDocumentFromModel();
    }

    function updateNodeIndefinite(nodeId, indefinite) {
      const node = nodeById.get(nodeId);
      if (!node) throw new Error('The node to update was not found');
      if (!node.constructed) throw new Error('Only structured nodes can use indefinite length');
      node.indefinite = indefinite;
      rebuildDocumentFromModel();
    }
    
    function deleteNode(nodeId) {
      const node = nodeById.get(nodeId);
      if (!node) throw new Error('The node to delete was not found');
      if (node.eoc) throw new Error('EndOfContent is controlled by the parent indefinite length setting');
      const tagName = getTagName(node);
      if (!removeNodeById(currentNodes, nodeId)) throw new Error('The node to delete could not be removed');
    
      rebuildDocumentFromModel();
      fileNotice.textContent = `Deleted ${tagName}.`;
    }
    
    function openExpandedDerWindow(node) {
      if (!node.encapsulated || node.children.length === 0) return;
    
      const expandedBytes = encodeNodes(node.children);
      const key = `pkistudio-expanded-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const payload = {
        label: `Encapsulated DER in ${getTagName(node)}`,
        bytes: bytesToBase64(expandedBytes)
      };
    
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (error) {
        fileNotice.textContent = `Could not send the encapsulated DER to a new window: ${error.message}`;
        return;
      }
    
      const url = new URL(window.location.href);
      url.searchParams.set('expand', key);
      url.hash = '';
    
      const expandedWindow = window.open(url.toString(), '_blank');
      if (!expandedWindow) {
        localStorage.removeItem(key);
        fileNotice.textContent = 'The encapsulated DER could not be opened because the popup was blocked.';
        return;
      }
    
      expandedWindow.opener = null;
    }
    
    function openNodeSubtreeWindow(node) {
      const subtreeBytes = encodeNode(node);
      const key = `pkistudio-subtree-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const payload = {
        label: `Subtree of ${getTagName(node)}`,
        bytes: bytesToBase64(subtreeBytes)
      };
    
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (error) {
        fileNotice.textContent = `Could not send the subtree to a new window: ${error.message}`;
        return;
      }
    
      const url = new URL(window.location.href);
      url.searchParams.delete('expand');
      url.searchParams.set('subtree', key);
      url.hash = '';
    
      const subtreeWindow = window.open(url.toString(), '_blank');
      if (!subtreeWindow) {
        localStorage.removeItem(key);
        fileNotice.textContent = 'The subtree could not be opened because the popup was blocked.';
        return;
      }
    
      subtreeWindow.opener = null;
    }
    
    async function writeClipboardText(text) {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
    
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
    
      try {
        if (!document.execCommand('copy')) throw new Error('copy command failed');
      } finally {
        textarea.remove();
      }
    }

    function downloadBytes(bytes, filename) {
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function saveBytesWithPicker(bytes, filename) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'DER file',
            accept: { 'application/octet-stream': ['.der'] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([bytes], { type: 'application/octet-stream' }));
      await writable.close();
      return handle.name || filename;
    }

    async function saveCurrentDerAsFile() {
      if (!currentBytes) {
        fileNotice.textContent = 'Load DER, PEM, or headerless base64 data before saving.';
        return;
      }

      const defaultName = 'pkistudio.der';

      if (window.showSaveFilePicker && window.isSecureContext) {
        try {
          const savedName = await saveBytesWithPicker(currentBytes, defaultName);
          fileNotice.textContent = `Saved DER as ${savedName}.`;
          return;
        } catch (error) {
          if (error.name === 'AbortError') {
            fileNotice.textContent = 'DER file save was canceled.';
            return;
          }
        }
      }

      const filename = window.prompt('Save DER file as', defaultName);
      if (filename === null) {
        fileNotice.textContent = 'DER file download was canceled.';
        return;
      }

      const trimmedFilename = filename.trim() || defaultName;
      downloadBytes(currentBytes, trimmedFilename);
      fileNotice.textContent = `Downloaded DER as ${trimmedFilename}.`;
    }
    
    async function readClipboardText() {
      if (!navigator.clipboard?.readText || !window.isSecureContext) {
        throw new Error('Clipboard reading is not available in this browser context');
      }
    
      return navigator.clipboard.readText();
    }
    
    function formatNodeTreeText(node, depth = 0) {
      const indent = '    '.repeat(depth);
      const valueDump = formatNodeTreeValueDump(node, depth + 1);
      if (valueDump) {
        if (!node.constructed && node.tagNumber !== 3 && node.tagNumber !== 4) {
          return [
            `${indent}${formatNodeTreeHeaderText(node)}`,
            valueDump
          ].join('\n');
        }

        return [
          `${indent}${formatNodeTreeHeaderText(node)} {`,
          valueDump,
          `${indent}}`
        ].join('\n');
      }
    
      const visibleChildren = getVisibleChildren(node);
      if (visibleChildren.length === 0) return `${indent}${getNodeLineText(node)}`;
    
      return [
        `${indent}${getNodeLineText(node)} {`,
        ...visibleChildren.map((child) => formatNodeTreeText(child, depth + 1)),
        `${indent}}`
      ].join('\n');
    }
    
    function formatNodeTreeHeaderText(node) {
      if (node.eoc) return getNodeLineText(node);

      if (node.tagClass === 0 && node.tagNumber === 3) {
        const valueBytes = getNodeValueBytes(node);
        const unusedBits = valueBytes.length ? valueBytes[0].toString(16).padStart(2, '0') : 'invalid';
        return `${getTagName(node)} (${formatLengthText(node)}) [${unusedBits}]`;
      }
    
      if (node.tagClass === 0 && node.tagNumber === 4) return `${getTagName(node)} (${formatLengthText(node)})`;
    
      return `${getTagName(node)} (${formatLengthText(node)})`;
    }
    
    function formatNodeTreeValueDump(node, depth) {
      if (node.eoc || node.constructed) return '';
    
      const valueBytes = getNodeValueBytes(node);
      const dumpBytes = node.tagNumber === 3 ? valueBytes.slice(1) : valueBytes;
      if (dumpBytes.length === 0) return '';
    
      return formatHexDumpLines(dumpBytes, depth);
    }
    
    function formatHexDumpLines(bytes, depth) {
      const indent = '    '.repeat(depth);
      const width = Math.max(6, (bytes.length - 1).toString(16).length);
      const lines = [];
    
      for (let offset = 0; offset < bytes.length; offset += 16) {
        const chunk = bytes.slice(offset, offset + 16);
        const start = offset.toString(16).padStart(width, '0');
        const end = (offset + chunk.length - 1).toString(16).padStart(width, '0');
        const hex = Array.from(chunk, (byte) => byte.toString(16).padStart(2, '0')).join(' ').padEnd(47, ' ');
        lines.push(`${indent}Hex:${start}-${end}: ${hex} //  ${toPrintableAscii(chunk)}`);
      }
    
      return lines.join('\n');
    }
    
    async function copyNodeAsHex(node) {
      const hex = toLowerHexString(encodeNode(node));
      await writeClipboardText(hex);
      fileNotice.textContent = `Copied DER hex for ${getTagName(node)} (${hex.length} characters).`;
    }
    
    async function copyNodeAsTree(node) {
      const treeText = formatNodeTreeText(node);
      await writeClipboardText(treeText);
      fileNotice.textContent = `Copied tree text for ${getTagName(node)} (${treeText.split('\n').length} lines).`;
    }
    
    function hideNodeContextMenu() {
      activeContextNodeId = null;
      nodeContextMenu.classList.remove('open-left');
      nodeContextMenu.querySelector('.context-menu-group')?.classList.remove('submenu-open');
      nodeContextMenu.querySelector('.context-submenu-trigger')?.setAttribute('aria-expanded', 'false');
      nodeContextMenu.hidden = true;
    }
    
    function setSendToSubmenuOpen(open) {
      const group = nodeContextMenu.querySelector('.context-menu-group');
      const trigger = nodeContextMenu.querySelector('.context-submenu-trigger');
      group?.classList.toggle('submenu-open', open);
      trigger?.setAttribute('aria-expanded', String(open));
    }
    
    function setRadioValue(name, value) {
      for (const input of scope.querySelectorAll(`input[name="${name}"]`)) {
        input.checked = input.value === String(value);
      }
    }
    
    function hideDerDialog() {
      activeDerNodeId = null;
      activeDerMode = 'view';
      derDialog.hidden = true;
    }
    
    function hideEditDialog() {
      activeEditNodeId = null;
      editDialog.hidden = true;
      editError.textContent = '';
    }
    
    function hideTimeDialog() {
      activeTimeNodeId = null;
      timeDialog.hidden = true;
      timeError.textContent = '';
    }
    
    function hideOctetDialog() {
      activeOctetNodeId = null;
      octetDialog.hidden = true;
      octetError.textContent = '';
      octetFileInput.value = '';
    }

    function showAboutDialog() {
      aboutDialog.hidden = false;
      aboutDialog.querySelector('[data-about-action="close"]')?.focus();
    }

    function hideAboutDialog() {
      aboutDialog.hidden = true;
    }
    
    function updateTimeOffsetControls() {
      const useLocal = timeForm.querySelector('input[name="timeZone"]:checked')?.value === 'local';
      timeOffsetSign.disabled = !useLocal;
      timeOffsetHours.disabled = !useLocal;
      timeOffsetMinutes.disabled = !useLocal;
    }

    function setDerDialogCreateMode(createMode) {
      for (const input of derForm.querySelectorAll('input[name="derClass"], input[name="derMethod"]')) {
        input.disabled = !createMode;
      }

      derIndex.readOnly = !createMode;
      derHex.readOnly = !createMode;
      derForm.querySelector('[data-der-action="edit-content"]').hidden = createMode;
      derIndefinite.disabled = true;
    }

    function updateDerCreatePreview() {
      if (activeDerMode === 'view') return;

      const constructed = getCheckedValue('derMethod') === 'constructed';
      derHex.readOnly = constructed;
      derIndefinite.disabled = !constructed;
      if (constructed) {
        derLength.value = derIndefinite.checked ? 'Indefinite' : '0';
        derValuePreview.textContent = derIndefinite.checked ? 'Structured content ends with EndOfContent.' : 'Structured content starts empty.';
        return;
      }

      derIndefinite.checked = false;

      try {
        const valueBytes = hexToBytesAllowEmpty(derHex.value);
        derLength.value = String(valueBytes.length);
        derValuePreview.textContent = valueBytes.length ? `${valueBytes.length} byte${valueBytes.length === 1 ? '' : 's'}` : '(empty)';
      } catch (error) {
        derLength.value = '';
        derValuePreview.textContent = error.message;
      }
    }
    
    function showDerDialog(node) {
      activeDerMode = 'view';
      activeDerNodeId = node.id;
      const tagName = getTagName(node);
      const valueBytes = getNodeValueBytes(node);
      const editButton = derForm.querySelector('[data-der-action="edit-content"]');
      setDerDialogCreateMode(false);
    
      derTitle.textContent = 'Edit DER';
      derIndex.value = node.tagNumber;
      derIndefinite.checked = Boolean(node.indefinite);
      derIndefinite.disabled = !node.constructed;
      derLength.value = formatLengthText(node);
      derTagName.textContent = tagName;
      derValuePreview.textContent = describeValue(node);
      derHex.value = toCompactHex(valueBytes, DER_CONTENT_HEX_LIMIT);
      editButton.disabled = !isEditableNode(node);
      editButton.title = editButton.disabled ? `${tagName} cannot be edited in detail yet` : '';
      setRadioValue('derClass', node.tagClass);
      setRadioValue('derMethod', node.constructed ? 'constructed' : 'primitive');
      derDialog.hidden = false;
      editButton.focus();
    }

    function showCreateDerDialog(mode, node) {
      activeDerMode = mode;
      activeDerNodeId = node.id;
      setDerDialogCreateMode(true);
      derTitle.textContent = mode === 'add-child' ? `Add child to ${getTagName(node)}` : `Insert before ${getTagName(node)}`;
      derIndex.value = '4';
      derIndefinite.checked = false;
      derIndefinite.disabled = true;
      derTagName.textContent = 'OCTET STRING';
      derHex.value = '';
      setRadioValue('derClass', 0);
      setRadioValue('derMethod', 'primitive');
      updateDerCreatePreview();
      derDialog.hidden = false;
      derIndex.focus();
      derIndex.select();
    }
    
    function showEditDialog(node) {
      if (!isEditableNode(node)) {
        fileNotice.textContent = `${getTagName(node)} cannot be edited yet.`;
        return;
      }
    
      activeEditNodeId = node.id;
      editTitle.textContent = `Edit ${getTagName(node)}`;
      editValue.value = getEditableNodeText(node);
      editError.textContent = '';
      editDialog.hidden = false;
      editValue.focus();
      editValue.select();
    }
    
    function showTimeDialog(node) {
      if (!isEditableTimeNode(node)) {
        showEditDialog(node);
        return;
      }
    
      try {
        const timeParts = parseDerTime(node, getEditableNodeText(node));
        activeTimeNodeId = node.id;
        timeTitle.textContent = 'Time';
        timeDate.value = formatDateInput(timeParts);
        timeClock.value = formatTimeInput(timeParts);
        timeZeroOmitted.checked = timeParts.second === 0;
        timeFractions.value = '';
        timeError.textContent = '';
        setRadioValue('timeTag', node.tagNumber);
        setRadioValue('timeZone', timeParts.zone);
        timeOffsetSign.value = timeParts.offsetSign;
        timeOffsetHours.value = String(timeParts.offsetHours);
        timeOffsetMinutes.value = String(timeParts.offsetMinutes);
        updateTimeOffsetControls();
        timeDialog.hidden = false;
        timeDate.focus();
      } catch (error) {
        showEditDialog(node);
        editError.textContent = error.message;
      }
    }
    
    function showOctetDialog(node) {
      if (!isEditableNode(node)) {
        showEditDialog(node);
        return;
      }
    
      activeOctetNodeId = node.id;
      octetTitle.textContent = `${getTagName(node)} (HEX)`;
      const valueBytes = getNodeValueBytes(node);
      const isBitString = isEditableBitStringNode(node);
      bitUnusedRow.hidden = !isBitString;
      bitUnusedBits.value = isBitString ? String(valueBytes.length ? valueBytes[0] : 0) : '0';
      octetHex.value = toLowerHexString(isBitString ? valueBytes.slice(1) : valueBytes);
      octetError.textContent = '';
      octetFileInput.value = '';
      octetDialog.hidden = false;
      octetHex.focus();
      octetHex.select();
    }
    
    function showDetailedEditDialog(node) {
      if (isEditableBinaryNode(node)) {
        showOctetDialog(node);
        return;
      }
    
      if (isEditableTimeNode(node)) {
        showTimeDialog(node);
        return;
      }
    
      if (isEditableTextNode(node) || isEditableOidNode(node)) {
        showEditDialog(node);
        return;
      }
    
      showOctetDialog(node);
    }
    
    function showNodeContextMenu(nodeId, x, y) {
      const node = nodeById.get(nodeId);
      const addButton = nodeContextMenu.querySelector('[data-node-action="add-child"]');
      const extractedButton = nodeContextMenu.querySelector('[data-node-action="send-new-window-extracted"]');
      addButton.hidden = !node?.constructed;
      extractedButton.hidden = !(node?.encapsulated && node.children.length > 0);
      activeContextNodeId = nodeId;
      setSendToSubmenuOpen(false);
      nodeContextMenu.classList.remove('open-left');
      nodeContextMenu.hidden = false;
    
      const menuRect = nodeContextMenu.getBoundingClientRect();
      nodeContextMenu.classList.toggle('open-left', x + menuRect.width + 150 > window.innerWidth - 8);
      const left = Math.min(x, window.innerWidth - menuRect.width - 8);
      const top = Math.min(y, window.innerHeight - menuRect.height - 8);
      nodeContextMenu.style.left = `${Math.max(8, left)}px`;
      nodeContextMenu.style.top = `${Math.max(8, top)}px`;
    }
    
    function closeDocument() {
      fileInput.value = '';
      currentBytes = null;
      currentNodes = [];
      nodeById = new Map();
      hideNodeContextMenu();
      hideDerDialog();
      hideEditDialog();
      hideTimeDialog();
      hideOctetDialog();
      viewer.classList.add('empty');
      viewer.innerHTML = 'No DER / PEM file selected yet.';
      fileNotice.textContent = 'PEM and headerless base64 input are decoded before parsing.';
    }
    
    async function renderFile(file) {
      try {
        const result = getDerBytes(new Uint8Array(await file.arrayBuffer()));
        const { bytes, format } = result;
        renderDerBytes(bytes, `Loaded as a ${format} file.`);
      } catch (error) {
        currentBytes = null;
        currentNodes = [];
        nodeById = new Map();
        hideNodeContextMenu();
        hideDerDialog();
        hideEditDialog();
        hideTimeDialog();
        hideOctetDialog();
        viewer.classList.remove('empty');
        viewer.innerHTML = `<div class="error"><strong>Could not parse as DER.</strong><br>${escapeHtml(error.message)}</div>`;
      }
    }
    
    async function loadClipboardAsPem() {
      try {
        const text = await readClipboardText();
        const bytes = isPemText(text) ? decodePem(text) : decodeHeaderlessPem(text);
        renderDerBytes(bytes, `Loaded ${isPemText(text) ? 'PEM' : 'headerless PEM'} from the clipboard.`);
      } catch (error) {
        fileNotice.textContent = `Could not load PEM from the clipboard: ${error.message}`;
      }
    }
    
    async function loadClipboardAsHex() {
      try {
        const text = await readClipboardText();
        renderDerBytes(hexToBytes(text), 'Loaded HEX from the clipboard.');
      } catch (error) {
        fileNotice.textContent = `Could not load HEX from the clipboard: ${error.message}`;
      }
    }
    
    function renderDerBytes(bytes, notice) {
      const nodes = parseElements(bytes, 0, bytes.length);
      const encodedBytes = encodeNodes(nodes);
      if (!bytesEqual(encodedBytes, bytes)) throw new Error('The re-encoded DER does not match the original data');
      currentBytes = encodedBytes;
      currentNodes = parseElements(currentBytes, 0, currentBytes.length);
      indexNodes(currentNodes);
      hideNodeContextMenu();
      hideDerDialog();
      hideEditDialog();
      hideTimeDialog();
      hideOctetDialog();
      renderCurrentDocument();
      fileNotice.textContent = notice;
    }
    
    function loadExpandedDocument() {
      const url = new URL(window.location.href);
      const transferType = url.searchParams.has('subtree') ? 'subtree' : 'expand';
      const key = url.searchParams.get(transferType);
      if (!key) return;
    
      try {
        const payload = JSON.parse(localStorage.getItem(key) || 'null');
        localStorage.removeItem(key);
        if (!payload?.bytes) throw new Error('Expanded data was not found');
        renderDerBytes(base64ToBytes(payload.bytes), `Displayed ${payload.label || 'DER'}.`);
      } catch (error) {
        viewer.classList.remove('empty');
        viewer.innerHTML = `<div class="error"><strong>Could not display the new-window data.</strong><br>${escapeHtml(error.message)}</div>`;
      } finally {
        url.searchParams.delete(transferType);
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
    
    loadOidNames();
    loadExpandedDocument();

    function setAllTreeNodesOpen(open) {
      for (const details of viewer.querySelectorAll('details.node')) details.open = open;
      hideNodeContextMenu();
      fileNotice.textContent = open ? 'Expanded all tree nodes.' : 'Collapsed all tree nodes.';
    }
    
    function hideLoadMenu() {
      loadMenu.hidden = true;
      menu.querySelector('[data-action="toggle-load-menu"]')?.setAttribute('aria-expanded', 'false');
    }

    function hideSaveMenu() {
      saveMenu.hidden = true;
      menu.querySelector('[data-action="toggle-save-menu"]')?.setAttribute('aria-expanded', 'false');
    }

    function hideToolsMenu() {
      toolsMenu.hidden = true;
      menu.querySelector('[data-action="toggle-tools-menu"]')?.setAttribute('aria-expanded', 'false');
    }

    function hideTopMenus() {
      hideLoadMenu();
      hideSaveMenu();
      hideToolsMenu();
    }
    
    function toggleTopMenu(buttonAction, submenu) {
      const button = menu.querySelector(`[data-action="${buttonAction}"]`);
      const willOpen = submenu.hidden;
      hideTopMenus();
      submenu.hidden = !willOpen;
      button?.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) submenu.querySelector('button')?.focus();
    }
    
    menu.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
    
      if (button.dataset.action === 'toggle-load-menu') {
        toggleTopMenu('toggle-load-menu', loadMenu);
      } else if (button.dataset.action === 'toggle-save-menu') {
        toggleTopMenu('toggle-save-menu', saveMenu);
      } else if (button.dataset.action === 'toggle-tools-menu') {
        toggleTopMenu('toggle-tools-menu', toolsMenu);
      } else if (button.dataset.action === 'open') {
        hideTopMenus();
        fileInput.click();
      } else if (button.dataset.action === 'load-clipboard-pem') {
        hideTopMenus();
        await loadClipboardAsPem();
      } else if (button.dataset.action === 'load-clipboard-hex') {
        hideTopMenus();
        await loadClipboardAsHex();
      } else if (button.dataset.action === 'save-der-file') {
        hideTopMenus();
        await saveCurrentDerAsFile();
      } else if (button.dataset.action === 'expand-all') {
        hideTopMenus();
        setAllTreeNodesOpen(true);
      } else if (button.dataset.action === 'collapse-all') {
        hideTopMenus();
        setAllTreeNodesOpen(false);
      } else if (button.dataset.action === 'close') {
        hideTopMenus();
        closeDocument();
      } else if (button.dataset.action === 'about') {
        hideTopMenus();
        showAboutDialog();
      }
    });
    
    viewer.addEventListener('click', (event) => {
      const summary = event.target.closest('summary');
      const toggle = event.target.closest('[data-node-toggle]');
      if (summary) event.preventDefault();
    
      if (toggle) {
        event.stopPropagation();
        hideNodeContextMenu();
        const details = toggle.closest('details.node');
        if (details && details.querySelector('.children')) details.open = !details.open;
        return;
      }
    
      const icon = event.target.closest('.icon[data-node-icon]');
      if (!icon) {
        hideNodeContextMenu();
        return;
      }
    
      event.preventDefault();
      event.stopPropagation();
      showNodeContextMenu(icon.dataset.nodeId, event.clientX, event.clientY);
    });
    
    nodeContextMenu.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-node-action]');
      if (!button) return;
    
      if (button.dataset.nodeAction === 'send-to') {
        event.preventDefault();
        const isOpen = button.closest('.context-menu-group')?.classList.contains('submenu-open');
        setSendToSubmenuOpen(!isOpen);
        return;
      }
    
      const nodeId = activeContextNodeId;
      const node = nodeById.get(activeContextNodeId);
      hideNodeContextMenu();
      if (!node) return;
    
      if (button.dataset.nodeAction === 'edit') {
        showDerDialog(node);
      } else if (button.dataset.nodeAction === 'insert-before') {
        showCreateDerDialog('insert-before', node);
      } else if (button.dataset.nodeAction === 'add-child') {
        if (node.constructed) showCreateDerDialog('add-child', node);
      } else if (button.dataset.nodeAction === 'send-new-window') {
        openNodeSubtreeWindow(node);
      } else if (button.dataset.nodeAction === 'send-new-window-extracted') {
        openExpandedDerWindow(node);
      } else if (button.dataset.nodeAction === 'copy-hex') {
        try {
          await copyNodeAsHex(node);
        } catch (error) {
          fileNotice.textContent = `Could not copy to the clipboard: ${error.message}`;
        }
      } else if (button.dataset.nodeAction === 'copy-tree') {
        try {
          await copyNodeAsTree(node);
        } catch (error) {
          fileNotice.textContent = `Could not copy to the clipboard: ${error.message}`;
        }
      } else if (button.dataset.nodeAction === 'delete') {
        deleteNode(nodeId);
      }
    });
    
    nodeContextMenu.addEventListener('pointerover', (event) => {
      const button = event.target.closest('button[data-node-action]');
      if (!button) return;
      if (button.dataset.nodeAction === 'send-to' || button.closest('.node-context-submenu')) {
        setSendToSubmenuOpen(true);
      } else {
        setSendToSubmenuOpen(false);
      }
    });
    
    nodeContextMenu.addEventListener('focusin', (event) => {
      const button = event.target.closest('button[data-node-action]');
      if (!button) return;
      setSendToSubmenuOpen(button.dataset.nodeAction === 'send-to' || Boolean(button.closest('.node-context-submenu')));
    });
    
    derForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (activeDerMode === 'insert-before' || activeDerMode === 'add-child') {
        try {
          const targetNodeId = activeDerNodeId;
          const newNode = createNodeFromDerForm();
          const tagName = getTagName(newNode);
          if (activeDerMode === 'insert-before') {
            insertNodeBefore(targetNodeId, newNode);
            fileNotice.textContent = `Inserted ${tagName}.`;
          } else {
            addChildNode(targetNodeId, newNode);
            fileNotice.textContent = `Added ${tagName}.`;
          }
          hideDerDialog();
        } catch (error) {
          derValuePreview.textContent = error.message;
        }
        return;
      }

      const node = nodeById.get(activeDerNodeId);
      if (node?.constructed && node.indefinite !== derIndefinite.checked) {
        try {
          const tagName = getTagName(node);
          updateNodeIndefinite(node.id, derIndefinite.checked);
          fileNotice.textContent = `${tagName} length set to ${derIndefinite.checked ? 'Indefinite' : 'definite'}.`;
        } catch (error) {
          derValuePreview.textContent = error.message;
          return;
        }
      }

      hideDerDialog();
    });

    derForm.addEventListener('input', (event) => {
      if (activeDerMode === 'view') return;
      if (event.target === derIndex) {
        const previewNode = {
          tagClass: Number(getCheckedValue('derClass')),
          tagNumber: Number(derIndex.value),
          constructed: getCheckedValue('derMethod') === 'constructed'
        };
        derTagName.textContent = Number.isSafeInteger(previewNode.tagNumber) && previewNode.tagNumber >= 0 ? getTagName(previewNode) : '';
      }
      updateDerCreatePreview();
    });

    derForm.addEventListener('change', (event) => {
      if (activeDerMode === 'view') return;
      if (event.target.name === 'derClass' || event.target.name === 'derMethod') {
        const previewNode = {
          tagClass: Number(getCheckedValue('derClass')),
          tagNumber: Number(derIndex.value),
          constructed: getCheckedValue('derMethod') === 'constructed'
        };
        derTagName.textContent = Number.isSafeInteger(previewNode.tagNumber) && previewNode.tagNumber >= 0 ? getTagName(previewNode) : '';
      }
      updateDerCreatePreview();
    });
    
    derForm.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-der-action]');
      if (!button) return;
    
      if (button.dataset.derAction === 'cancel') {
        hideDerDialog();
        return;
      }
    
      if (button.dataset.derAction === 'edit-content') {
        const node = nodeById.get(activeDerNodeId);
        if (!node) {
          hideDerDialog();
          return;
        }
    
        hideDerDialog();
        showDetailedEditDialog(node);
      }
    });
    
    derDialog.addEventListener('click', (event) => {
      if (event.target === derDialog) hideDerDialog();
    });
    
    timeForm.addEventListener('change', (event) => {
      if (event.target.name === 'timeZone') updateTimeOffsetControls();
    });
    
    timeForm.addEventListener('submit', (event) => {
      event.preventDefault();
    
      const node = nodeById.get(activeTimeNodeId);
      if (!node) {
        hideTimeDialog();
        return;
      }
    
      try {
        const encoded = encodeDerTime(node, getTimeFormParts());
        updateNodeValueBytes(node.id, new TextEncoder().encode(encoded));
        hideTimeDialog();
        fileNotice.textContent = `Updated ${getTagName(node)}.`;
      } catch (error) {
        timeError.textContent = error.message;
      }
    });
    
    timeForm.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-time-action="cancel"]');
      if (button) hideTimeDialog();
    });
    
    timeDialog.addEventListener('click', (event) => {
      if (event.target === timeDialog) hideTimeDialog();
    });
    
    octetForm.addEventListener('submit', (event) => {
      event.preventDefault();
    
      const node = nodeById.get(activeOctetNodeId);
      if (!node) {
        hideOctetDialog();
        return;
      }
    
      try {
        let valueBytes;
        if (isEditableBitStringNode(node)) {
          const unusedBits = Number(bitUnusedBits.value);
          if (!Number.isInteger(unusedBits) || unusedBits < 0 || unusedBits > 7) throw new Error('Unused bits must be an integer from 0 to 7');
          const bitBytes = hexToBytesAllowEmpty(octetHex.value);
          if (bitBytes.length === 0 && unusedBits !== 0) throw new Error('Unused bits must be 0 when the data is empty');
          valueBytes = concatBytes([new Uint8Array([unusedBits]), bitBytes]);
        } else {
          valueBytes = hexToBytesAllowEmpty(octetHex.value);
        }
        const tagName = getTagName(node);
        updateNodeValueBytes(node.id, valueBytes);
        hideOctetDialog();
        fileNotice.textContent = `Updated ${tagName}.`;
      } catch (error) {
        octetError.textContent = error.message;
      }
    });
    
    octetForm.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-octet-action]');
      if (!button) return;
    
      if (button.dataset.octetAction === 'cancel') {
        hideOctetDialog();
      } else if (button.dataset.octetAction === 'load-file') {
        octetFileInput.click();
      }
    });
    
    octetFileInput.addEventListener('change', async () => {
      const [file] = octetFileInput.files;
      if (!file) return;
    
      try {
        octetHex.value = toLowerHexString(new Uint8Array(await file.arrayBuffer()));
        octetError.textContent = '';
      } catch (error) {
        octetError.textContent = `Could not load the file: ${error.message}`;
      } finally {
        octetFileInput.value = '';
      }
    });
    
    octetDialog.addEventListener('click', (event) => {
      if (event.target === octetDialog) hideOctetDialog();
    });
    
    editForm.addEventListener('submit', (event) => {
      event.preventDefault();
    
      const node = nodeById.get(activeEditNodeId);
      if (!node) {
        hideEditDialog();
        return;
      }
    
      try {
        const valueBytes = encodeEditableNodeValue(node, editValue.value);
        const tagName = getTagName(node);
        updateNodeValueBytes(node.id, valueBytes);
        hideEditDialog();
        fileNotice.textContent = `Updated ${tagName}.`;
      } catch (error) {
        editError.textContent = error.message;
      }
    });
    
    editForm.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-edit-action="cancel"]');
      if (button) hideEditDialog();
    });
    
    editDialog.addEventListener('click', (event) => {
      if (event.target === editDialog) hideEditDialog();
    });

    aboutDialog.addEventListener('click', (event) => {
      if (event.target === aboutDialog || event.target.closest('[data-about-action="close"]')) hideAboutDialog();
    });
    
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideNodeContextMenu();
        hideDerDialog();
        hideEditDialog();
        hideTimeDialog();
        hideOctetDialog();
        hideAboutDialog();
        hideTopMenus();
      }
    });
    
    scope.addEventListener('click', (event) => {
      if (!event.target.closest('#nodeContextMenu')) hideNodeContextMenu();
      if (!event.target.closest('.menu-group')) hideTopMenus();
    });
    
    window.addEventListener('resize', hideNodeContextMenu);
    window.addEventListener('scroll', hideNodeContextMenu, true);
    window.addEventListener('resize', hideTopMenus);
    window.addEventListener('scroll', hideTopMenus, true);
    
    fileInput.addEventListener('change', () => {
      const [file] = fileInput.files;
      if (file) renderFile(file);
    });
    
    for (const eventName of ['dragenter', 'dragover']) {
      viewer.addEventListener(eventName, (event) => {
        event.preventDefault();
        viewer.classList.add('dragover');
      });
    }
    
    for (const eventName of ['dragleave', 'drop']) {
      viewer.addEventListener(eventName, (event) => {
        event.preventDefault();
        viewer.classList.remove('dragover');
      });
    }
    
    viewer.addEventListener('drop', (event) => {
      const [file] = event.dataTransfer.files;
      if (file) renderFile(file);
    });

    return {
      close: closeDocument,
      getNodeBytes,
      loadBytes: renderDerBytes,
      mount,
      root: scope
    };
  }

  window.PkiStudio = {
    core: window.PkiStudioCore || null,
    init,
    version: APP_VERSION
  };

  function autoInit() {
    if (defaultInstance || document.querySelector('script[data-pkistudio-auto-init="false"]')) return;
    const mount = document.querySelector('[data-pkistudio-mount], [data-pkistudio], #pkistudio');
    if (!mount) return;
    defaultInstance = init({ mount });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit, { once: true });
  } else {
    autoInit();
  }
})();
