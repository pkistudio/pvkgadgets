import './styles.css';
import * as asn1js from 'asn1js';
import { AttributeTypeAndValue, Certificate, CertificationRequest, RelativeDistinguishedNames } from 'pkijs';
import { readPkcs12Keys, writePkcs12Keys, type Pkcs12KeyMaterial } from './pkcs12';

type PkiStudioInstance = {
  close?: () => void;
  getBytes?: () => Uint8Array | null;
  loadBytes: (bytes: Uint8Array, notice?: string) => void;
  root?: DocumentFragment | Element;
};

type PkiStudioApi = {
  init: (options: { mount: string | Element; oidUrl?: string; shadowRoot?: boolean; newWindowUrl?: string }) => PkiStudioInstance;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
};

type SaveFileHandle = {
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
};

declare global {
  interface Window {
    PkiStudio?: PkiStudioApi;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<SaveFileHandle>;
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

type KeyMaterial = Omit<Pkcs12KeyMaterial, 'privateKeyDer' | 'publicKeyDer'> & {
  privateKeyDer?: Uint8Array;
  publicKeyDer?: Uint8Array;
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
          <button id="saveKeyButton" type="button">Save Key</button>
          <input id="openKeyInput" class="visually-hidden" type="file" accept=".p12,.pfx,application/pkcs12,application/x-pkcs12" />
          <input id="certificateInput" class="visually-hidden" type="file" accept=".cer,.crt,.der,.pem,application/pkix-cert,application/x-x509-ca-cert" />
        </nav>
        <div id="privateKeyMenu" class="node-context-menu" role="menu" hidden>
          <button id="newCsrMenuItem" type="button" role="menuitem">New CSR</button>
          <button id="deletePrivateKeyMenuItem" type="button" role="menuitem">Delete</button>
        </div>
        <div id="keyPairMenu" class="node-context-menu" role="menu" hidden>
          <button id="addCertificateMenuItem" type="button" role="menuitem">add Certificate</button>
          <button id="newSubjectDnMenuItem" type="button" role="menuitem">New SubjectDN</button>
          <button id="deleteKeyPairMenuItem" type="button" role="menuitem">Delete</button>
        </div>
        <div id="certificateMenu" class="node-context-menu" role="menu" hidden>
          <button id="newCertificateSubjectDnMenuItem" type="button" role="menuitem">New SubjectDN</button>
          <button id="deleteCertificateMenuItem" type="button" role="menuitem">Delete</button>
        </div>
        <div id="childItemMenu" class="node-context-menu" role="menu" hidden>
          <button id="copyCsrPemMenuItem" type="button" role="menuitem" hidden>Copy as PEM</button>
          <button id="deleteChildItemMenuItem" type="button" role="menuitem">Delete</button>
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
    <dialog id="saveKeySelectionDialog" class="password-dialog save-key-dialog">
      <form method="dialog" class="password-panel">
        <h2>Save Key</h2>
        <div id="saveKeyList" class="checkbox-list" role="group" aria-label="Key pairs"></div>
        <div id="saveKeySelectionError" class="dialog-error" role="alert" hidden></div>
        <div class="dialog-actions">
          <button type="submit" value="cancel">Cancel</button>
          <button id="saveKeySelectionNextButton" type="submit" value="next">Next</button>
        </div>
      </form>
    </dialog>
    <dialog id="csrDialog" class="password-dialog">
      <form method="dialog" class="password-panel">
        <h2>New CSR</h2>
        <label class="password-field">
          <span>subjectDN</span>
          <input id="csrSubjectInput" type="text" autocomplete="off" readonly />
        </label>
        <div id="csrSubjectError" class="dialog-error" role="alert" hidden></div>
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
const saveKeyButton = query<HTMLButtonElement>('#saveKeyButton');
const openKeyInput = query<HTMLInputElement>('#openKeyInput');
const certificateInput = query<HTMLInputElement>('#certificateInput');
const algorithmMenu = query<HTMLDivElement>('#algorithmMenu');
const privateKeyMenu = query<HTMLDivElement>('#privateKeyMenu');
const newCsrMenuItem = query<HTMLButtonElement>('#newCsrMenuItem');
const deletePrivateKeyMenuItem = query<HTMLButtonElement>('#deletePrivateKeyMenuItem');
const keyPairMenu = query<HTMLDivElement>('#keyPairMenu');
const addCertificateMenuItem = query<HTMLButtonElement>('#addCertificateMenuItem');
const newSubjectDnMenuItem = query<HTMLButtonElement>('#newSubjectDnMenuItem');
const deleteKeyPairMenuItem = query<HTMLButtonElement>('#deleteKeyPairMenuItem');
const certificateMenu = query<HTMLDivElement>('#certificateMenu');
const newCertificateSubjectDnMenuItem = query<HTMLButtonElement>('#newCertificateSubjectDnMenuItem');
const deleteCertificateMenuItem = query<HTMLButtonElement>('#deleteCertificateMenuItem');
const childItemMenu = query<HTMLDivElement>('#childItemMenu');
const copyCsrPemMenuItem = query<HTMLButtonElement>('#copyCsrPemMenuItem');
const deleteChildItemMenuItem = query<HTMLButtonElement>('#deleteChildItemMenuItem');
const keyTree = query<HTMLElement>('#keyTree');
const formNotice = query<HTMLElement>('#formNotice');
const pkcs12PasswordDialog = query<HTMLDialogElement>('#pkcs12PasswordDialog');
const pkcs12PasswordTitle = query<HTMLElement>('#pkcs12PasswordTitle');
const pkcs12PasswordInput = query<HTMLInputElement>('#pkcs12PasswordInput');
const pkcs12PasswordSubmitButton = query<HTMLButtonElement>('#pkcs12PasswordDialog button[type="submit"][value="open"]');
const saveKeySelectionDialog = query<HTMLDialogElement>('#saveKeySelectionDialog');
const saveKeyList = query<HTMLElement>('#saveKeyList');
const saveKeySelectionError = query<HTMLElement>('#saveKeySelectionError');
const saveKeySelectionNextButton = query<HTMLButtonElement>('#saveKeySelectionNextButton');
const csrDialog = query<HTMLDialogElement>('#csrDialog');
const csrSubjectInput = query<HTMLInputElement>('#csrSubjectInput');
const csrSubjectError = query<HTMLElement>('#csrSubjectError');
const csrHashSelect = query<HTMLSelectElement>('#csrHashSelect');
const subjectDnDialog = query<HTMLDialogElement>('#subjectDnDialog');
const subjectDnInput = query<HTMLInputElement>('#subjectDnInput');

let viewer: PkiStudioInstance | null = null;
let keyMaterials: KeyMaterial[] = [];
let selectedNode: SelectedKeyNode | null = null;
let supportedAlgorithms: SupportedKeyAlgorithm[] = [];
let privateKeyMenuKeyId: string | null = null;
let keyPairMenuKeyId: string | null = null;
let certificateMenuKeyId: string | null = null;
let childItemMenuTarget: SelectedKeyNode | null = null;
let pendingCertificateKeyId: string | null = null;

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

saveKeyButton.addEventListener('click', async () => {
  if (saveKeyButton.disabled) return;
  setAlgorithmMenuOpen(false);

  const selectedKeyIds = await requestSaveKeySelection();
  if (!selectedKeyIds) return;

  const password = await requestPkcs12Password('Save PKCS#12', { value: 'save', label: 'Save' });
  if (password === null) return;

  await savePkcs12File(selectedKeyIds, password);
});

saveKeyList.addEventListener('change', () => {
  updateSaveKeySelectionState();
});

openKeyInput.addEventListener('change', async () => {
  const [file] = openKeyInput.files ?? [];
  openKeyInput.value = '';
  if (!file) return;

  const password = await requestPkcs12Password(`Open ${file.name}`, { value: 'open', label: 'Open' });
  if (password === null) return;

  await openPkcs12File(file, password);
});

certificateInput.addEventListener('change', async () => {
  const [file] = certificateInput.files ?? [];
  const keyId = pendingCertificateKeyId;
  certificateInput.value = '';
  pendingCertificateKeyId = null;
  if (!file || !keyId) return;

  await addCertificateFile(keyId, file);
});

newCsrMenuItem.addEventListener('click', async () => {
  const keyId = privateKeyMenuKeyId;
  setPrivateKeyMenuOpen(false);
  if (!keyId) return;

  const options = await requestCsrOptions(keyId);
  if (!options) return;

  await createCsr(keyId, options.subjectDn, options.subjectBytes, options.hashAlgorithm);
});

deletePrivateKeyMenuItem.addEventListener('click', () => {
  const keyId = privateKeyMenuKeyId;
  setPrivateKeyMenuOpen(false);
  if (keyId) deleteChildNode({ keyId, kind: 'private' });
});

newSubjectDnMenuItem.addEventListener('click', async () => {
  const keyId = keyPairMenuKeyId;
  setKeyPairMenuOpen(false);
  if (!keyId) return;

  const subjectDn = await requestSubjectDn();
  if (subjectDn === null) return;

  createSubjectDn(keyId, subjectDn);
});

addCertificateMenuItem.addEventListener('click', () => {
  const keyId = keyPairMenuKeyId;
  setKeyPairMenuOpen(false);
  if (!keyId) return;

  pendingCertificateKeyId = keyId;
  certificateInput.click();
});

deleteKeyPairMenuItem.addEventListener('click', () => {
  const keyId = keyPairMenuKeyId;
  setKeyPairMenuOpen(false);
  if (keyId) deleteKeyPair(keyId);
});

newCertificateSubjectDnMenuItem.addEventListener('click', () => {
  const keyId = certificateMenuKeyId;
  setCertificateMenuOpen(false);
  if (!keyId) return;
  createSubjectDnFromCertificate(keyId);
});

deleteCertificateMenuItem.addEventListener('click', () => {
  const keyId = certificateMenuKeyId;
  setCertificateMenuOpen(false);
  if (keyId) deleteChildNode({ keyId, kind: 'certificate' });
});

copyCsrPemMenuItem.addEventListener('click', async () => {
  const target = childItemMenuTarget;
  setChildItemMenuOpen(false);
  if (target?.kind === 'csr') await copyCsrAsPem(target);
});

deleteChildItemMenuItem.addEventListener('click', () => {
  const target = childItemMenuTarget;
  setChildItemMenuOpen(false);
  if (target) deleteChildNode(target);
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

  const certificateMenuButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-certificate-menu]') : null;
  if (certificateMenuButton) {
    event.preventDefault();
    event.stopPropagation();
    const keyId = certificateMenuButton.dataset.keyId ?? '';
    setCertificateMenuOpen(certificateMenuKeyId !== keyId || certificateMenu.hidden, keyId, certificateMenuButton);
    return;
  }

  const childMenuButton = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-child-menu]') : null;
  if (childMenuButton) {
    event.preventDefault();
    event.stopPropagation();
    setChildItemMenuOpen(
      !isChildItemMenuTarget(childMenuButton) || childItemMenu.hidden,
      {
        keyId: childMenuButton.dataset.keyId ?? '',
        kind: childMenuButton.dataset.keyNode as KeyNodeKind,
        csrId: childMenuButton.dataset.csrId,
        subjectDnId: childMenuButton.dataset.subjectDnId
      },
      childMenuButton
    );
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
  setPrivateKeyMenuOpen(false);
  setKeyPairMenuOpen(false);
  setCertificateMenuOpen(false);
  setChildItemMenuOpen(false);
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

  if (event.target instanceof Element && !privateKeyMenu.contains(event.target) && !event.target.closest('[data-private-menu]')) {
    setPrivateKeyMenuOpen(false);
  }

  if (event.target instanceof Element && !keyPairMenu.contains(event.target) && !event.target.closest('[data-keypair-menu]')) {
    setKeyPairMenuOpen(false);
  }

  if (event.target instanceof Element && !certificateMenu.contains(event.target) && !event.target.closest('[data-certificate-menu]')) {
    setCertificateMenuOpen(false);
  }

  if (event.target instanceof Element && !childItemMenu.contains(event.target) && !event.target.closest('[data-child-menu]')) {
    setChildItemMenuOpen(false);
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

async function addCertificateFile(keyId: string, file: File): Promise<void> {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;

  setBusy(true);
  setNotice(`Adding ${file.name}...`);

  try {
    const certificateDer = await readCertificateFile(file);
    const certificate = Certificate.fromBER(toArrayBuffer(certificateDer));
    const certificatePublicKeyDer = new Uint8Array(certificate.subjectPublicKeyInfo.toSchema().toBER(false));
    const match = await certificateMatchesKeyMaterial(keyMaterial, certificatePublicKeyDer);

    if (!match && !window.confirm('The certificate public key does not match the private key. Apply this certificate anyway?')) return;

    keyMaterial.certificateDer = certificateDer;
    if (match) keyMaterial.publicKeyDer = certificatePublicKeyDer;
    selectedNode = { keyId: keyMaterial.id, kind: 'certificate' };
    renderKeyTree();
    showSelectedNode();
    setNotice(`${match ? 'Added' : 'Applied'} Certificate from ${file.name}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

async function savePkcs12File(keyIds: string[], password: string): Promise<void> {
  setBusy(true);
  setNotice('Creating PKCS#12...');

  try {
    const selectedKeys = keyIds.map((keyId) => keyMaterials.find((material) => material.id === keyId)).filter((material): material is KeyMaterial => Boolean(material));
    const bytes = await writePkcs12Keys(selectedKeys, password);
    const fileName = getPkcs12FileName(selectedKeys);
    await saveBytesToFile(bytes, fileName);
    setNotice(`Saved ${selectedKeys.length} key pair${selectedKeys.length === 1 ? '' : 's'} to ${fileName}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

async function readCertificateFile(file: File): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const pemMatch = /-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/i.exec(text);
  if (!pemMatch) return bytes;

  const base64 = pemMatch[1].replace(/\s+/g, '');
  if (!base64) throw new Error('Certificate PEM did not contain base64 data.');
  return base64ToBytes(base64);
}

async function certificateMatchesKeyMaterial(keyMaterial: KeyMaterial, certificatePublicKeyDer: Uint8Array): Promise<boolean> {
  if (keyMaterial.publicKeyDer) return bytesEqual(keyMaterial.publicKeyDer, certificatePublicKeyDer);
  if (!keyMaterial.privateKeyDer) throw new Error('PrivateKey item is required before adding a certificate.');

  const info = recognizeKeyMaterial(keyMaterial);
  if (!info.canSign) throw new Error(`${info.label} cannot be checked against a certificate.`);

  return verifyPrivateKeyMatchesPublicKey(keyMaterial.privateKeyDer, certificatePublicKeyDer, info);
}

async function verifyPrivateKeyMatchesPublicKey(privateKeyDer: Uint8Array, publicKeyDer: Uint8Array, info: RecognizedKeyInfo): Promise<boolean> {
  try {
    const data = new TextEncoder().encode('Private Key Gadgets certificate check');
    const algorithm = getKeyPairCheckAlgorithm(info);
    const [privateKey, publicKey] = await Promise.all([
      crypto.subtle.importKey('pkcs8', toArrayBuffer(privateKeyDer), algorithm.importAlgorithm, false, ['sign']),
      crypto.subtle.importKey('spki', toArrayBuffer(publicKeyDer), algorithm.importAlgorithm, false, ['verify'])
    ]);
    const signature = await crypto.subtle.sign(algorithm.signAlgorithm, privateKey, data);
    return crypto.subtle.verify(algorithm.signAlgorithm, publicKey, signature, data);
  } catch {
    return false;
  }
}

function getKeyPairCheckAlgorithm(info: RecognizedKeyInfo): { importAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams; signAlgorithm: AlgorithmIdentifier | EcdsaParams } {
  if (info.family === 'RSA') {
    const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    return { importAlgorithm: algorithm, signAlgorithm: algorithm };
  }

  if (info.family === 'EC' && info.namedCurve) {
    return { importAlgorithm: { name: 'ECDSA', namedCurve: info.namedCurve }, signAlgorithm: { name: 'ECDSA', hash: 'SHA-256' } };
  }

  if (info.family === 'Ed25519' || info.family === 'Ed448') {
    const algorithm = { name: info.family };
    return { importAlgorithm: algorithm, signAlgorithm: algorithm };
  }

  throw new Error(`${info.label} cannot be checked against a certificate.`);
}

function requestSaveKeySelection(): Promise<string[] | null> {
  renderSaveKeySelectionList();
  saveKeySelectionError.hidden = true;
  saveKeySelectionError.textContent = '';
  saveKeySelectionDialog.returnValue = '';

  return new Promise((resolve) => {
    saveKeySelectionDialog.addEventListener(
      'close',
      () => {
        if (saveKeySelectionDialog.returnValue !== 'next') {
          resolve(null);
          return;
        }

        const selectedKeyIds = [...saveKeyList.querySelectorAll<HTMLInputElement>('input[name="save-key"]:checked')].map((input) => input.value);
        resolve(selectedKeyIds.length > 0 ? selectedKeyIds : null);
      },
      { once: true }
    );

    saveKeySelectionDialog.showModal();
    saveKeyList.querySelector<HTMLInputElement>('input[name="save-key"]:not(:disabled)')?.focus();
  });
}

function renderSaveKeySelectionList(): void {
  const selectedKeyId = selectedNode?.keyId;
  const saveableKeys = keyMaterials.filter((material) => material.privateKeyDer);

  if (keyMaterials.length === 0) {
    saveKeyList.innerHTML = '<p class="checkbox-list-empty">No key pair is available.</p>';
    saveKeySelectionNextButton.disabled = true;
    return;
  }

  saveKeyList.innerHTML = keyMaterials.map((material) => {
    const disabled = material.privateKeyDer ? '' : ' disabled';
    const checked = material.id === selectedKeyId && material.privateKeyDer ? ' checked' : '';
    const label = material.label || getDefaultKeyLabel(material);
    const note = material.privateKeyDer ? getSaveKeyNote(material) : 'No PrivateKey item';
    return `
      <label class="checkbox-list-item">
        <input type="checkbox" name="save-key" value="${escapeHtml(material.id)}"${checked}${disabled} />
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(note)}</small>
        </span>
      </label>
    `;
  }).join('');

  if (saveableKeys.length === 1 && !saveKeyList.querySelector<HTMLInputElement>('input[name="save-key"]:checked')) {
    saveKeyList.querySelector<HTMLInputElement>('input[name="save-key"]:not(:disabled)')!.checked = true;
  }

  updateSaveKeySelectionState();
}

function updateSaveKeySelectionState(): void {
  const selectedCount = saveKeyList.querySelectorAll<HTMLInputElement>('input[name="save-key"]:checked').length;
  saveKeySelectionNextButton.disabled = selectedCount === 0;
  saveKeySelectionError.textContent = selectedCount === 0 ? 'Select at least one key pair.' : '';
  saveKeySelectionError.hidden = selectedCount !== 0;
}

function requestPkcs12Password(title: string, action: { value: string; label: string }): Promise<string | null> {
  pkcs12PasswordTitle.textContent = title;
  pkcs12PasswordInput.value = '';
  pkcs12PasswordDialog.returnValue = '';
  pkcs12PasswordSubmitButton.value = action.value;
  pkcs12PasswordSubmitButton.textContent = action.label;

  return new Promise((resolve) => {
    pkcs12PasswordDialog.addEventListener(
      'close',
      () => {
        resolve(pkcs12PasswordDialog.returnValue === action.value ? pkcs12PasswordInput.value : null);
      },
      { once: true }
    );

    pkcs12PasswordDialog.showModal();
    pkcs12PasswordInput.focus();
  });
}

async function saveBytesToFile(bytes: Uint8Array, fileName: string): Promise<void> {
  const blob = new Blob([toArrayBuffer(bytes)], { type: 'application/x-pkcs12' });

  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: 'PKCS#12 files', accept: { 'application/x-pkcs12': ['.p12', '.pfx'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function requestCsrOptions(keyId: string): Promise<{ subjectDn: string; subjectBytes: Uint8Array; hashAlgorithm: string } | null> {
  const subjectSource = getCsrSubjectDnSource(keyId);
  csrSubjectInput.value = subjectSource.subjectDn;
  csrHashSelect.innerHTML = CSR_HASH_ALGORITHMS.map((hash) => `<option value="${hash}">${hash}</option>`).join('');
  csrHashSelect.disabled = !subjectSource.subjectBytes;
  csrSubjectError.textContent = subjectSource.error ?? '';
  csrSubjectError.hidden = !subjectSource.error;
  const createButton = csrDialog.querySelector<HTMLButtonElement>('button[value="create"]');
  if (createButton) createButton.disabled = !subjectSource.subjectBytes;
  csrDialog.returnValue = '';

  return new Promise((resolve) => {
    csrDialog.addEventListener(
      'close',
      () => {
        if (csrDialog.returnValue !== 'create') {
          resolve(null);
          return;
        }

        if (!subjectSource.subjectBytes) {
          resolve(null);
          return;
        }

        resolve({ subjectDn: subjectSource.subjectDn, subjectBytes: subjectSource.subjectBytes, hashAlgorithm: csrHashSelect.value });
      },
      { once: true }
    );

    csrDialog.showModal();
    if (subjectSource.subjectBytes) csrHashSelect.focus();
    else csrDialog.querySelector<HTMLButtonElement>('button[value="cancel"]')?.focus();
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

async function createCsr(keyId: string, subjectDn: string, subjectBytes: Uint8Array, hashAlgorithm: string): Promise<void> {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;

  setBusy(true);
  setNotice('Creating CSR...');

  try {
    const info = recognizeKeyMaterial(keyMaterial);
    if (info.family !== 'RSA' && info.family !== 'EC') throw new Error(`${info.label} is not supported for CSR signing yet.`);
    if (!keyMaterial.privateKeyDer || !keyMaterial.publicKeyDer) throw new Error('PrivateKey and PublicKey are required to create a CSR.');

    const subject = parseSubjectDnBytes(subjectBytes);
    const [privateKey, publicKey] = await Promise.all([
      importSigningPrivateKey(keyMaterial.privateKeyDer, info, hashAlgorithm),
      importSigningPublicKey(keyMaterial.publicKeyDer, info, hashAlgorithm)
    ]);

    const request = new CertificationRequest();
    request.subject = subject;
    await request.subjectPublicKeyInfo.importKey(publicKey);
    request.attributes = [];
    await request.sign(privateKey, hashAlgorithm);

    const existing = keyMaterial.csrs?.[0];
    if (existing && !window.confirm('CSR item already exists. Overwrite it?')) return;

    const csr: CsrMaterial = {
      id: existing?.id ?? createKeyId(),
      label: 'CSR',
      subjectDn,
      hashAlgorithm,
      bytes: new Uint8Array(request.toSchema(true).toBER(false))
    };

    keyMaterial.csrs = [csr];
    selectedNode = { keyId: keyMaterial.id, kind: 'csr', csrId: csr.id };
    renderKeyTree();
    showSelectedNode();
    setNotice(`${existing ? 'Updated' : 'Created'} CSR for ${subjectDn}.`);
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
    const overwritten = upsertSubjectDn(keyMaterial, subjectDn, createSubjectDnBytes(subjectDn));
    if (overwritten === null) return;
    setNotice(`${overwritten ? 'Updated' : 'Created'} SubjectDN for ${subjectDn}.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  }
}

function createSubjectDnFromCertificate(keyId: string): void {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial?.certificateDer) return;

  try {
    const subjectBytes = getCertificateSubjectDnBytes(keyMaterial.certificateDer);
    const subjectDn = subjectDnBytesToLdapString(subjectBytes);
    const overwritten = upsertSubjectDn(keyMaterial, subjectDn, subjectBytes);
    if (overwritten === null) return;
    setNotice(`${overwritten ? 'Updated' : 'Created'} SubjectDN from certificate subject.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  }
}

function upsertSubjectDn(keyMaterial: KeyMaterial, subjectDn: string, bytes: Uint8Array): boolean | null {
  const existing = keyMaterial.subjectDns?.[0];
  if (existing && !window.confirm('SubjectDN item already exists. Overwrite it?')) return null;

  const item: SubjectDnMaterial = {
    id: existing?.id ?? createKeyId(),
    label: 'SubjectDN',
    subjectDn,
    bytes
  };

  keyMaterial.subjectDns = [item];
  selectedNode = { keyId: keyMaterial.id, kind: 'subjectdn', subjectDnId: item.id };
  renderKeyTree();
  showSelectedNode();
  return Boolean(existing);
}

function createSubjectDnBytes(subjectDn: string): Uint8Array {
  const subject = new RelativeDistinguishedNames({ typesAndValues: parseSubjectDn(subjectDn) });
  return new Uint8Array(subject.toSchema().toBER(false));
}

function getCertificateSubjectDnBytes(certificateDer: Uint8Array): Uint8Array {
  const certificate = Certificate.fromBER(toArrayBuffer(certificateDer));
  return new Uint8Array(certificate.subject.toSchema().toBER(false));
}

function getCsrSubjectDnSource(keyId: string): { subjectDn: string; subjectBytes?: Uint8Array; error?: string } {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  const subjectDn = keyMaterial?.subjectDns?.at(-1);
  if (!subjectDn) {
    return { subjectDn: '(SubjectDN item is missing)', error: 'SubjectDN item is required before creating a CSR.' };
  }

  try {
    return { subjectDn: subjectDnBytesToLdapString(subjectDn.bytes), subjectBytes: new Uint8Array(subjectDn.bytes) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { subjectDn: '(Invalid SubjectDN item)', error: `SubjectDN item could not be decoded: ${message}` };
  }
}

function parseSubjectDnBytes(bytes: Uint8Array): RelativeDistinguishedNames {
  const asn1 = asn1js.fromBER(toArrayBuffer(bytes));
  if (asn1.offset === -1) throw new Error('Invalid SubjectDN DER.');
  if (asn1.offset !== bytes.byteLength) throw new Error('SubjectDN DER has trailing data.');
  return new RelativeDistinguishedNames({ schema: asn1.result });
}

function subjectDnBytesToLdapString(bytes: Uint8Array): string {
  const subject = parseSubjectDnBytes(bytes);
  if (subject.typesAndValues.length === 0) throw new Error('SubjectDN has no attributes.');
  return [...subject.typesAndValues].reverse().map(formatSubjectAttribute).join(', ');
}

function formatSubjectAttribute(attribute: AttributeTypeAndValue): string {
  return `${subjectName(attribute.type)}=${escapeDnText(readSubjectAttributeValue(attribute.value))}`;
}

function subjectName(oid: string): string {
  const names: Record<string, string> = {
    '2.5.4.6': 'C',
    '2.5.4.8': 'ST',
    '2.5.4.7': 'L',
    '2.5.4.10': 'O',
    '2.5.4.11': 'OU',
    '2.5.4.3': 'CN',
    '0.9.2342.19200300.100.1.25': 'DC',
    '2.5.4.5': 'serialNumber',
    '1.2.840.113549.1.9.1': 'emailAddress'
  };
  return names[oid] ?? oid;
}

function readSubjectAttributeValue(value: { valueBlock: unknown; toString: () => string }): string {
  const valueBlock = value.valueBlock as { value?: unknown };
  if (typeof valueBlock.value === 'string') return valueBlock.value;
  return value.toString();
}

function escapeDnText(value: string): string {
  return value.replace(/[\\,=\/]/g, (character) => `\\${character}`);
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

function deleteKeyPair(keyId: string): void {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;
  if (!window.confirm(`Delete ${keyMaterial.label || getDefaultKeyLabel(keyMaterial)} and all child items?`)) return;

  keyMaterials = keyMaterials.filter((material) => material.id !== keyId);
  selectedNode = keyMaterials[0] ? getFirstSelectableNode(keyMaterials[0]) : null;
  renderKeyTree();
  saveKeyButton.disabled = keyMaterials.length === 0;
  if (selectedNode) showSelectedNode();
  else viewer?.close?.();
  setNotice(`Deleted ${keyMaterial.label || 'KeyPair'}.`);
}

function deleteChildNode(target: SelectedKeyNode): void {
  const keyMaterial = keyMaterials.find((material) => material.id === target.keyId);
  if (!keyMaterial) return;
  if (!window.confirm(`Delete ${getDeleteLabel(keyMaterial, target)}?`)) return;

  if (target.kind === 'private') keyMaterial.privateKeyDer = undefined;
  if (target.kind === 'public') keyMaterial.publicKeyDer = undefined;
  if (target.kind === 'certificate') keyMaterial.certificateDer = undefined;
  if (target.kind === 'subjectdn') keyMaterial.subjectDns = (keyMaterial.subjectDns ?? []).filter((item) => item.id !== target.subjectDnId);
  if (target.kind === 'csr') keyMaterial.csrs = (keyMaterial.csrs ?? []).filter((item) => item.id !== target.csrId);

  selectedNode = getFirstSelectableNode(keyMaterial);
  renderKeyTree();
  if (selectedNode) showSelectedNode();
  else viewer?.close?.();
  setNotice(`Deleted ${getDeleteLabel(keyMaterial, target)}.`);
}

async function copyCsrAsPem(target: SelectedKeyNode): Promise<void> {
  const keyMaterial = keyMaterials.find((material) => material.id === target.keyId);
  const csr = keyMaterial?.csrs?.find((item) => item.id === target.csrId);
  if (!csr) return;

  try {
    await writeTextToClipboard(derToPem('CERTIFICATE REQUEST', csr.bytes));
    setNotice(`Copied ${csr.label} as PEM.`);
  } catch (error) {
    setNotice(error instanceof Error ? error.message : String(error), true);
  }
}

async function writeTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Could not copy CSR PEM to the clipboard.');
}

function derToPem(label: string, bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function getFirstSelectableNode(keyMaterial: KeyMaterial): SelectedKeyNode | null {
  if (keyMaterial.subjectDns?.[0]) return { keyId: keyMaterial.id, kind: 'subjectdn', subjectDnId: keyMaterial.subjectDns[0].id };
  if (keyMaterial.privateKeyDer) return { keyId: keyMaterial.id, kind: 'private' };
  if (keyMaterial.publicKeyDer && !keyMaterial.certificateDer) return { keyId: keyMaterial.id, kind: 'public' };
  if (keyMaterial.certificateDer) return { keyId: keyMaterial.id, kind: 'certificate' };
  if (keyMaterial.csrs?.[0]) return { keyId: keyMaterial.id, kind: 'csr', csrId: keyMaterial.csrs[0].id };
  return null;
}

function getDeleteLabel(keyMaterial: KeyMaterial, target: SelectedKeyNode): string {
  if (target.kind === 'subjectdn') return 'SubjectDN';
  if (target.kind === 'csr') return 'CSR';
  if (target.kind === 'private') return 'PrivateKey';
  if (target.kind === 'public') return 'PublicKey';
  if (target.kind === 'certificate') return 'Certificate';
  return keyMaterial.label || 'item';
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
  selectedNode = getFirstSelectableNode(keyMaterial);
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
      </summary>
      <div class="tree-children">
        ${(keyMaterial.subjectDns ?? []).map((subjectDn) => renderSubjectDnNode(keyMaterial, subjectDn)).join('')}
        ${keyMaterial.privateKeyDer ? renderMaterialNode(keyMaterial, 'private', 'PrivateKey', keyMaterial.privateKeyDer, info.label) : ''}
        ${keyMaterial.publicKeyDer ? renderMaterialNode(keyMaterial, 'public', 'PublicKey', keyMaterial.publicKeyDer, info.label) : ''}
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
      <button class="tree-icon-button" type="button" data-child-menu data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="subjectdn" data-subject-dn-id="${escapeHtml(subjectDn.id)}" aria-label="SubjectDN actions"><span class="tree-icon leaf" aria-hidden="true"></span></button>
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
      : kind === 'certificate'
        ? `<button class="tree-icon-button" type="button" data-certificate-menu data-key-id="${escapeHtml(keyMaterial.id)}" aria-label="Certificate actions"><span class="tree-icon leaf" aria-hidden="true"></span></button>`
        : `<button class="tree-icon-button" type="button" data-child-menu data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="${kind}" aria-label="${label} actions"><span class="tree-icon leaf" aria-hidden="true"></span></button>`;
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
      <button class="tree-icon-button" type="button" data-child-menu data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="csr" data-csr-id="${escapeHtml(csr.id)}" aria-label="CSR actions"><span class="tree-icon leaf" aria-hidden="true"></span></button>
      <button class="tree-item" type="button" data-key-id="${escapeHtml(keyMaterial.id)}" data-key-node="csr" data-csr-id="${escapeHtml(csr.id)}" aria-pressed="${selected}">
        <span class="tree-tag">${escapeHtml(csr.label)} (${csr.bytes.byteLength}) // ${escapeHtml(csr.hashAlgorithm)}</span>
      </button>
    </div>
  `;
}

function renameKeyMaterial(keyId: string, label: string): void {
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  if (!keyMaterial) return;

  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    setNotice('Key pair label cannot be empty.', true);
    renderKeyTree();
    return;
  }

  keyMaterial.label = trimmedLabel;
  renderKeyTree();
  setNotice(`Renamed key pair to ${trimmedLabel}.`);
}

function getDefaultKeyLabel(keyMaterial: Pick<KeyMaterial, 'privateKeyDer' | 'publicKeyDer'>): string {
  return recognizeKeyMaterial({ privateKeyDer: keyMaterial.privateKeyDer, publicKeyDer: keyMaterial.publicKeyDer }).label;
}

function getPkcs12FileName(keys: KeyMaterial[]): string {
  if (keys.length !== 1) return 'private-key-gadgets.p12';
  const label = keys[0].label || getDefaultKeyLabel(keys[0]);
  return `${label.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'keypair'}.p12`;
}

function getSaveKeyNote(keyMaterial: KeyMaterial): string {
  const info = recognizeKeyMaterial(keyMaterial);
  const certificate = keyMaterial.certificateDer ? ', Certificate' : '';
  return `${info.label}, PrivateKey${certificate}`;
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
  saveKeyButton.disabled = busy || keyMaterials.length === 0;
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
  setCertificateMenuOpen(false);
  setChildItemMenuOpen(false);
  privateKeyMenuKeyId = keyId;
  const keyMaterial = keyMaterials.find((material) => material.id === keyId);
  const info = keyMaterial ? recognizeKeyMaterial(keyMaterial) : null;
  const supported = Boolean(keyMaterial?.privateKeyDer && keyMaterial.publicKeyDer && (info?.family === 'RSA' || info?.family === 'EC'));
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
  setCertificateMenuOpen(false);
  setChildItemMenuOpen(false);
  keyPairMenuKeyId = keyId;
  const rect = anchor.getBoundingClientRect();
  keyPairMenu.style.left = `${rect.left}px`;
  keyPairMenu.style.top = `${rect.bottom + 2}px`;
  keyPairMenu.hidden = false;
}

function setCertificateMenuOpen(open: boolean, keyId?: string, anchor?: HTMLElement): void {
  if (!open || !keyId || !anchor) {
    certificateMenu.hidden = true;
    certificateMenuKeyId = null;
    return;
  }

  setPrivateKeyMenuOpen(false);
  setKeyPairMenuOpen(false);
  setChildItemMenuOpen(false);
  certificateMenuKeyId = keyId;
  const rect = anchor.getBoundingClientRect();
  certificateMenu.style.left = `${rect.left}px`;
  certificateMenu.style.top = `${rect.bottom + 2}px`;
  certificateMenu.hidden = false;
}

function setChildItemMenuOpen(open: boolean, target?: SelectedKeyNode, anchor?: HTMLElement): void {
  if (!open || !target || !anchor) {
    childItemMenu.hidden = true;
    childItemMenuTarget = null;
    return;
  }

  setPrivateKeyMenuOpen(false);
  setKeyPairMenuOpen(false);
  setCertificateMenuOpen(false);
  childItemMenuTarget = target;
  copyCsrPemMenuItem.hidden = target.kind !== 'csr';
  const rect = anchor.getBoundingClientRect();
  childItemMenu.style.left = `${rect.left}px`;
  childItemMenu.style.top = `${rect.bottom + 2}px`;
  childItemMenu.hidden = false;
}

function isChildItemMenuTarget(button: HTMLButtonElement): boolean {
  const target = childItemMenuTarget;
  return Boolean(
    target &&
      target.keyId === button.dataset.keyId &&
      target.kind === button.dataset.keyNode &&
      target.csrId === button.dataset.csrId &&
      target.subjectDnId === button.dataset.subjectDnId
  );
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

function recognizeKeyMaterial(material: Pick<KeyMaterial, 'privateKeyDer' | 'publicKeyDer'>): RecognizedKeyInfo {
  return (material.publicKeyDer ? recognizePublicKey(material.publicKeyDer) : null) ||
    (material.privateKeyDer ? recognizePrivateKey(material.privateKeyDer) : createRecognizedKeyInfo('Unknown', 'Unknown'));
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