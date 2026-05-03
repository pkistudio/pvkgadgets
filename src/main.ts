import './styles.css';
import * as asn1js from 'asn1js';
import { AttributeTypeAndValue, CertificationRequest, RelativeDistinguishedNames } from 'pkijs';
import { readPkcs12Keys, type Pkcs12KeyMaterial } from './pkcs12';

type PkiStudioInstance = {
  getBytes?: () => Uint8Array | null;
  loadBytes: (bytes: Uint8Array, notice?: string) => void;
  root?: DocumentFragment | Element;
};

type PkiStudioApi = {
  init: (options: { mount: string | Element; oidUrl?: string; shadowRoot?: boolean; newWindowUrl?: string }) => PkiStudioInstance;
};

declare global {
  interface Window {
    PkiStudio?: PkiStudioApi;
  }
}

type CsrMaterial = {
  id: string;
  label: string;
  subjectDn: string;
  hashAlgorithm: string;
  bytes: Uint8Array;
};

type SubjectDnMaterial = {
  id: string;
  label: string;
  subjectDn: string;
  bytes: Uint8Array;
};

type KeyMaterial = Pkcs12KeyMaterial & {
  csrs?: CsrMaterial[];
  subjectDns?: SubjectDnMaterial[];
};

type KeyNodeKind = 'private' | 'public' | 'certificate' | 'csr' | 'subjectdn';

type SelectedKeyNode = {
  keyId: string;
  kind: KeyNodeKind;
  csrId?: string;
  subjectDnId?: string;
};

type RecognizedKeyInfo = {
  family: 'RSA' | 'EC' | 'Ed25519' | 'Ed448' | 'X25519' | 'X448' | 'Unknown';
  label: string;
  canSign: boolean;
  canDerive: boolean;
  namedCurve?: string;
};

type DerNode = {
  tagClass: number;
  tagNumber: number;
  constructed: boolean;
  contentStart: number;
  contentEnd: number;
  end: number;
  children: DerNode[];
};

type KeyAlgorithmCandidate = {
  id: string;
  canonicalId: string;
  canonicalLabel: string;
  algorithm: AlgorithmIdentifier | RsaHashedKeyGenParams | EcKeyGenParams;
  usages: KeyUsage[];
};

type SupportedKeyAlgorithm = KeyAlgorithmCandidate;

const KEY_ALGORITHM_CANDIDATES: KeyAlgorithmCandidate[] = [
  ...createRsaCandidates('RSASSA-PKCS1-v1_5', 'SHA-256', ['sign', 'verify']),
  ...createRsaCandidates('RSA-PSS', 'SHA-256', ['sign', 'verify']),
  ...createRsaCandidates('RSA-OAEP', 'SHA-256', ['encrypt', 'decrypt']),
  ...createNamedCurveCandidates('ECDSA', ['P-256', 'P-384', 'P-521'], ['sign', 'verify']),
  ...createNamedCurveCandidates('ECDH', ['P-256', 'P-384', 'P-521'], ['deriveBits']),
  ...createNamedCurveCandidates('Ed25519', ['Ed25519'], ['sign', 'verify']),
  ...createNamedCurveCandidates('Ed448', ['Ed448'], ['sign', 'verify']),
  ...createNamedCurveCandidates('X25519', ['X25519'], ['deriveBits']),
  ...createNamedCurveCandidates('X448', ['X448'], ['deriveBits'])
];

const EMBEDDED_VIEWER_STYLES = `
:host {
  min-height: 0 !important;
  height: 100%;
  background: transparent !important;
}

main {
  display: flex;
  flex-direction: column;
  width: 100% !important;
  height: 100%;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
}

.menu {
  position: relative !important;
  flex: 0 0 auto;
  border-radius: 3px 3px 0 0 !important;
}

.card {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  border-radius: 0 0 3px 3px !important;
  box-shadow: none !important;
}

.picker {
  display: none !important;
}

.viewer {
  flex: 1 1 auto;
  min-height: 420px !important;
  max-height: none !important;
}

@media (max-width: 820px) {
  .viewer {
    min-height: 520px !important;
  }
}
`;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('App mount was not found');

app.innerHTML = `
  <main class="shell">
    <nav class="toolbar" aria-label="Application">
      <strong>Private Key Gadgets</strong>
    </nav>
    <section class="workspace">
      <section class="panel key-panel" aria-label="Generated key material">
        <nav class="key-menu" aria-label="Key actions">
          <div class="menu-group">
            <button id="newKeyButton" type="button" aria-haspopup="menu" aria-expanded="false">New Key</button>
            <div id="algorithmMenu" class="submenu" role="menu" hidden></div>
          </div>
          <button id="openKeyButton" type="button">Open Key</button>
          <input id="openKeyInput" class="visually-hidden" type="file" accept=".p12,.pfx,application/pkcs12,application/x-pkcs12" />
        </nav>
        <div id="privateKeyMenu" class="node-context-menu" role="menu" hidden>
          <button id="newCsrMenuItem" type="button" role="menuitem">New CSR</button>
        </div>
        <div id="keyPairMenu" class="node-context-menu" role="menu" hidden>
          <button id="newSubjectDnMenuItem" type="button" role="menuitem">New SubjectDN</button>
        </div>
        <div id="keyTree" class="tree empty">No key generated yet.</div>
        <p id="formNotice" class="notice">Generated DER is sent to the ASN.1 viewer.</p>
      </section>
      <section class="viewer-panel panel" aria-label="ASN.1 viewer">
        <div id="viewerMount"></div>
      </section>
    </section>
    <dialog id="pkcs12PasswordDialog" class="password-dialog">
      <form method="dialog" class="password-panel">
        <h2 id="pkcs12PasswordTitle">Open PKCS#12</h2>
        <label class="password-field">
          <span>Password</span>
          <input id="pkcs12PasswordInput" type="password" autocomplete="current-password" />
        </label>
        <div class="dialog-actions">
          <button type="submit" value="cancel">Cancel</button>
          <button type="submit" value="open">Open</button>
        </div>
      </form>
    </dialog>
    <dialog id="csrDialog" class="password-dialog">
      <form method="dialog" class="password-panel">
        <h2>New CSR</h2>
        <label class="password-field">
          <span>subjectDN</span>
          <input id="csrSubjectInput" type="text" autocomplete="off" placeholder="CN=example.com, O=Example, C=JP" />
        </label>
        <label class="password-field">
          <span>Hash algorithm</span>
          <select id="csrHashSelect"></select>
        </label>
        <div class="dialog-actions">
          <button type="submit" value="cancel">Cancel</button>
          <button type="submit" value="create">Create</button>
        </div>
      </form>
    </dialog>
    <dialog id="subjectDnDialog" class="password-dialog">
      <form method="dialog" class="password-panel">
        <h2>New SubjectDN</h2>
        <label class="password-field">
          <span>subjectDN</span>
          <input id="subjectDnInput" type="text" autocomplete="off" placeholder="CN=example.com, O=Example, C=JP" />
        </label>
        <div class="dialog-actions">
          <button type="submit" value="cancel">Cancel</button>
          <button type="submit" value="create">Create</button>
        </div>
      </form>
    </dialog>
  </main>
`;

const newKeyButton = query<HTMLButtonElement>('#newKeyButton');
const openKeyButton = query<HTMLButtonElement>('#openKeyButton');
const openKeyInput = query<HTMLInputElement>('#openKeyInput');
const algorithmMenu = query<HTMLDivElement>('#algorithmMenu');
const privateKeyMenu = query<HTMLDivElement>('#privateKeyMenu');
const newCsrMenuItem = query<HTMLButtonElement>('#newCsrMenuItem');
const keyPairMenu = query<HTMLDivElement>('#keyPairMenu');
const newSubjectDnMenuItem = query<HTMLButtonElement>('#newSubjectDnMenuItem');
const keyTree = query<HTMLElement>('#keyTree');
const formNotice = query<HTMLElement>('#formNotice');
const pkcs12PasswordDialog = query<HTMLDialogElement>('#pkcs12PasswordDialog');
const pkcs12PasswordTitle = query<HTMLElement>('#pkcs12PasswordTitle');
const pkcs12PasswordInput = query<HTMLInputElement>('#pkcs12PasswordInput');
const csrDialog = query<HTMLDialogElement>('#csrDialog');
const csrSubjectInput = query<HTMLInputElement>('#csrSubjectInput');
const csrHashSelect = query<HTMLSelectElement>('#csrHashSelect');
const subjectDnDialog = query<HTMLDialogElement>('#subjectDnDialog');
const subjectDnInput = query<HTMLInputElement>('#subjectDnInput');

let viewer: PkiStudioInstance | null = null;
let keyMaterials: KeyMaterial[] = [];
let selectedNode: SelectedKeyNode | null = null;
let supportedAlgorithms: SupportedKeyAlgorithm[] = [];
let privateKeyMenuKeyId: string | null = null;
let keyPairMenuKeyId: string | null = null;

const CSR_HASH_ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512'];

setBusy(true);

window.addEventListener('DOMContentLoaded', async () => {
  if (!window.PkiStudio) {
    setNotice('pkistudiojs viewer could not be loaded.', true);
    return;
  }

  viewer = window.PkiStudio.init({
    mount: '#viewerMount',
    oidUrl: '/vendor/pkistudiojs/oids.json',
    newWindowUrl: '/viewer.html'
  });
  applyEmbeddedViewerStyles(viewer);
  listenForViewerChanges(viewer);

  await populateSupportedAlgorithms();
});

newKeyButton.addEventListener('click', () => {
  if (newKeyButton.disabled) return;
  setAlgorithmMenuOpen(algorithmMenu.hidden);
});

algorithmMenu.addEventListener('click', async (event) => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-algorithm]') : null;
  if (!button) return;

  setAlgorithmMenuOpen(false);
  await generateKeyPair(button.dataset.algorithm ?? '');
});

openKeyButton.addEventListener('click', () => {
  if (openKeyButton.disabled) return;
  setAlgorithmMenuOpen(false);
  openKeyInput.click();
});

openKeyInput.addEventListener('change', async () => {
  const [file] = openKeyInput.files ?? [];
  openKeyInput.value = '';
  if (!file) return;

  const password = await requestPkcs12Password(file.name);
  if (password === null) return;

  await openPkcs12File(file, password);
});

newCsrMenuItem.addEventListener('click', async () => {
  const keyId = privateKeyMenuKeyId;
  setPrivateKeyMenuOpen(false);
  if (!keyId) return;

  const options = await requestCsrOptions();
  if (!options) return;

  await createCsr(keyId, options.subjectDn, options.hashAlgorithm);
});

newSubjectDnMenuItem.addEventListener('click', async () => {
  const keyId = keyPairMenuKeyId;
  setKeyPairMenuOpen(false);
  if (!keyId) return;

  const subjectDn = await requestSubjectDn();
  if (subjectDn === null) return;

  createSubjectDn(keyId, subjectDn);
});

keyTree.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('[data-key-label]')) return;

  const keyPairMenuButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-keypair-menu]') : null;
  if (keyPairMenuButton) {
    event.preventDefault();
    event.stopPropagation();
    const keyId = keyPairMenuButton.dataset.keyId ?? '';
    setKeyPairMenuOpen(keyPairMenuKeyId !== keyId || keyPairMenu.hidden, keyId, keyPairMenuButton);
    return;
  }

  const privateMenuButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-private-menu]') : null;
  if (privateMenuButton) {
    event.preventDefault();
    event.stopPropagation();
    const keyId = privateMenuButton.dataset.keyId ?? '';
    setPrivateKeyMenuOpen(privateKeyMenuKeyId !== keyId || privateKeyMenu.hidden, keyId, privateMenuButton);
    return;
  }

  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-key-node]') : null;
  if (!button) return;

  selectKeyNode(button.dataset.keyId ?? '', button.dataset.keyNode as KeyNodeKind, button.dataset.csrId, button.dataset.subjectDnId);
});

keyTree.addEventListener('focusout', (event) => {
  const label = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-key-label]') : null;
  if (!label) return;
  renameKeyMaterial(label.dataset.keyId ?? '', label.textContent ?? '');
});

keyTree.addEventListener('keydown', (event) => {
  const label = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-key-label]') : null;
  if (!label) return;

  if (event.key === 'Enter') {
    event.preventDefault();
    label.blur();
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    const keyMaterial = keyMaterials.find((material) => material.id === label.dataset.keyId);
    label.textContent = keyMaterial?.label ?? '';
    label.blur();
  }
});

document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !newKeyButton.contains(event.target) && !algorithmMenu.contains(event.target)) {
    setAlgorithmMenuOpen(false);
  }

  if (event.target instanceof Node && !privateKeyMenu.contains(event.target) && !keyTree.contains(event.target)) {
    setPrivateKeyMenuOpen(false);
  }

  if (event.target instanceof Node && !keyPairMenu.contains(event.target) && !keyTree.contains(event.target)) {
    setKeyPairMenuOpen(false);
  }
});

async function generateKeyPair(selection: string): Promise<void> {
  setBusy(true);
  setNotice('Generating key pair...');

  try {
    const { algorithm, usages } = getGenerationOptions(selection);
    const generated = await crypto.subtle.generateKey(algorithm, true, usages);

    if (!isCryptoKeyPair(generated)) throw new Error('The browser did not return a key pair.');

    const [privateKeyBuffer, publicKeyBuffer] = await Promise.all([
      crypto.subtle.exportKey('pkcs8', generated.privateKey),
      crypto.subtle.exportKey('spki', generated.publicKey)
    ]);

    const privateKeyDer = new Uint8Array(privateKeyBuffer);
    const publicKeyDer = new Uint8Array(publicKeyBuffer);

    const keyMaterial: KeyMaterial = {
      id: createKeyId(),
      label: getDefaultKeyLabel({ privateKeyDer, publicKeyDer }),
      privateKeyDer,
      publicKeyDer
    };

    addKeyMaterial(keyMaterial);
    setNotice(`Generated ${recognizeKeyMaterial(keyMaterial).label}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

async function openPkcs12File(file: File, password: string): Promise<void> {
  setBusy(true);
  setNotice(`Opening ${file.name}...`);

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const openedKeys = (await readPkcs12Keys(bytes, password, { sourceName: file.name, createId: createKeyId })).map((key) => ({
      ...key,
      label: key.label || getDefaultKeyLabel(key)
    }));

    for (const keyMaterial of openedKeys) addKeyMaterial(keyMaterial);

    const suffix = openedKeys.length === 1 ? '' : 's';
    setNotice(`Opened ${openedKeys.length} key${suffix} from ${file.name}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

function requestPkcs12Password(fileName: string): Promise<string | null> {
  pkcs12PasswordTitle.textContent = `Open ${fileName}`;
  pkcs12PasswordInput.value = '';
  pkcs12PasswordDialog.returnValue = '';

  return new Promise((resolve) => {
    pkcs12PasswordDialog.addEventListener(
      'close',
      () => {
        resolve(pkcs12PasswordDialog.returnValue === 'open' ? pkcs12PasswordInput.value : null);
      },
      { once: true }
    );

    pkcs12PasswordDialog.showModal();
    pkcs12PasswordInput.focus();
  });
}

function requestCsrOptions(): Promise<{ subjectDn: string; hashAlgorithm: string } | null> {
  csrSubjectInput.value = 'CN=example.com, O=Example, C=JP';
  csrHashSelect.innerHTML = CSR_HASH_ALGORITHMS.map((hash) => `<option value="${hash}">${hash}</option>`).join('');
  csrDialog.returnValue = '';

  return new Promise((resolve) => {
    csrDialog.addEventListener(
      'close',
      () => {
        if (csrDialog.returnValue !== 'create') {
          resolve(null);
          return;
        }

        resolve({ subjectDn: csrSubjectInput.value.trim(), hashAlgorithm: csrHashSelect.value });
      },
      { once: true }
    );

    csrDialog.showModal();
    csrSubjectInput.focus();
    csrSubjectInput.select();
  });
}

function requestSubjectDn(): Promise<string | null> {
  subjectDnInput.value = 'CN=example.com, O=Example, C=JP';
  subjectDnDialog.returnValue = '';

  return new Promise((resolve) => {
    subjectDnDialog.addEventListener(
      'close',
      () => {
        resolve(subjectDnDialog.returnValue === 'create' ? subjectDnInput.value.trim() : null);
      },
      { once: true }
    );

    subjectDnDialog.showModal();
    subjectDnInput.focus();
    subjectDnInput.select();
  });
}

async function createCsr(keyId: string, subjectDn: string, hashAlgorithm: string): Promise<void> {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;

  setBusy(true);
  setNotice('Creating CSR...');

  try {
    const info = recognizeKeyMaterial(keyMaterial);
    if (info.family !== 'RSA' && info.family !== 'EC') throw new Error(`${info.label} is not supported for CSR signing yet.`);

    const subject = parseSubjectDn(subjectDn);
    const [privateKey, publicKey] = await Promise.all([
      importSigningPrivateKey(keyMaterial.privateKeyDer, info, hashAlgorithm),
      importSigningPublicKey(keyMaterial.publicKeyDer, info, hashAlgorithm)
    ]);

    const request = new CertificationRequest();
    request.subject.typesAndValues.push(...subject);
    await request.subjectPublicKeyInfo.importKey(publicKey);
    request.attributes = [];
    await request.sign(privateKey, hashAlgorithm);

    const csr: CsrMaterial = {
      id: createKeyId(),
      label: 'CSR',
      subjectDn,
      hashAlgorithm,
      bytes: new Uint8Array(request.toSchema(true).toBER(false))
    };

    keyMaterial.csrs ||= [];
    keyMaterial.csrs.push(csr);
    selectedNode = { keyId: keyMaterial.id, kind: 'csr', csrId: csr.id };
    renderKeyTree();
    showSelectedNode();
    setNotice(`Created CSR for ${subjectDn}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

function createSubjectDn(keyId: string, subjectDn: string): void {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;

  try {
    const item: SubjectDnMaterial = {
      id: createKeyId(),
      label: 'SubjectDN',
      subjectDn,
      bytes: createSubjectDnBytes(subjectDn)
    };

    keyMaterial.subjectDns ||= [];
    keyMaterial.subjectDns.push(item);
    selectedNode = { keyId: keyMaterial.id, kind: 'subjectdn', subjectDnId: item.id };
    renderKeyTree();
    showSelectedNode();
    setNotice(`Created SubjectDN for ${subjectDn}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  }
}

function createSubjectDnBytes(subjectDn: string): Uint8Array {
  const subject = new RelativeDistinguishedNames({ typesAndValues: parseSubjectDn(subjectDn) });
  return new Uint8Array(subject.toSchema().toBER(false));
}

function listenForViewerChanges(instance: PkiStudioInstance): void {
  instance.root?.addEventListener('pkistudio-change', (event) => {
    if (!selectedNode || selectedNode.kind !== 'subjectdn') return;
    const bytes = event instanceof CustomEvent && event.detail?.bytes instanceof Uint8Array ? event.detail.bytes : instance.getBytes?.();
    if (!bytes) return;
    updateSelectedSubjectDnBytes(bytes);
  });
}

function updateSelectedSubjectDnBytes(bytes: Uint8Array): void {
  if (!selectedNode || selectedNode.kind !== 'subjectdn') return;

  const keyMaterial = keyMaterials.find((material) => material.id === selectedNode?.keyId);
  const subjectDn = keyMaterial?.subjectDns?.find((item) => item.id === selectedNode?.subjectDnId);
  if (!subjectDn || bytesEqual(subjectDn.bytes, bytes)) return;

  subjectDn.bytes = new Uint8Array(bytes);
  renderKeyTree();
  setNotice(`Updated ${subjectDn.label} from viewer edits.`);
}

function getGenerationOptions(selection: string): SupportedKeyAlgorithm {
  const supported = supportedAlgorithms.find((candidate) => candidate.id === selection);
  if (!supported) throw new Error(`Unsupported algorithm: ${selection || '(none selected)'}`);
  return supported;
}

function isCryptoKeyPair(value: CryptoKey | CryptoKeyPair): value is CryptoKeyPair {
  return 'privateKey' in value && 'publicKey' in value;
}

function showBytes(bytes: Uint8Array, notice: string): void {
  if (!viewer) {
    setNotice('pkistudiojs viewer is not ready yet.', true);
    return;
  }

  viewer.loadBytes(bytes, notice);
}

function addKeyMaterial(keyMaterial: KeyMaterial): void {
  keyMaterial.label ||= getDefaultKeyLabel(keyMaterial);
  keyMaterials.push(keyMaterial);
  selectedNode = { keyId: keyMaterial.id, kind: 'private' };
  renderKeyTree();
  showSelectedNode();
}

function applyEmbeddedViewerStyles(instance: PkiStudioInstance): void {
  if (!instance.root) return;

  const style = document.createElement('style');
  style.textContent = EMBEDDED_VIEWER_STYLES;
  instance.root.prepend(style);
}

function selectKeyNode(keyId: string, kind: KeyNodeKind, csrId?: string, subjectDnId?: string): void {
  if (!keyMaterials.some((material) => material.id === keyId)) return;
  selectedNode = { keyId, kind, csrId, subjectDnId };
  renderKeyTree();
  showSelectedNode();
}

function showSelectedNode(): void {
  if (!selectedNode) return;

  const keyMaterial = keyMaterials.find((material) => material.id === selectedNode?.keyId);
  if (!keyMaterial) return;

  const bytes = getSelectedNodeBytes(keyMaterial, selectedNode);
  if (!bytes) return;

  const info = recognizeKeyMaterial(keyMaterial);
  const format = getSelectedNodeFormat(selectedNode.kind);
  const label = getSelectedNodeLabel(keyMaterial, selectedNode);
  showBytes(bytes, `${info.label} ${label} (${format})`);
}

function renderKeyTree(): void {
  if (keyMaterials.length === 0) {
    keyTree.className = 'tree empty';
    keyTree.textContent = 'No key generated yet.';
    return;
  }

  keyTree.className = 'tree';
  keyTree.innerHTML = keyMaterials
    .map((keyMaterial) => {
      const info = recognizeKeyMaterial(keyMaterial);
      return `
    <details class="tree-node" open>
      <summary>
        <span class="tree-toggle" aria-hidden="true">−</span>
        <button class="tree-icon-button" type="button" data-keypair-menu data-key-id="${escapeHtml(keyMaterial.id)}" aria-label="KeyPair actions"><span class="tree-icon folder" aria-hidden="true"></span></button>
        <span class="tree-tag key-label" data-key-label data-key-id="${escapeHtml(keyMaterial.id)}" contenteditable="true" spellcheck="false">${escapeHtml(keyMaterial.label || info.label)}</span>
        <span class="tree-pill">KeyPair</span>
      </summary>
      <div class="tree-children">
        ${(keyMaterial.subjectDns ?? []).map((subjectDn) => renderSubjectDnNode(keyMaterial, subjectDn)).join('')}
        ${renderMaterialNode(keyMaterial, 'private', 'PrivateKey', keyMaterial.privateKeyDer, info.label)}
        ${keyMaterial.certificateDer ? '' : renderMaterialNode(keyMaterial, 'public', 'PublicKey', keyMaterial.publicKeyDer, info.label)}
        ${keyMaterial.certificateDer ? renderMaterialNode(keyMaterial, 'certificate', 'Certificate', keyMaterial.certificateDer) : ''}
        ${(keyMaterial.csrs ?? []).map((csr) => renderCsrNode(keyMaterial, csr)).join('')}
      </div>
    </details>
  `;
    })
    .join('');
}

function renderSubjectDnNode(keyMaterial: KeyMaterial, subjectDn: SubjectDnMaterial): string {
  const selected = selectedNode?.keyId === keyMaterial.id && selectedNode.kind === 'subjectdn' && selectedNode.subjectDnId === subjectDn.id;
  return `
    <div class="tree-row${selected ? ' selected' : ''}">
      <span class="tree-icon leaf" aria-hidden="true"></span>
      <button class="tree-item" type="button" data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="subjectdn" data-subject-dn-id="${escapeHtml(subjectDn.id)}" aria-pressed="${selected}">
        <span class="tree-tag">${escapeHtml(subjectDn.label)} (${subjectDn.bytes.byteLength})</span>
      </button>
    </div>
  `;
}

function renderMaterialNode(keyMaterial: KeyMaterial, kind: KeyNodeKind, label: string, bytes: Uint8Array, algorithmLabel?: string): string {
  const selected = selectedNode?.keyId === keyMaterial.id && selectedNode.kind === kind;
  const suffix = algorithmLabel && (kind === 'private' || kind === 'public') ? ` // ${algorithmLabel}` : '';
  const menuButton =
    kind === 'private'
      ? `<button class="tree-icon-button" type="button" data-private-menu data-key-id="${escapeHtml(keyMaterial.id)}" aria-label="PrivateKey actions"><span class="tree-icon leaf" aria-hidden="true"></span></button>`
      : '<span class="tree-icon leaf" aria-hidden="true"></span>';
  return `
    <div class="tree-row${selected ? ' selected' : ''}">
      ${menuButton}
      <button class="tree-item" type="button" data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="${kind}" aria-pressed="${selected}">
      <span class="tree-tag">${label} (${bytes.byteLength})${escapeHtml(suffix)}</span>
      </button>
    </div>
  `;
}

function renderCsrNode(keyMaterial: KeyMaterial, csr: CsrMaterial): string {
  const selected = selectedNode?.keyId === keyMaterial.id && selectedNode.kind === 'csr' && selectedNode.csrId === csr.id;
  return `
    <div class="tree-row${selected ? ' selected' : ''}">
      <span class="tree-icon leaf" aria-hidden="true"></span>
      <button class="tree-item" type="button" data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="csr" data-csr-id="${escapeHtml(csr.id)}" aria-pressed="${selected}">
        <span class="tree-tag">${escapeHtml(csr.label)} (${csr.bytes.byteLength}) // ${escapeHtml(csr.hashAlgorithm)}</span>
      </button>
    </div>
  `;
}

function renameKeyMaterial(keyId: string, label: string): void {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;
  keyMaterial.label = label.trim() || getDefaultKeyLabel(keyMaterial);
  renderKeyTree();
}

function getDefaultKeyLabel(keyMaterial: Pick<KeyMaterial, 'privateKeyDer' | 'publicKeyDer'>): string {
  return recognizeKeyMaterial({ id: '', privateKeyDer: keyMaterial.privateKeyDer, publicKeyDer: keyMaterial.publicKeyDer }).label;
}

function getSelectedNodeBytes(keyMaterial: KeyMaterial, selected: SelectedKeyNode): Uint8Array | undefined {
  if (selected.kind === 'private') return keyMaterial.privateKeyDer;
  if (selected.kind === 'public') return keyMaterial.publicKeyDer;
  if (selected.kind === 'csr') return keyMaterial.csrs?.find((csr) => csr.id === selected.csrId)?.bytes;
  if (selected.kind === 'subjectdn') return keyMaterial.subjectDns?.find((subjectDn) => subjectDn.id === selected.subjectDnId)?.bytes;
  return keyMaterial.certificateDer;
}

function getSelectedNodeFormat(kind: KeyNodeKind): string {
  if (kind === 'private') return 'PKCS#8 DER';
  if (kind === 'public') return 'SPKI DER';
  if (kind === 'csr') return 'PKCS#10 CSR DER';
  if (kind === 'subjectdn') return 'X.509 subject DER';
  return 'X.509 certificate DER';
}

function getSelectedNodeLabel(keyMaterial: KeyMaterial, selected: SelectedKeyNode): string {
  if (selected.kind === 'private') return 'private key';
  if (selected.kind === 'public') return 'public key';
  if (selected.kind === 'csr') {
    const csr = keyMaterial.csrs?.find((item) => item.id === selected.csrId);
    return csr ? `CSR ${csr.subjectDn}` : 'CSR';
  }
  if (selected.kind === 'subjectdn') {
    const subjectDn = keyMaterial.subjectDns?.find((item) => item.id === selected.subjectDnId);
    return subjectDn ? `SubjectDN ${subjectDn.subjectDn}` : 'SubjectDN';
  }
  return 'certificate';
}

function setBusy(busy: boolean): void {
  newKeyButton.disabled = busy || supportedAlgorithms.length === 0;
  openKeyButton.disabled = busy;
  for (const button of algorithmMenu.querySelectorAll<HTMLButtonElement>('button')) button.disabled = busy;
  if (busy) setAlgorithmMenuOpen(false);
}

function setNotice(message: string, isError = false): void {
  formNotice.textContent = message;
  formNotice.classList.toggle('error', isError);
}

function setPrivateKeyMenuOpen(open: boolean, keyId?: string, anchor?: HTMLElement): void {
  if (!open || !keyId || !anchor) {
    privateKeyMenu.hidden = true;
    privateKeyMenuKeyId = null;
    return;
  }

  setKeyPairMenuOpen(false);
  privateKeyMenuKeyId = keyId;
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  const info = keyMaterial ? recognizeKeyMaterial(keyMaterial) : null;
  const supported = info?.family === 'RSA' || info?.family === 'EC';
  newCsrMenuItem.disabled = !supported;
  newCsrMenuItem.title = supported ? '' : 'CSR creation currently supports RSA and EC signing keys.';

  const rect = anchor.getBoundingClientRect();
  privateKeyMenu.style.left = `${rect.left}px`;
  privateKeyMenu.style.top = `${rect.bottom + 2}px`;
  privateKeyMenu.hidden = false;
}

function setKeyPairMenuOpen(open: boolean, keyId?: string, anchor?: HTMLElement): void {
  if (!open || !keyId || !anchor) {
    keyPairMenu.hidden = true;
    keyPairMenuKeyId = null;
    return;
  }

  setPrivateKeyMenuOpen(false);
  keyPairMenuKeyId = keyId;
  const rect = anchor.getBoundingClientRect();
  keyPairMenu.style.left = `${rect.left}px`;
  keyPairMenu.style.top = `${rect.bottom + 2}px`;
  keyPairMenu.hidden = false;
}

async function importSigningPrivateKey(bytes: Uint8Array, info: RecognizedKeyInfo, hashAlgorithm: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('pkcs8', toArrayBuffer(bytes), getSigningKeyAlgorithm(info, hashAlgorithm), false, ['sign']);
}

async function importSigningPublicKey(bytes: Uint8Array, info: RecognizedKeyInfo, hashAlgorithm: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('spki', toArrayBuffer(bytes), getSigningKeyAlgorithm(info, hashAlgorithm), true, ['verify']);
}

function getSigningKeyAlgorithm(info: RecognizedKeyInfo, hashAlgorithm: string): RsaHashedImportParams | EcKeyImportParams {
  if (info.family === 'RSA') return { name: 'RSASSA-PKCS1-v1_5', hash: hashAlgorithm };
  if (info.family === 'EC' && info.namedCurve) return { name: 'ECDSA', namedCurve: info.namedCurve };
  throw new Error(`${info.label} is not supported for CSR signing yet.`);
}

function parseSubjectDn(subjectDn: string): AttributeTypeAndValue[] {
  const parts = splitSubjectDn(subjectDn);
  if (parts.length === 0) throw new Error('subjectDN is required.');

  return [...parts].reverse().map((part) => {
    const separator = findUnescaped(part, '=');
    if (separator <= 0) throw new Error(`Invalid subjectDN part: ${part}`);

    const name = unescapeDnValue(part.slice(0, separator).trim());
    const value = unescapeDnValue(part.slice(separator + 1).trim());
    if (!name || !value) throw new Error(`Invalid subjectDN part: ${part}`);

    return new AttributeTypeAndValue({ type: subjectOid(name), value: subjectValue(name, value) });
  });
}

function splitSubjectDn(subjectDn: string): string[] {
  const trimmed = subjectDn.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('/')) return splitEscaped(trimmed.slice(1), '/');
  return splitEscaped(trimmed, ',');
}

function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      current += `\\${character}`;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === separator) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  if (escaped) current += '\\';
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function findUnescaped(value: string, needle: string): number {
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === needle) return index;
  }
  return -1;
}

function unescapeDnValue(value: string): string {
  return value.replace(/\\([,=\\/])/g, '$1');
}

function subjectOid(name: string): string {
  const oids: Record<string, string> = {
    C: '2.5.4.6',
    ST: '2.5.4.8',
    S: '2.5.4.8',
    L: '2.5.4.7',
    O: '2.5.4.10',
    OU: '2.5.4.11',
    CN: '2.5.4.3',
    DC: '0.9.2342.19200300.100.1.25',
    SN: '2.5.4.5',
    SERIALNUMBER: '2.5.4.5',
    EMAILADDRESS: '1.2.840.113549.1.9.1'
  };

  const oid = oids[name.toUpperCase()] ?? (/^\d+(\.\d+)+$/.test(name) ? name : undefined);
  if (!oid) throw new Error(`Unsupported subjectDN attribute: ${name}`);
  return oid;
}

function subjectValue(name: string, value: string): asn1js.Utf8String | asn1js.PrintableString | asn1js.IA5String {
  const normalized = name.toUpperCase();
  if (normalized === 'C') return new asn1js.PrintableString({ value });
  if (normalized === 'EMAILADDRESS' || normalized === 'DC') return new asn1js.IA5String({ value });
  return new asn1js.Utf8String({ value });
}

async function populateSupportedAlgorithms(): Promise<void> {
  setNotice('Detecting supported key pair algorithms...');
  supportedAlgorithms = [];
  algorithmMenu.textContent = '';

  const results = await Promise.all(
    KEY_ALGORITHM_CANDIDATES.map(async (candidate) => ({
      candidate,
      supported: await isKeyAlgorithmSupported(candidate)
    }))
  );

  const uniqueSupportedAlgorithms = new Map<string, SupportedKeyAlgorithm>();
  for (const result of results) {
    if (!result.supported || uniqueSupportedAlgorithms.has(result.candidate.canonicalId)) continue;
    uniqueSupportedAlgorithms.set(result.candidate.canonicalId, result.candidate);
  }

  supportedAlgorithms = [...uniqueSupportedAlgorithms.values()];

  if (supportedAlgorithms.length === 0) {
    algorithmMenu.innerHTML = '<button type="button" role="menuitem" disabled>No supported key pair algorithms</button>';
    setNotice('This browser did not report support for the candidate key pair algorithms.', true);
    setBusy(false);
    return;
  }

  algorithmMenu.innerHTML = supportedAlgorithms
    .map(
      (candidate) =>
        `<button type="button" role="menuitem" data-algorithm="${escapeHtml(candidate.id)}">${escapeHtml(candidate.canonicalLabel)}</button>`
    )
    .join('');
  setBusy(false);
  setNotice(`Detected ${supportedAlgorithms.length} supported key algorithms.`);
}

function setAlgorithmMenuOpen(open: boolean): void {
  algorithmMenu.hidden = !open;
  newKeyButton.setAttribute('aria-expanded', String(open));
}

async function isKeyAlgorithmSupported(candidate: KeyAlgorithmCandidate): Promise<boolean> {
  try {
    const generated = await crypto.subtle.generateKey(candidate.algorithm, true, candidate.usages);
    return isCryptoKeyPair(generated);
  } catch {
    return false;
  }
}

function createRsaCandidates(
  name: string,
  hash: string,
  usages: KeyUsage[]
): KeyAlgorithmCandidate[] {
  return [2048, 3072, 4096].map((modulusLength) => ({
    id: `${name.toLowerCase()}-${modulusLength}`,
    canonicalId: `rsa-${modulusLength}`,
    canonicalLabel: `RSA ${modulusLength}`,
    algorithm: {
      name,
      modulusLength,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash
    },
    usages
  }));
}

function createNamedCurveCandidates(name: string, curves: string[], usages: KeyUsage[]): KeyAlgorithmCandidate[] {
  return curves.map((namedCurve) => ({
    id: name === namedCurve ? name.toLowerCase() : `${name.toLowerCase()}-${namedCurve.toLowerCase()}`,
    canonicalId: name === 'ECDSA' || name === 'ECDH' ? `ec-${namedCurve.toLowerCase()}` : name.toLowerCase(),
    canonicalLabel: name === 'ECDSA' || name === 'ECDH' ? `EC ${namedCurve}` : name,
    algorithm: name === namedCurve ? { name } : { name, namedCurve },
    usages
  }));
}

function recognizeKeyMaterial(material: KeyMaterial): RecognizedKeyInfo {
  return recognizePublicKey(material.publicKeyDer) || recognizePrivateKey(material.privateKeyDer);
}

function recognizePublicKey(bytes: Uint8Array): RecognizedKeyInfo | null {
  try {
    const root = parseDer(bytes);
    const algorithmIdentifier = root.children[0];
    if (!algorithmIdentifier) return null;
    const { oid, parameters } = parseAlgorithmIdentifier(bytes, algorithmIdentifier);

    if (oid === '1.2.840.113549.1.1.1') {
      const bitString = root.children[1];
      const modulusBits = bitString ? readRsaPublicKeyBits(bytes, bitString) : null;
      return createRecognizedKeyInfo('RSA', modulusBits ? `RSA ${modulusBits}` : 'RSA');
    }

    return infoFromAlgorithmIdentifier(oid, parameters);
  } catch {
    return null;
  }
}

function recognizePrivateKey(bytes: Uint8Array): RecognizedKeyInfo {
  try {
    const root = parseDer(bytes);
    const algorithmIdentifier = root.children[1];
    if (!algorithmIdentifier) return createRecognizedKeyInfo('Unknown', 'Unknown');
    const { oid, parameters } = parseAlgorithmIdentifier(bytes, algorithmIdentifier);

    if (oid === '1.2.840.113549.1.1.1') return createRecognizedKeyInfo('RSA', 'RSA');
    return infoFromAlgorithmIdentifier(oid, parameters);
  } catch {
    return createRecognizedKeyInfo('Unknown', 'Unknown');
  }
}

function infoFromAlgorithmIdentifier(oid: string, parameters: string | null): RecognizedKeyInfo {
  if (oid === '1.2.840.10045.2.1') {
    const namedCurve = parameters ? curveNameFromOid(parameters) : undefined;
    return createRecognizedKeyInfo('EC', namedCurve ? `EC ${namedCurve}` : 'EC', namedCurve);
  }

  if (oid === '1.3.101.112') return createRecognizedKeyInfo('Ed25519', 'Ed25519');
  if (oid === '1.3.101.113') return createRecognizedKeyInfo('Ed448', 'Ed448');
  if (oid === '1.3.101.110') return createRecognizedKeyInfo('X25519', 'X25519');
  if (oid === '1.3.101.111') return createRecognizedKeyInfo('X448', 'X448');

  return createRecognizedKeyInfo('Unknown', `Unknown (${oid})`);
}

function createRecognizedKeyInfo(
  family: RecognizedKeyInfo['family'],
  label: string,
  namedCurve?: string
): RecognizedKeyInfo {
  return {
    family,
    label,
    canSign: family === 'RSA' || family === 'EC' || family === 'Ed25519' || family === 'Ed448',
    canDerive: family === 'EC' || family === 'X25519' || family === 'X448',
    namedCurve
  };
}

function parseAlgorithmIdentifier(bytes: Uint8Array, node: DerNode): { oid: string; parameters: string | null } {
  const oidNode = node.children[0];
  if (!oidNode || oidNode.tagClass !== 0 || oidNode.tagNumber !== 6) throw new Error('Missing algorithm OID');
  const parameterNode = node.children[1];
  return {
    oid: decodeOid(bytes.slice(oidNode.contentStart, oidNode.contentEnd)),
    parameters:
      parameterNode?.tagClass === 0 && parameterNode.tagNumber === 6
        ? decodeOid(bytes.slice(parameterNode.contentStart, parameterNode.contentEnd))
        : null
  };
}

function readRsaPublicKeyBits(bytes: Uint8Array, bitString: DerNode): number | null {
  if (bitString.tagClass !== 0 || bitString.tagNumber !== 3 || bitString.contentEnd <= bitString.contentStart) return null;
  const unusedBits = bytes[bitString.contentStart];
  if (unusedBits !== 0) return null;

  const rsaPublicKeyBytes = bytes.slice(bitString.contentStart + 1, bitString.contentEnd);
  const rsaPublicKey = parseDer(rsaPublicKeyBytes);
  const modulus = rsaPublicKey.children[0];
  if (!modulus || modulus.tagClass !== 0 || modulus.tagNumber !== 2) return null;

  let offset = modulus.contentStart;
  while (offset < modulus.contentEnd - 1 && rsaPublicKeyBytes[offset] === 0) offset += 1;
  const firstByte = rsaPublicKeyBytes[offset];
  const firstByteBits = firstByte === 0 ? 0 : 8 - Math.clz32(firstByte) + 24;
  return (modulus.contentEnd - offset - 1) * 8 + firstByteBits;
}

function curveNameFromOid(oid: string): string | undefined {
  const names: Record<string, string> = {
    '1.2.840.10045.3.1.7': 'P-256',
    '1.3.132.0.34': 'P-384',
    '1.3.132.0.35': 'P-521'
  };
  return names[oid];
}

function parseDer(bytes: Uint8Array): DerNode {
  const { node, offset } = parseDerNode(bytes, 0, bytes.length);
  if (offset !== bytes.length) throw new Error('DER input has trailing data');
  return node;
}

function parseDerNode(bytes: Uint8Array, offset: number, end: number): { node: DerNode; offset: number } {
  if (offset + 2 > end) throw new Error('Truncated DER element');

  const identifier = bytes[offset++];
  const tagClass = identifier >> 6;
  const constructed = (identifier & 0x20) !== 0;
  let tagNumber = identifier & 0x1f;
  if (tagNumber === 0x1f) throw new Error('High-tag-number DER elements are not supported yet');

  const firstLength = bytes[offset++];
  let length = firstLength;
  if ((firstLength & 0x80) !== 0) {
    const lengthOctets = firstLength & 0x7f;
    if (lengthOctets === 0) throw new Error('Indefinite length is not valid DER');
    if (lengthOctets > 4 || offset + lengthOctets > end) throw new Error('Invalid DER length');
    length = 0;
    for (let index = 0; index < lengthOctets; index += 1) length = length * 256 + bytes[offset++];
  }

  const contentStart = offset;
  const contentEnd = contentStart + length;
  if (contentEnd > end) throw new Error('DER length exceeds input');

  const children: DerNode[] = [];
  if (constructed) {
    let childOffset = contentStart;
    while (childOffset < contentEnd) {
      const child = parseDerNode(bytes, childOffset, contentEnd);
      children.push(child.node);
      childOffset = child.offset;
    }
  }

  return {
    node: {
      tagClass,
      tagNumber,
      constructed,
      contentStart,
      contentEnd,
      end: contentEnd,
      children
    },
    offset: contentEnd
  };
}

function decodeOid(bytes: Uint8Array): string {
  if (bytes.length === 0) throw new Error('Empty OID');

  const first = bytes[0];
  const parts = [Math.floor(first / 40), first % 40];
  let value = 0;

  for (const byte of bytes.slice(1)) {
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }

  if (value !== 0) throw new Error('Truncated OID');
  return parts.join('.');
}

function createKeyId(): string {
  return crypto.randomUUID?.() ?? String(Date.now());
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return character;
    }
  });
}

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}