export type PkiStudioInstance = {
  close?: () => void;
  getNodeBytes?: (nodeId: string) => Uint8Array;
  loadBytes: (bytes: Uint8Array, notice?: string) => void;
  root?: DocumentFragment | Element;
};

export type PkiStudioCoreNode = {
  tagClass: number;
  tagNumber: number;
  constructed: boolean;
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
  hexToBytes: (text: string, options?: { allowEmpty?: boolean }) => Uint8Array;
  parseElements: (bytes: Uint8Array, offset?: number, end?: number, depth?: number) => PkiStudioCoreNode[];
};

export type PkiStudioApi = {
  core?: PkiStudioCoreApi | null;
  init: (options: {
    mount: string | Element;
    oidUrl?: string;
    shadowRoot?: boolean;
    fullscreen?: boolean;
  }) => PkiStudioInstance;
  version?: string;
};
