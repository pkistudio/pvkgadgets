# Private Key Gadgets

Private Key Gadgets is an experimental browser tool and reusable TypeScript API for generating, importing, exporting, and inspecting PKI key material. It keeps key-related objects in a PkiStudioJS-style tree and displays selected DER objects with the embedded PkiStudioJS ASN.1 viewer.

Documentation: https://github.com/pkistudio/pvkgadgets/wiki

Current version: 0.4.2

Generated and imported key material stays in browser memory as DER bytes. The package keeps VS Code-specific file access, dialogs, and Webview lifecycle outside `@pkistudio/pvkgadgets`; hosts provide those behaviors through callbacks.

## Features

- Browser-supported key pair generation through WebCrypto, including RSA, EC, Ed25519, and X25519 when available.
- PKCS#8 private key and SPKI public key inspection with algorithm labels derived from DER metadata.
- PKCS#12 import and export for `.p12` and `.pfx` files, including password-protected files and matching certificates.
- Certificate loading, key/certificate matching, SubjectDN creation, CSR generation, and self-signed certificate generation.
- Embedded PkiStudioJS ASN.1 viewer for PrivateKey, PublicKey, Certificate, SubjectDN, and CSR DER objects.
- UI-independent Core API for WebCrypto key generation, SubjectDN, CSR, certificates, PEM/DER helpers, and PKCS#12 workflows.
- Embeddable browser app API for Webview and browser hosts.

See the Wiki for details:

- [Getting Started](https://github.com/pkistudio/pvkgadgets/wiki/Getting-Started)
- [Browser App](https://github.com/pkistudio/pvkgadgets/wiki/Browser-App)
- [Core API](https://github.com/pkistudio/pvkgadgets/wiki/Core-API)
- [PKCS#12 API](https://github.com/pkistudio/pvkgadgets/wiki/PKCS12-API)
- [Embedding](https://github.com/pkistudio/pvkgadgets/wiki/Embedding)
- [Testing](https://github.com/pkistudio/pvkgadgets/wiki/Testing)
- [Development](https://github.com/pkistudio/pvkgadgets/wiki/Development)

## Install

```sh
npm install @pkistudio/pvkgadgets
```

Package exports:

- `@pkistudio/pvkgadgets`: Core API.
- `@pkistudio/pvkgadgets/core`: Core API alias.
- `@pkistudio/pvkgadgets/pkcs12`: PKCS#12 helper API.
- `@pkistudio/pvkgadgets/app`: browser application initializer.
- `@pkistudio/pvkgadgets/styles.css`: application stylesheet.

## Core API

Use `PvkGadgetsCore` when code needs key operations without mounting the browser app:

```ts
import { PvkGadgetsCore } from '@pkistudio/pvkgadgets';

const algorithms = await PvkGadgetsCore.getSupportedKeyAlgorithms();
const keyPair = await PvkGadgetsCore.generateKeyPair(algorithms[0].id);

console.log(keyPair.privateKeyDer.byteLength);
console.log(keyPair.publicKeyDer?.byteLength);
```

The Core API detects supported WebCrypto algorithms, generates PKCS#8/SPKI DER key material, recognizes key labels from DER, creates SubjectDN/CSR/self-signed certificate DER, checks certificate key matches, and converts DER objects to and from PEM.

For full API details, see [Core API](https://github.com/pkistudio/pvkgadgets/wiki/Core-API).

## PKCS#12 API

Use the PKCS#12 helpers directly when a host application owns the surrounding UI:

```ts
import { readPkcs12Keys, writePkcs12Keys } from '@pkistudio/pvkgadgets/pkcs12';
```

PKCS#12 parsing and writing are handled with PKIjs and asn1js structured APIs.

For import and export details, see [PKCS#12 API](https://github.com/pkistudio/pvkgadgets/wiki/PKCS12-API).

## Browser App

Mount the browser application from an embedded Webview or browser app:

```ts
import { initPrivateKeyGadgets } from '@pkistudio/pvkgadgets/app';
import '@pkistudio/pvkgadgets/styles.css';

const app = initPrivateKeyGadgets({
  mount: '#app',
  theme: 'dark',
  host: {
    confirm: async (message) => window.confirm(message),
    saveFile: async ({ bytes, suggestedName }) => {
      console.log(`save ${suggestedName}`, bytes.byteLength);
    },
    openDerViewer: async ({ title, bytes }) => {
      console.log(`open ${title}`, bytes.byteLength);
    }
  }
});

await app.openBytes(new Uint8Array([0x30, 0x03, 0x02, 0x01, 0x01]), 'sample.der');
```

For host callbacks, theming, and embedded viewer behavior, see [Embedding](https://github.com/pkistudio/pvkgadgets/wiki/Embedding).

## Development

Run local checks with:

```sh
npm run check
npm run build
```

Start the local development server with:

```sh
npm run dev -- --port 5173 --strictPort
```

Then open `http://localhost:5173/`.

For package or release-related changes, also run:

```sh
npm run pack:dry-run
```

For what the standard checks cover and where browser verification is still needed, see [Testing](https://github.com/pkistudio/pvkgadgets/wiki/Testing).

For local server, package entry points, version metadata, release notes, Wiki preview, and related development details, see [Development](https://github.com/pkistudio/pvkgadgets/wiki/Development).

## PkiStudioJS Dependency

Private Key Gadgets imports PkiStudioJS from the published `@pkistudio/pkistudiojs` npm package. No vendored PkiStudioJS browser assets are required under `public/`.

## License

Private Key Gadgets is licensed under the MIT License. See [LICENSE](LICENSE).
