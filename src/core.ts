import * as asn1js from 'asn1js';
import { AlgorithmIdentifier as PkijsAlgorithmIdentifier, AttributeTypeAndValue, BasicConstraints, Certificate, CertificationRequest, Extension, RelativeDistinguishedNames, Time } from 'pkijs';
import { readPkcs12Keys, writePkcs12Keys, type Pkcs12KeyMaterial } from './pkcs12';

export type CsrMaterial = {
  id: string;
  label: string;
  subjectDn: string;
  hashAlgorithm: string;
  bytes: Uint8Array;
};

export type SubjectDnMaterial = {
  id: string;
  label: string;
  subjectDn: string;
  bytes: Uint8Array;
};

export type PvkGadgetsKeyMaterial = Omit<Pkcs12KeyMaterial, 'privateKeyDer' | 'publicKeyDer'> & {
  privateKeyDer?: Uint8Array;
  publicKeyDer?: Uint8Array;
  csrs?: CsrMaterial[];
  subjectDns?: SubjectDnMaterial[];
};

export type RecognizedKeyInfo = {
  family: 'RSA' | 'EC' | 'Ed25519' | 'Ed448' | 'X25519' | 'X448' | 'Unknown';
  label: string;
  canSign: boolean;
  canDerive: boolean;
  namedCurve?: string;
};

export type KeyAlgorithmCandidate = {
  id: string;
  canonicalId: string;
  canonicalLabel: string;
  algorithm: AlgorithmIdentifier | RsaHashedKeyGenParams | EcKeyGenParams;
  usages: KeyUsage[];
};

export type CertificateKeyUsage = {
  id: string;
  label: string;
  bit: number;
  defaultChecked?: boolean;
};

export type GenerateKeyPairOptions = {
  createId?: () => string;
  label?: string;
};

export type CreateCsrOptions = {
  privateKeyDer: Uint8Array;
  publicKeyDer: Uint8Array;
  subjectDn: string;
  subjectBytes: Uint8Array;
  hashAlgorithm: string;
};

export type CsrResult = {
  subjectDn: string;
  hashAlgorithm: string;
  bytes: Uint8Array;
};

export type CreateSelfSignedCertificateOptions = {
  privateKeyDer: Uint8Array;
  publicKeyDer: Uint8Array;
  subjectDn: string;
  subjectBytes: Uint8Array;
  hashAlgorithm: string;
  validityDays: number;
  keyUsages: string[];
};

export type CertificateResult = {
  subjectDn: string;
  hashAlgorithm: string;
  validityDays: number;
  bytes: Uint8Array;
};

export type PvkGadgetsCoreApi = {
  version: string;
  keyAlgorithms: KeyAlgorithmCandidate[];
  certificateKeyUsages: CertificateKeyUsage[];
  getSupportedKeyAlgorithms: () => Promise<KeyAlgorithmCandidate[]>;
  generateKeyPair: (selection: string, options?: GenerateKeyPairOptions) => Promise<PvkGadgetsKeyMaterial>;
  recognizeKeyMaterial: (material: Pick<PvkGadgetsKeyMaterial, 'privateKeyDer' | 'publicKeyDer'>) => RecognizedKeyInfo;
  certificateMatchesKey: (material: Pick<PvkGadgetsKeyMaterial, 'privateKeyDer' | 'publicKeyDer'>, certificatePublicKeyDer: Uint8Array) => Promise<boolean>;
  verifyPrivateKeyMatchesPublicKey: (privateKeyDer: Uint8Array, publicKeyDer: Uint8Array, info?: RecognizedKeyInfo) => Promise<boolean>;
  createSubjectDn: (subjectDn: string) => Uint8Array;
  getCertificateSubjectDn: (certificateDer: Uint8Array) => Uint8Array;
  parseSubjectDn: (bytes: Uint8Array) => RelativeDistinguishedNames;
  subjectDnToString: (bytes: Uint8Array) => string;
  createCsr: (options: CreateCsrOptions) => Promise<CsrResult>;
  createSelfSignedCertificate: (options: CreateSelfSignedCertificateOptions) => Promise<CertificateResult>;
  readPkcs12: typeof readPkcs12Keys;
  writePkcs12: typeof writePkcs12Keys;
  derToPem: (label: string, bytes: Uint8Array) => string;
  pemToDer: (text: string, expectedLabel?: string) => Uint8Array;
  bytesEqual: (left: Uint8Array, right: Uint8Array) => boolean;
  toArrayBuffer: (bytes: Uint8Array) => ArrayBuffer;
};

type Asn1Node = ReturnType<typeof asn1js.fromBER>['result'];

const CORE_VERSION = __PVKGADGETS_VERSION__;

const RSA_PKCS1_SIGNATURE_ALGORITHM_OIDS: Record<string, string> = {
  'SHA-1': '1.2.840.113549.1.1.5',
  'SHA-256': '1.2.840.113549.1.1.11',
  'SHA-384': '1.2.840.113549.1.1.12',
  'SHA-512': '1.2.840.113549.1.1.13'
};

export const KEY_ALGORITHM_CANDIDATES: KeyAlgorithmCandidate[] = [
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

export const CERTIFICATE_KEY_USAGES: CertificateKeyUsage[] = [
  { id: 'digitalSignature', label: 'digitalSignature', bit: 0 },
  { id: 'nonRepudiation', label: 'nonRepudiation', bit: 1 },
  { id: 'keyEncipherment', label: 'keyEncipherment', bit: 2 },
  { id: 'dataEncipherment', label: 'dataEncipherment', bit: 3 },
  { id: 'keyAgreement', label: 'keyAgreement', bit: 4 },
  { id: 'keyCertSign', label: 'certSign', bit: 5, defaultChecked: true },
  { id: 'cRLSign', label: 'crlSign', bit: 6, defaultChecked: true },
  { id: 'encipherOnly', label: 'encipherOnly', bit: 7 },
  { id: 'decipherOnly', label: 'decipherOnly', bit: 8 }
];

export const PvkGadgetsCore: PvkGadgetsCoreApi = {
  version: CORE_VERSION,
  keyAlgorithms: KEY_ALGORITHM_CANDIDATES,
  certificateKeyUsages: CERTIFICATE_KEY_USAGES,
  getSupportedKeyAlgorithms,
  generateKeyPair,
  recognizeKeyMaterial,
  certificateMatchesKey,
  verifyPrivateKeyMatchesPublicKey,
  createSubjectDn,
  getCertificateSubjectDn,
  parseSubjectDn: parseSubjectDnBytes,
  subjectDnToString,
  createCsr,
  createSelfSignedCertificate,
  readPkcs12: readPkcs12Keys,
  writePkcs12: writePkcs12Keys,
  derToPem,
  pemToDer,
  bytesEqual,
  toArrayBuffer
};

async function getSupportedKeyAlgorithms(): Promise<KeyAlgorithmCandidate[]> {
  const results = await Promise.all(
    KEY_ALGORITHM_CANDIDATES.map(async (candidate) => ({
      candidate,
      supported: await isKeyAlgorithmSupported(candidate)
    }))
  );

  const uniqueSupportedAlgorithms = new Map<string, KeyAlgorithmCandidate>();
  for (const result of results) {
    if (!result.supported || uniqueSupportedAlgorithms.has(result.candidate.canonicalId)) continue;
    uniqueSupportedAlgorithms.set(result.candidate.canonicalId, result.candidate);
  }

  return [...uniqueSupportedAlgorithms.values()];
}

async function generateKeyPair(selection: string, options: GenerateKeyPairOptions = {}): Promise<PvkGadgetsKeyMaterial> {
  const { algorithm, usages } = getGenerationOptions(selection);
  const generated = await crypto.subtle.generateKey(algorithm, true, usages);

  if (!isCryptoKeyPair(generated)) throw new Error('The browser did not return a key pair.');

  const [privateKeyBuffer, publicKeyBuffer] = await Promise.all([
    crypto.subtle.exportKey('pkcs8', generated.privateKey),
    crypto.subtle.exportKey('spki', generated.publicKey)
  ]);

  const privateKeyDer = new Uint8Array(privateKeyBuffer);
  const publicKeyDer = new Uint8Array(publicKeyBuffer);

  return {
    id: options.createId?.() ?? createKeyId(),
    label: options.label || getDefaultKeyLabel({ privateKeyDer, publicKeyDer }),
    privateKeyDer,
    publicKeyDer
  };
}

function getGenerationOptions(selection: string): KeyAlgorithmCandidate {
  const supported = KEY_ALGORITHM_CANDIDATES.find((candidate) => candidate.id === selection);
  if (!supported) throw new Error(`Unsupported algorithm: ${selection || '(none selected)'}`);
  return supported;
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

function isCryptoKeyPair(value: CryptoKey | CryptoKeyPair): value is CryptoKeyPair {
  return 'privateKey' in value && 'publicKey' in value;
}

function recognizeKeyMaterial(material: Pick<PvkGadgetsKeyMaterial, 'privateKeyDer' | 'publicKeyDer'>): RecognizedKeyInfo {
  return (material.publicKeyDer ? recognizePublicKey(material.publicKeyDer) : null) ||
    (material.privateKeyDer ? recognizePrivateKey(material.privateKeyDer) : createRecognizedKeyInfo('Unknown', 'Unknown'));
}

function recognizePublicKey(bytes: Uint8Array): RecognizedKeyInfo | null {
  try {
    const root = parseAsn1(bytes);
    const algorithmIdentifier = readSequenceChild(root, 0);
    const { oid, parameters } = parseAlgorithmIdentifier(algorithmIdentifier);

    if (oid === '1.2.840.113549.1.1.1') {
      const bitString = readSequenceChild(root, 1);
      const modulusBits = readRsaPublicKeyBits(bitString);
      return createRecognizedKeyInfo('RSA', modulusBits ? `RSA ${modulusBits}` : 'RSA');
    }

    return infoFromAlgorithmIdentifier(oid, parameters);
  } catch {
    return null;
  }
}

function recognizePrivateKey(bytes: Uint8Array): RecognizedKeyInfo {
  try {
    const root = parseAsn1(bytes);
    const algorithmIdentifier = readSequenceChild(root, 1);
    const { oid, parameters } = parseAlgorithmIdentifier(algorithmIdentifier);

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

async function certificateMatchesKey(material: Pick<PvkGadgetsKeyMaterial, 'privateKeyDer' | 'publicKeyDer'>, certificatePublicKeyDer: Uint8Array): Promise<boolean> {
  if (material.publicKeyDer) return bytesEqual(material.publicKeyDer, certificatePublicKeyDer);
  if (!material.privateKeyDer) throw new Error('PrivateKey item is required before adding a certificate.');

  const info = recognizeKeyMaterial(material);
  if (!info.canSign) throw new Error(`${info.label} cannot be checked against a certificate.`);

  return verifyPrivateKeyMatchesPublicKey(material.privateKeyDer, certificatePublicKeyDer, info);
}

async function verifyPrivateKeyMatchesPublicKey(privateKeyDer: Uint8Array, publicKeyDer: Uint8Array, info = recognizeKeyMaterial({ privateKeyDer, publicKeyDer })): Promise<boolean> {
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

async function createCsr(options: CreateCsrOptions): Promise<CsrResult> {
  const info = recognizeKeyMaterial({ privateKeyDer: options.privateKeyDer, publicKeyDer: options.publicKeyDer });
  if (info.family !== 'RSA' && info.family !== 'EC') throw new Error(`${info.label} is not supported for CSR signing yet.`);

  const subject = parseSubjectDnBytes(options.subjectBytes);
  const [privateKey, publicKey] = await Promise.all([
    importSigningPrivateKey(options.privateKeyDer, info, options.hashAlgorithm),
    importSigningPublicKey(options.publicKeyDer, info, options.hashAlgorithm)
  ]);

  const request = new CertificationRequest();
  request.subject = subject;
  await request.subjectPublicKeyInfo.importKey(publicKey);
  request.attributes = [];
  if (info.family === 'RSA') {
    await signCertificationRequestWithRsaPkcs1(request, privateKey, options.hashAlgorithm);
  } else {
    await request.sign(privateKey, options.hashAlgorithm);
  }

  return {
    subjectDn: options.subjectDn,
    hashAlgorithm: options.hashAlgorithm,
    bytes: new Uint8Array(request.toSchema(true).toBER(false))
  };
}

async function createSelfSignedCertificate(options: CreateSelfSignedCertificateOptions): Promise<CertificateResult> {
  const info = recognizeKeyMaterial({ privateKeyDer: options.privateKeyDer, publicKeyDer: options.publicKeyDer });
  if (info.family !== 'RSA' && info.family !== 'EC') throw new Error(`${info.label} is not supported for certificate signing yet.`);

  const subject = parseSubjectDnBytes(options.subjectBytes);
  const notBefore = new Date();
  const notAfter = new Date(notBefore.getTime() + options.validityDays * 24 * 60 * 60 * 1000);
  const [privateKey, publicKey] = await Promise.all([
    importSigningPrivateKey(options.privateKeyDer, info, options.hashAlgorithm),
    importSigningPublicKey(options.publicKeyDer, info, options.hashAlgorithm)
  ]);

  const certificate = new Certificate();
  certificate.version = 2;
  certificate.serialNumber = new asn1js.Integer({ valueHex: toArrayBuffer(createCertificateSerialNumber()) });
  certificate.issuer = subject;
  certificate.subject = subject;
  certificate.notBefore = new Time({ type: 0, value: notBefore });
  certificate.notAfter = new Time({ type: 0, value: notAfter });
  await certificate.subjectPublicKeyInfo.importKey(publicKey);
  certificate.extensions = createSelfSignedCertificateExtensions(options.keyUsages);
  if (info.family === 'RSA') {
    await signCertificateWithRsaPkcs1(certificate, privateKey, options.hashAlgorithm);
  } else {
    await certificate.sign(privateKey, options.hashAlgorithm);
  }

  return {
    subjectDn: options.subjectDn,
    hashAlgorithm: options.hashAlgorithm,
    validityDays: options.validityDays,
    bytes: new Uint8Array(certificate.toSchema(true).toBER(false))
  };
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

async function signCertificationRequestWithRsaPkcs1(request: CertificationRequest, privateKey: CryptoKey, hashAlgorithm: string): Promise<void> {
  request.signatureAlgorithm = createRsaPkcs1SignatureAlgorithmIdentifier(hashAlgorithm);
  await signRsaPkcs1Der(request as unknown as RsaPkcs1Signable, privateKey);
}

async function signCertificateWithRsaPkcs1(certificate: Certificate, privateKey: CryptoKey, hashAlgorithm: string): Promise<void> {
  certificate.signature = createRsaPkcs1SignatureAlgorithmIdentifier(hashAlgorithm);
  certificate.signatureAlgorithm = createRsaPkcs1SignatureAlgorithmIdentifier(hashAlgorithm);
  await signRsaPkcs1Der(certificate, privateKey);
}

type RsaPkcs1Signable = {
  tbsView: Uint8Array;
  signatureValue: asn1js.BitString;
  encodeTBS: () => asn1js.Sequence;
};

async function signRsaPkcs1Der(target: RsaPkcs1Signable, privateKey: CryptoKey): Promise<void> {
  target.tbsView = new Uint8Array(target.encodeTBS().toBER(false));
  const signature = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, toArrayBuffer(target.tbsView));
  target.signatureValue = new asn1js.BitString({ valueHex: signature });
}

function createRsaPkcs1SignatureAlgorithmIdentifier(hashAlgorithm: string): PkijsAlgorithmIdentifier {
  const algorithmId = RSA_PKCS1_SIGNATURE_ALGORITHM_OIDS[hashAlgorithm.toUpperCase()];
  if (!algorithmId) throw new Error(`${hashAlgorithm} is not supported for RSA PKCS#1 v1.5 signing.`);
  return new PkijsAlgorithmIdentifier({
    algorithmId,
    algorithmParams: new asn1js.Null()
  });
}

function createSelfSignedCertificateExtensions(keyUsages: string[]): Extension[] {
  const selected = new Set(keyUsages);
  const basicConstraints = new BasicConstraints({ cA: selected.has('keyCertSign') });
  const keyUsage = createKeyUsageBitString(selected);

  return [
    new Extension({
      extnID: '2.5.29.19',
      critical: selected.has('keyCertSign'),
      extnValue: basicConstraints.toSchema().toBER(false),
      parsedValue: basicConstraints
    }),
    new Extension({
      extnID: '2.5.29.15',
      critical: true,
      extnValue: keyUsage.toBER(false),
      parsedValue: keyUsage
    })
  ];
}

function createKeyUsageBitString(selected: Set<string>): asn1js.BitString {
  const highestBit = CERTIFICATE_KEY_USAGES.reduce((highest, usage) => selected.has(usage.id) ? Math.max(highest, usage.bit) : highest, 0);
  const value = new Uint8Array(Math.floor(highestBit / 8) + 1);
  for (const usage of CERTIFICATE_KEY_USAGES) {
    if (!selected.has(usage.id)) continue;
    value[Math.floor(usage.bit / 8)] |= 0x80 >> (usage.bit % 8);
  }
  return new asn1js.BitString({ valueHex: toArrayBuffer(value) });
}

function createCertificateSerialNumber(): Uint8Array {
  const serial = new Uint8Array(16);
  crypto.getRandomValues(serial);
  serial[0] &= 0x7f;
  if (serial.every((byte) => byte === 0)) serial[15] = 1;
  return serial;
}

function createSubjectDn(subjectDn: string): Uint8Array {
  const subject = new RelativeDistinguishedNames({ typesAndValues: parseSubjectDn(subjectDn) });
  return new Uint8Array(subject.toSchema().toBER(false));
}

function getCertificateSubjectDn(certificateDer: Uint8Array): Uint8Array {
  const certificate = Certificate.fromBER(toArrayBuffer(certificateDer));
  return new Uint8Array(certificate.subject.toSchema().toBER(false));
}

function parseSubjectDnBytes(bytes: Uint8Array): RelativeDistinguishedNames {
  const asn1 = asn1js.fromBER(toArrayBuffer(bytes));
  if (asn1.offset === -1) throw new Error('Invalid SubjectDN DER.');
  if (asn1.offset !== bytes.byteLength) throw new Error('SubjectDN DER has trailing data.');
  return new RelativeDistinguishedNames({ schema: asn1.result });
}

function subjectDnToString(bytes: Uint8Array): string {
  const subject = parseSubjectDnBytes(bytes);
  if (subject.typesAndValues.length === 0) throw new Error('SubjectDN has no attributes.');
  return [...subject.typesAndValues].reverse().map(formatSubjectAttribute).join(', ');
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

function derToPem(label: string, bytes: Uint8Array): string {
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

function pemToDer(text: string, expectedLabel?: string): Uint8Array {
  const blockPattern = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/g;
  const blocks: Uint8Array[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(text)) !== null) {
    if (expectedLabel && match[1].toUpperCase() !== expectedLabel.toUpperCase()) continue;
    const base64 = match[2].replace(/\s+/g, '');
    if (!base64) throw new Error(`PEM block ${match[1]} has no base64 data.`);
    blocks.push(base64ToBytes(base64));
  }

  if (blocks.length === 0) throw new Error(expectedLabel ? `${expectedLabel} PEM was not found.` : 'Could not read a PEM BEGIN/END block.');
  return concatBytes(blocks);
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(base64, 'base64'));
  throw new Error('Base64 decoding is not available in this runtime.');
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  throw new Error('Base64 encoding is not available in this runtime.');
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function parseAsn1(bytes: Uint8Array): Asn1Node {
  const asn1 = asn1js.fromBER(toArrayBuffer(bytes));
  if (asn1.offset === -1) throw new Error('Invalid DER.');
  if (asn1.offset !== bytes.byteLength) throw new Error('DER has trailing data.');
  return asn1.result;
}

function readSequenceChild(node: Asn1Node, index: number): Asn1Node {
  const children = readChildren(node);
  const child = children[index];
  if (!child) throw new Error('Missing ASN.1 sequence child.');
  return child;
}

function readChildren(node: Asn1Node): Asn1Node[] {
  const valueBlock = node.valueBlock as { value?: Asn1Node[] };
  return Array.isArray(valueBlock.value) ? valueBlock.value : [];
}

function parseAlgorithmIdentifier(node: Asn1Node): { oid: string; parameters: string | null } {
  const children = readChildren(node);
  const oidNode = children[0];
  if (!(oidNode instanceof asn1js.ObjectIdentifier)) throw new Error('Missing algorithm OID.');
  const parameterNode = children[1];
  return {
    oid: oidNode.valueBlock.toString(),
    parameters: parameterNode instanceof asn1js.ObjectIdentifier ? parameterNode.valueBlock.toString() : null
  };
}

function readRsaPublicKeyBits(bitStringNode: Asn1Node): number | null {
  if (!(bitStringNode instanceof asn1js.BitString)) return null;
  const valueBlock = bitStringNode.valueBlock as { valueHexView?: Uint8Array };
  const rsaPublicKeyBytes = valueBlock.valueHexView;
  if (!rsaPublicKeyBytes || rsaPublicKeyBytes.length === 0) return null;

  const rsaPublicKey = parseAsn1(rsaPublicKeyBytes);
  const modulus = readSequenceChild(rsaPublicKey, 0);
  const modulusBytes = (modulus.valueBlock as { valueHexView?: Uint8Array }).valueHexView;
  if (!(modulus instanceof asn1js.Integer) || !modulusBytes || modulusBytes.length === 0) return null;

  let offset = 0;
  while (offset < modulusBytes.length - 1 && modulusBytes[offset] === 0) offset += 1;
  const firstByte = modulusBytes[offset];
  const firstByteBits = firstByte === 0 ? 0 : 8 - Math.clz32(firstByte) + 24;
  return (modulusBytes.length - offset - 1) * 8 + firstByteBits;
}

function curveNameFromOid(oid: string): string | undefined {
  const names: Record<string, string> = {
    '1.2.840.10045.3.1.7': 'P-256',
    '1.3.132.0.34': 'P-384',
    '1.3.132.0.35': 'P-521'
  };
  return names[oid];
}

function getDefaultKeyLabel(keyMaterial: Pick<PvkGadgetsKeyMaterial, 'privateKeyDer' | 'publicKeyDer'>): string {
  return recognizeKeyMaterial({ privateKeyDer: keyMaterial.privateKeyDer, publicKeyDer: keyMaterial.publicKeyDer }).label;
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
