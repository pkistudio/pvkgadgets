export type PkiStudioInstance = {
  close?: () => void;
  getNodeBytes?: (nodeId: string) => Uint8Array;
  loadBytes: (bytes: Uint8Array, notice?: string) => void;
  root?: DocumentFragment | Element;
};

export type PkiStudioCoreNode = {
  id?: string;
  tagClass: number;
  tagNumber: number;
  constructed: boolean;
  encapsulated?: boolean;
  valueStart: number;
  valueEnd: number;
  end: number;
  children: PkiStudioCoreNode[];
};

export type PkiStudioCoreApi = {
  VERSION?: string;
  base64ToBytes: (base64: string) => Uint8Array;
  bytesToBase64: (bytes: Uint8Array) => string;
  decodeOid: (bytes: Uint8Array) => string;
  decodePem: (text: string) => Uint8Array;
  encodeNodes: (nodes: PkiStudioCoreNode[]) => Uint8Array;
  hexToBytes: (text: string, options?: { allowEmpty?: boolean }) => Uint8Array;
  parseElements: (bytes: Uint8Array, offset?: number, end?: number, depth?: number) => PkiStudioCoreNode[];
};

export type PkiStudioOidResolverApi = {
  names: Record<string, string>;
  resolve: (oid: string) => string;
  create: (extraNames?: Record<string, string>) => PkiStudioOidResolverApi;
};

export type PkiStudioApi = {
  core?: PkiStudioCoreApi | null;
  init: (options: {
    mount: string | Element;
    oidNames?: Record<string, string>;
    oidResolver?: PkiStudioOidResolverApi | ((oid: string) => string);
    oidUrl?: string;
    newWindowUrl?: string;
    shadowRoot?: boolean;
    fullscreen?: boolean;
  }) => PkiStudioInstance;
  version?: string;
};
