# Private Key Gadgets

Private Key Gadgets is an experimental browser tool for generating PKI key material and sending the generated DER data to the PkiStudioJS ASN.1 viewer.

The first prototype supports:

- Browser-supported key pair algorithm detection
- Key pair generation for supported WebCrypto key materials such as RSA, EC, Ed25519, and X25519
- Duplicate WebCrypto algorithm variants are normalized to the first supported key material, such as RSA and EC
- A PkiStudioJS-style key material tree for selecting generated output
- PKCS#8 private key DER display in the embedded PkiStudioJS viewer by selecting the private key tree item
- SPKI public key DER display in the embedded PkiStudioJS viewer by selecting the public key tree item
- PkiStudioJS new-window output opens in a viewer-only page
- SHA-256 fingerprints for the generated private and public key DER

The application intentionally does not provide its own save or download buttons for generated key material. Generated DER is shown in the PkiStudioJS viewer, and users can use the viewer's Save menu when they want to write the current DER document to a file.

Generated key material is kept as PKCS#8 private key DER and SPKI public key DER. The app does not store a separate algorithm label with the key material; labels such as `RSA 2048`, `EC P-256`, `Ed25519`, and `X25519` are recognized from the DER AlgorithmIdentifier when the UI needs to display them.

## Development

Install dependencies:

```sh
npm install
```

Start the local development server:

```sh
npm run dev
```

Run the TypeScript and production build checks:

```sh
npm run check
npm run build
```

## Vendor Assets

The prototype vendors the PkiStudioJS browser assets under `public/vendor/pkistudiojs/`:

- `pkistudio-core.js`
- `pkistudio.js`
- `oids.json`

Those files are loaded directly by `index.html` so the generated key material can be displayed with the same ASN.1 viewer UI used by PkiStudioJS.