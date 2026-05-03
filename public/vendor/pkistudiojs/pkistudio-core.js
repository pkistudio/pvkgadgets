((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PkiStudioCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, () => {
  const VERSION = '0.2.2';
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

  function bytesEqual(left, right) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  function toUint8Array(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new Error('Input must be a Uint8Array, ArrayBuffer, typed array, or string');
  }

  function decodeAscii(bytes) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  function encodeUtf8(text) {
    return new TextEncoder().encode(text);
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
    if (typeof atob === 'function') {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(base64, 'base64'));
    throw new Error('Base64 decoding is not available in this runtime');
  }

  function bytesToBase64(bytes) {
    if (typeof btoa === 'function') {
      let binary = '';
      for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
      return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
    throw new Error('Base64 encoding is not available in this runtime');
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
    return concatBytes(blocks);
  }

  function decodeHeaderlessPem(text) {
    const base64 = normalizeBase64Text(text);
    if (!base64) throw new Error('Headerless PEM data must be valid base64 text');
    const bytes = base64ToBytes(base64);
    parseElements(bytes, 0, bytes.length);
    return bytes;
  }

  function hexToBytes(text, options = {}) {
    const hex = text.replace(/\s+/g, '');
    if (!hex && options.allowEmpty) return new Uint8Array();
    if (!hex) throw new Error('HEX data is empty');
    if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('HEX text may contain only 0-9 and a-f');
    if (hex.length % 2 !== 0) throw new Error('HEX text must contain an even number of digits');

    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = parseInt(hex.slice(index * 2, (index * 2) + 2), 16);
    }
    return bytes;
  }

  function toLowerHexString(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
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

  function decodeInteger(bytes) {
    if (bytes.length === 0) return '0';
    if (bytes.length > 8) return `0x${toLowerHexString(bytes)}`;

    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    if ((bytes[0] & 0x80) !== 0) value -= 1n << BigInt(bytes.length * 8);
    return value.toString();
  }

  function decodeBmpString(bytes) {
    const codes = [];
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      codes.push((bytes[index] << 8) | bytes[index + 1]);
    }
    return String.fromCharCode(...codes);
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
    let remaining = Math.floor(value / 128);
    while (remaining > 0) {
      bytes.unshift((remaining & 0x7f) | 0x80);
      remaining = Math.floor(remaining / 128);
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

  function getNodeValueBytes(node) {
    return node.valueBytes || new Uint8Array();
  }

  function getTagName(node) {
    if (node.eoc) return 'EndOfContent';
    if (node.tagClass === 0) return UNIVERSAL_TAGS[node.tagNumber] || `Universal ${node.tagNumber}`;
    return `[${node.tagNumber}] ${CLASS_NAMES[node.tagClass]}`;
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
    const lengthInfo = parseLength(bytes, identifier.offset, end);
    const valueStart = lengthInfo.offset;
    let valueEnd = valueStart + lengthInfo.length;
    let endOffset = valueEnd;
    let children = [];

    if (lengthInfo.indefinite && !identifier.constructed) throw new Error(`offset ${start}: indefinite length is only supported for constructed values`);
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

  function parseElements(bytes, offset = 0, end = bytes.length, depth = 0) {
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

  function encodeBase128(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid tag number');
    const bytes = [value & 0x7f];
    let remaining = Math.floor(value / 128);
    while (remaining > 0) {
      bytes.unshift((remaining & 0x7f) | 0x80);
      remaining = Math.floor(remaining / 128);
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

  function encodeValue(node) {
    if (node.constructed) return encodeNodes(node.children);

    if (node.encapsulated && node.tagClass === 0 && node.tagNumber === 3) {
      const value = getNodeValueBytes(node);
      const unusedBits = value.length ? value[0] : 0;
      return concatBytes([new Uint8Array([unusedBits]), encodeNodes(node.children)]);
    }

    if (node.encapsulated && node.tagClass === 0 && node.tagNumber === 4) return encodeNodes(node.children);
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

  function decodeInput(input, options = {}) {
    const format = options.format || 'auto';
    if (typeof input === 'string') return decodeTextInput(input, format);

    const bytes = toUint8Array(input);
    if (format === 'pem') return { bytes: decodePem(decodeAscii(bytes)), format: 'PEM' };
    if (format === 'base64' || format === 'headerless-pem') return { bytes: decodeHeaderlessPem(decodeAscii(bytes)), format: 'headerless PEM' };
    if (format === 'hex') return { bytes: hexToBytes(decodeAscii(bytes)), format: 'HEX' };
    if (format !== 'auto' && format !== 'der' && format !== 'ber') throw new Error(`Unsupported input format: ${format}`);

    if (format === 'auto') {
      const text = decodeAscii(bytes);
      if (isPemText(text)) return { bytes: decodePem(text), format: 'PEM' };
      try {
        return { bytes: decodeHeaderlessPem(text), format: 'headerless PEM' };
      } catch (_) {
        // Fall through to raw DER/BER bytes when the text is not a valid base64-encoded ASN.1 value.
      }
    }

    return { bytes, format: 'DER' };
  }

  function decodeTextInput(text, format) {
    if (format === 'pem') return { bytes: decodePem(text), format: 'PEM' };
    if (format === 'base64' || format === 'headerless-pem') return { bytes: decodeHeaderlessPem(text), format: 'headerless PEM' };
    if (format === 'hex') return { bytes: hexToBytes(text), format: 'HEX' };
    if (format === 'der' || format === 'ber') return { bytes: encodeUtf8(text), format: 'DER' };
    if (format !== 'auto') throw new Error(`Unsupported input format: ${format}`);

    if (isPemText(text)) return { bytes: decodePem(text), format: 'PEM' };
    try {
      return { bytes: decodeHeaderlessPem(text), format: 'headerless PEM' };
    } catch (_) {
      // Try HEX below.
    }
    try {
      const bytes = hexToBytes(text);
      parseElements(bytes, 0, bytes.length);
      return { bytes, format: 'HEX' };
    } catch (_) {
      throw new Error('Text input must be PEM, headerless base64, or HEX when format is auto');
    }
  }

  function assignNodeIds(nodes, prefix = '') {
    let nextNodeId = 1;

    function visit(node) {
      node.id = `${prefix}${nextNodeId++}`;
      for (const child of node.children) visit(child);
    }

    for (const node of nodes) visit(node);
    return nodes;
  }

  function parseInput(input, options = {}) {
    const decoded = decodeInput(input, options);
    const nodes = assignNodeIds(parseElements(decoded.bytes, 0, decoded.bytes.length));
    const encodedBytes = encodeNodes(nodes);
    if (options.validateRoundTrip !== false && !bytesEqual(encodedBytes, decoded.bytes)) {
      throw new Error('The re-encoded DER does not match the original data');
    }

    return {
      format: decoded.format,
      bytes: decoded.bytes,
      encodedBytes,
      nodes
    };
  }

  function getOidComment(node, oidNames = {}) {
    if (node.tagClass !== 0 || node.tagNumber !== 6) return '';
    return oidNames[describeValue(node)] || '';
  }

  function serializeNode(node, options = {}, depth = 0) {
    const maxDepth = options.maxDepth ?? Infinity;
    const valueBytes = getNodeValueBytes(node);
    const serialized = {
      id: node.id,
      tagName: getTagName(node),
      tagClass: node.tagClass,
      tagClassName: CLASS_NAMES[node.tagClass],
      tagNumber: node.tagNumber,
      constructed: node.constructed,
      start: node.start,
      headerLength: node.headerLength,
      length: node.length,
      valueStart: node.valueStart,
      valueEnd: node.valueEnd,
      end: node.end,
      indefinite: node.indefinite,
      encapsulated: node.encapsulated,
      value: describeValue(node)
    };

    const oidComment = getOidComment(node, options.oidNames);
    if (oidComment) serialized.oidName = oidComment;
    if (options.includeHexPreview !== false && !node.constructed && valueBytes.length > 0) serialized.hexPreview = toCompactHex(valueBytes, options.hexPreviewLength || 72);
    if (options.includeRawValue) serialized.valueHex = toLowerHexString(valueBytes);
    if (depth < maxDepth) serialized.children = node.children.map((child) => serializeNode(child, options, depth + 1));
    else if (node.children.length > 0) serialized.childrenTruncated = node.children.length;
    return serialized;
  }

  function serializeTree(nodes, options = {}) {
    return nodes.map((node) => serializeNode(node, options));
  }

  function parseAsn1(input, options = {}) {
    const document = parseInput(input, options);
    return {
      format: document.format,
      length: document.bytes.length,
      nodes: serializeTree(document.nodes, options)
    };
  }

  function flattenNodes(nodes) {
    const flattened = [];

    function visit(node) {
      flattened.push(node);
      for (const child of node.children) visit(child);
    }

    for (const node of nodes) visit(node);
    return flattened;
  }

  function findNodeById(nodes, nodeId) {
    return flattenNodes(nodes).find((node) => node.id === String(nodeId)) || null;
  }

  function getNodeBytes(nodes, nodeId) {
    const node = findNodeById(nodes, nodeId);
    if (!node) throw new Error('The node was not found');
    return encodeNode(node);
  }

  function resolveOid(oid, oidNames = {}) {
    return oidNames[oid] || '';
  }

  return {
    VERSION,
    CLASS_NAMES,
    UNIVERSAL_TAGS,
    base64ToBytes,
    bytesToBase64,
    bytesEqual,
    concatBytes,
    decodeInput,
    decodeOid,
    decodePem,
    describeValue,
    encodeNode,
    encodeNodes,
    encodeOid,
    findNodeById,
    flattenNodes,
    getNodeBytes,
    getNodeValueBytes,
    getTagName,
    hexToBytes,
    isPemText,
    parseAsn1,
    parseElements,
    parseInput,
    resolveOid,
    serializeNode,
    serializeTree,
    toLowerHexString
  };
});