# Private Key Gadgets

Private Key Gadgets is an experimental browser tool for generating and inspecting PKI key material. It keeps key-related objects in a PkiStudioJS-style tree on the left, and sends the selected DER object to the embedded PkiStudioJS ASN.1 viewer on the right.

Current version: 0.1.4

## Features

### Key Pair Management

- Detects key pair algorithms supported by the current browser through WebCrypto.
- Generates supported key pairs from the New menu, including RSA, EC, Ed25519, and X25519 when available.
- Normalizes duplicate WebCrypto variants to the first supported key material for each family, such as RSA and EC.
- Allows repeated New Key operations; each generated key pair is added as a separate top-level tree item.
- Lets the top-level key pair label be edited in the tree.
- Rejects an empty top-level key pair label and restores the previous label in the tree.
- Shows generated private keys as PKCS#8 DER and generated public keys as SPKI DER.
- Recognizes labels such as `RSA 2048`, `EC P-256`, `Ed25519`, and `X25519` from DER AlgorithmIdentifier data instead of storing a separate algorithm label.

### PKCS#12 Import

- Imports PKCS#12 files (`.p12`, `.pfx`) through the Open menu.
- Supports password-protected PKCS#12 files.
- Extracts private key material and matching certificates when present.
- Adds matching certificates as child items under the imported key pair.
- Uses the certificate public key internally when needed, but does not create a separate PublicKey child item for PKCS#12 imports that already include a certificate.
- Supports key-only PKCS#12 files that do not contain a certificate; those imports create a PrivateKey child item.
- Reads friendly names and local key identifiers when available to produce useful key pair labels.

### Certificate Management

- Adds a Certificate child item from the top-level key pair menu through Load Certificate.
- Loads certificates from files through Load Certificate > from File, including DER certificates and PEM files with a `-----BEGIN CERTIFICATE-----` block.
- Loads certificates from the clipboard through Load Certificate > from Clipboard as PEM and Load Certificate > from Clipboard as HEX.
- Checks the certificate public key against the key pair before adding it.
- Compares the certificate public key with an existing PublicKey item when one is present.
- When no PublicKey item is present, checks the certificate against the PrivateKey by signing and verifying test data for supported signing keys.
- Shows a confirmation dialog when the certificate public key does not match the key pair; accepting the dialog applies the certificate anyway.
- Updates `publicKeyDer` from the certificate only when the certificate key matches the key pair.
- Does not create or replace a PublicKey item when a mismatching certificate is applied and no PublicKey item exists.
- Does not hide or delete an existing PublicKey item just because a Certificate item is added.
- Keeps only one Certificate child item per key pair; adding another certificate replaces the current Certificate item.
- Creates a self-signed Certificate from the PrivateKey item menu when a usable SubjectDN item is present.
- Allows SHA-256, SHA-384, and SHA-512 as self-signed certificate hash algorithm choices.
- Allows the self-signed certificate validity span to be set in days, defaulting to 365 days.
- Adds BasicConstraints and KeyUsage extensions to self-signed certificates; `certSign` and `crlSign` are checked by default.
- Copies Certificate objects as PEM from the Certificate item icon menu using a `CERTIFICATE` PEM block.

### PKCS#12 Export

- Saves selected top-level key pair items through the Save menu.
- Shows a checkbox list of key pair items before saving.
- Checks the currently selected key pair by default when a tree item is already selected.
- Prompts for a PKCS#12 password before writing the file.
- Generates a password-protected PKCS#12 file with shrouded private key bags.
- Includes matching Certificate child items in the exported PKCS#12 when they are present.
- Uses the browser's native save-file picker when available, with a download fallback for browsers that do not support it.

### Tree View

- Displays key material in a PkiStudioJS-like tree with compact New, Open, and Save actions plus a message area.
- Uses a PkiStudioJS-style tree card, connector lines, node icons, selection colors, and lower message area for the left pane.
- Supports multiple top-level key pair items.
- Supports child items for SubjectDN, PrivateKey, PublicKey, Certificate, and CSR objects.
- Opens node menus from the tree item icon, matching the interaction style used by PkiStudioJS.
- Closes open node menus when clicking empty space in the left pane or elsewhere in the document.
- Provides Load Certificate, New SubjectDN, and Delete from the top-level key pair icon menu.
- Provides New CSR, New self-signed Cert, and Delete from the PrivateKey item icon menu.
- Provides New SubjectDN, Copy as PEM, and Delete from the Certificate item icon menu.
- Provides Copy as PEM for CSR items from the child item icon menu.
- Allows child items to be deleted from their icon menu.
- Allows top-level key pair items to be deleted from their icon menu; deleting a key pair removes all child items as well.
- Selecting a top-level key pair item resets the ASN.1 viewer to its initial empty display because the key pair itself does not contain DER data.
- Lets the left and right panes be resized with the splitter between them.
- Centers the empty tree message in the left pane content area.

### Application Shell

- Fills the browser viewport and resizes the workspace, key tree, ASN.1 viewer, and API Log with the available browser area.
- Lets the bottom API Log pane be resized with the horizontal splitter between it and the upper workspace.
- Follows the browser or operating system light/dark theme preference and passes the effective theme to embedded PkiStudioJS viewer windows.
- Supports `?theme=light` and `?theme=dark` for forcing the application shell and embedded viewer to a specific theme.
- Shows an About menu in the top application bar with the current Private Key Gadgets version.

### SubjectDN Objects

- Creates a SubjectDN child item from the key pair menu.
- Creates a SubjectDN child item from a Certificate item menu by copying the certificate subject.
- Keeps only one SubjectDN child item per key pair; creating another SubjectDN asks for overwrite confirmation.
- Accepts SubjectDN input in LDAP-style order, such as `CN=example.com, O=Example, C=JP`.
- Stores SubjectDN data as DER and displays it through the ASN.1 viewer.
- Synchronizes SubjectDN child item data when the SubjectDN DER is edited in the embedded viewer.

### CSR Generation

- Creates a PKCS#10 certification request from the PrivateKey item menu.
- Uses the existing SubjectDN child item DER as the CSR subject source.
- Shows an error and disables CSR creation when the key pair has no usable SubjectDN item.
- Supports RSA and EC signing keys for CSR generation.
- Allows SHA-256, SHA-384, and SHA-512 as CSR hash algorithm choices.
- Keeps only one CSR child item per key pair; creating another CSR asks for overwrite confirmation.
- Displays generated CSR DER in the embedded ASN.1 viewer.
- Copies CSR objects as PEM from the CSR item icon menu using a `CERTIFICATE REQUEST` PEM block.

### Self-Signed Certificate Generation

- Creates a self-signed X.509 certificate from the PrivateKey item menu.
- Requires an existing SubjectDN child item and uses its DER as both issuer and subject.
- Supports RSA and EC signing keys for certificate generation.
- Allows SHA-256, SHA-384, and SHA-512 as signing hash algorithm choices.
- Allows KeyUsage flags to be selected before signing; `certSign` and `crlSign` are selected by default.
- Allows the validity span to be entered as a number of days, defaulting to 365.
- Replaces the current Certificate child item after confirmation when one already exists.
- Displays the generated certificate DER in the embedded ASN.1 viewer.

### Embedded ASN.1 Viewer

- Embeds the npm-provided PkiStudioJS viewer directly in the right pane.
- Displays the selected PrivateKey, PublicKey, Certificate, SubjectDN, or CSR DER object.
- Keeps Viewer editing actions enabled only while a SubjectDN item is selected.
- Disables the Viewer Load and Close actions, plus node Edit, Delete, Add, and Insert before actions, including the Insert before/Add submenus, for read-only key material such as PrivateKey, PublicKey, Certificate, and CSR.
- Keeps the PkiStudioJS Save menu available for writing the currently displayed DER document to a file.
- Opens PkiStudioJS New Window output in a standalone viewer-only page instead of a new pvkgadgets application shell.
- Hides the standalone PkiStudioJS file picker in the embedded application shell.

### PkiGadgetsCore API

- Exposes `window.PkiGadgetsCore` as a UI-independent helper API for PKI operations used by the app.
- Detects supported WebCrypto key pair algorithms and generates PKCS#8/SPKI DER key material.
- Recognizes key families and labels from DER key material.
- Creates SubjectDN DER, PKCS#10 CSR DER, and self-signed X.509 certificate DER without depending on the tree UI.
- Checks whether a certificate public key matches key material.
- Reads and writes PKCS#12 key material through the same API surface.
- Converts DER objects to PEM and PEM blocks back to DER.

### API Log

- Shows a bottom API Log pane for browser and PKI operation activity.
- Logs operations such as PkiStudioJS initialization, WebCrypto key generation and export, PKCS#12 import/export, certificate loading, clipboard access, file-system saves, CSR creation, and self-signed certificate signing.
- Displays timestamps with millisecond precision.
- Keeps the newest 200 log entries and drops older entries automatically.
- Provides a right-aligned Clear button for resetting the visible log.

The application provides Save Key for exporting selected key pairs as PKCS#12 files. Individual DER objects are shown in the PkiStudioJS viewer, and users can use the viewer's Save menu when they want to write the currently displayed DER document to a file.

Generated and imported key material is kept as DER in browser memory. Private keys are stored as PKCS#8 DER, public keys are stored as SPKI DER, certificates are stored as certificate DER, SubjectDN items are stored as RDNSequence DER, and CSR items are stored as PKCS#10 DER. PublicKey and Certificate are independent child objects in the tree: adding a Certificate does not remove PublicKey, and a mismatching Certificate does not populate PublicKey data.

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

## License

Private Key Gadgets is licensed under the MIT License. See [LICENSE](LICENSE).

## PkiStudioJS Dependency

The application imports PkiStudioJS from the published `pkistudiojs` npm package:

- `pkistudiojs/core`
- `pkistudiojs/oid-resolver`
- `pkistudiojs/viewer`

The PkiStudioJS OID name table is provided through `pkistudiojs/oid-resolver`, so no vendored browser assets are required under `public/`.

PKCS#12 parsing is handled by PKIjs, with ASN.1 support from asn1js.
