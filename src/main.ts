import './styles.css';

type PkiStudioInstance = {
  loadBytes: (bytes: Uint8Array, notice?: string) => void;
};

type PkiStudioApi = {
  init: (options: { mount: string | Element; oidUrl?: string; shadowRoot?: boolean; newWindowUrl?: string }) => PkiStudioInstance;
};

declare global {
  interface Window {
    PkiStudio?: PkiStudioApi;
  }
}

type KeyMaterial = {
  id: string;
  privateKeyDer: Uint8Array;
  publicKeyDer: Uint8Array;
  privateKeyFingerprint: string;
  publicKeyFingerprint: string;
};

type KeyNodeKind = 'private' | 'public';

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

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) throw new Error('App mount was not found');

app.innerHTML = `
  <main class="shell">
    <nav class="toolbar" aria-label="Application">
      <strong>Private Key Gadgets</strong>
    </nav>
    <section class="workspace">
      <form id="keyForm" class="panel key-panel">
        <h1>Key Pair</h1>
        <label class="field">
          <span>Algorithm</span>
          <select id="algorithm">
            <option value="">Detecting supported algorithms...</option>
          </select>
        </label>
        <div class="actions">
          <button id="generateButton" class="primary" type="submit">Generate</button>
        </div>
        <section class="material-tree" aria-label="Generated key material">
          <div id="keyTree" class="tree empty">No key generated yet.</div>
        </section>
        <div class="status" aria-live="polite">
          <span class="status-label">Current key</span>
          <code id="keySummary">No key generated.</code>
          <span class="status-label">Private key fingerprint</span>
          <code id="privateFingerprint">-</code>
          <span class="status-label">Public key fingerprint</span>
          <code id="publicFingerprint">-</code>
        </div>
        <p id="formNotice" class="notice">Generated DER is sent to the ASN.1 viewer.</p>
      </form>
      <section class="viewer-panel panel" aria-label="ASN.1 viewer">
        <div id="viewerMount"></div>
      </section>
    </section>
  </main>
`;

const keyForm = query<HTMLFormElement>('#keyForm');
const algorithmSelect = query<HTMLSelectElement>('#algorithm');
const generateButton = query<HTMLButtonElement>('#generateButton');
const keyTree = query<HTMLElement>('#keyTree');
const keySummary = query<HTMLElement>('#keySummary');
const privateFingerprint = query<HTMLElement>('#privateFingerprint');
const publicFingerprint = query<HTMLElement>('#publicFingerprint');
const formNotice = query<HTMLElement>('#formNotice');

let viewer: PkiStudioInstance | null = null;
let keyMaterial: KeyMaterial | null = null;
let selectedNode: KeyNodeKind | null = null;
let supportedAlgorithms: SupportedKeyAlgorithm[] = [];

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

  await populateSupportedAlgorithms();
});

keyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await generateKeyPair();
});

keyTree.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-key-node]') : null;
  if (!button) return;

  selectKeyNode(button.dataset.keyNode as KeyNodeKind);
});

async function generateKeyPair(): Promise<void> {
  setBusy(true);
  setNotice('Generating key pair...');

  try {
    const selection = algorithmSelect.value;
    const { algorithm, usages } = getGenerationOptions(selection);
    const generated = await crypto.subtle.generateKey(algorithm, true, usages);

    if (!isCryptoKeyPair(generated)) throw new Error('The browser did not return a key pair.');

    const [privateKeyBuffer, publicKeyBuffer] = await Promise.all([
      crypto.subtle.exportKey('pkcs8', generated.privateKey),
      crypto.subtle.exportKey('spki', generated.publicKey)
    ]);

    const privateKeyDer = new Uint8Array(privateKeyBuffer);
    const publicKeyDer = new Uint8Array(publicKeyBuffer);

    keyMaterial = {
      id: createKeyId(),
      privateKeyDer,
      publicKeyDer,
      privateKeyFingerprint: await sha256Hex(privateKeyDer),
      publicKeyFingerprint: await sha256Hex(publicKeyDer)
    };

    selectedNode = 'private';
    updateKeyStatus();
    renderKeyTree();
    showSelectedNode();
    setNotice('Generated a key pair. Select a tree item to open it in the viewer.');
  } catch (error) {
    keyMaterial = null;
    selectedNode = null;
    updateKeyStatus();
    renderKeyTree();
    setNotice(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
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

function selectKeyNode(kind: KeyNodeKind): void {
  if (!keyMaterial) return;
  selectedNode = kind;
  renderKeyTree();
  showSelectedNode();
}

function showSelectedNode(): void {
  if (!keyMaterial || !selectedNode) return;

  const bytes = selectedNode === 'private' ? keyMaterial.privateKeyDer : keyMaterial.publicKeyDer;
  const info = recognizeKeyMaterial(keyMaterial);
  const format = selectedNode === 'private' ? 'PKCS#8 DER' : 'SPKI DER';
  const label = selectedNode === 'private' ? 'private key' : 'public key';
  showBytes(bytes, `${info.label} ${label} (${format})`);
}

function renderKeyTree(): void {
  if (!keyMaterial) {
    keyTree.className = 'tree empty';
    keyTree.textContent = 'No key generated yet.';
    return;
  }

  const info = recognizeKeyMaterial(keyMaterial);
  keyTree.className = 'tree';
  keyTree.innerHTML = `
    <details class="tree-node" open>
      <summary>
        <span class="tree-toggle" aria-hidden="true">−</span>
        <span class="tree-icon folder" aria-hidden="true"></span>
        <span class="tree-tag">${escapeHtml(info.label)}</span>
        <span class="tree-pill">KeyPair</span>
      </summary>
      <div class="tree-children">
        ${renderMaterialNode('private', 'PrivateKey', keyMaterial.privateKeyDer)}
        ${renderMaterialNode('public', 'PublicKey', keyMaterial.publicKeyDer)}
      </div>
    </details>
  `;
}

function renderMaterialNode(kind: KeyNodeKind, label: string, bytes: Uint8Array): string {
  const selected = selectedNode === kind;
  return `
    <button class="tree-item${selected ? ' selected' : ''}" type="button" data-key-node="${kind}" aria-pressed="${selected}">
      <span class="tree-icon leaf" aria-hidden="true"></span>
      <span class="tree-tag">${label} (${bytes.byteLength})</span>
    </button>
  `;
}

function updateKeyStatus(): void {
  keySummary.textContent = keyMaterial ? recognizeKeyMaterial(keyMaterial).label : 'No key generated.';
  privateFingerprint.textContent = keyMaterial?.privateKeyFingerprint ?? '-';
  publicFingerprint.textContent = keyMaterial?.publicKeyFingerprint ?? '-';
}

function setBusy(busy: boolean): void {
  generateButton.disabled = busy;
  algorithmSelect.disabled = busy || supportedAlgorithms.length === 0;
}

function setNotice(message: string, isError = false): void {
  formNotice.textContent = message;
  formNotice.classList.toggle('error', isError);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buffer = new Uint8Array(bytes.byteLength);
  buffer.set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', buffer.buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function populateSupportedAlgorithms(): Promise<void> {
  setNotice('Detecting supported key pair algorithms...');
  supportedAlgorithms = [];
  algorithmSelect.innerHTML = '<option value="">Detecting supported algorithms...</option>';

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
    algorithmSelect.innerHTML = '<option value="">No supported key pair algorithms</option>';
    setNotice('This browser did not report support for the candidate key pair algorithms.', true);
    setBusy(false);
    return;
  }

  algorithmSelect.innerHTML = supportedAlgorithms
    .map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidate.canonicalLabel)}</option>`)
    .join('');
  setBusy(false);
  setNotice(`Detected ${supportedAlgorithms.length} supported key pair algorithms.`);
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