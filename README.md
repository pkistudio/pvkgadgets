# Private Key Gadgets

Private Key Gadgets is an experimental browser tool for generating and inspecting PKI key material. It keeps key-related objects in a PkiStudioJS-style tree on the left, and sends the selected DER object to the embedded PkiStudioJS ASN.1 viewer on the right.

## Features

### Key Pair Management

- Detects key pair algorithms supported by the current browser through WebCrypto.
- Generates supported key pairs from the New Key menu, including RSA, EC, Ed25519, and X25519 when available.
- Normalizes duplicate WebCrypto variants to the first supported key material for each family, such as RSA and EC.
- Allows repeated New Key operations; each generated key pair is added as a separate top-level tree item.
- Lets the top-level key pair label be edited in the tree.
- Rejects an empty top-level key pair label and restores the previous label in the tree.
- Shows generated private keys as PKCS#8 DER and generated public keys as SPKI DER.
- Recognizes labels such as `RSA 2048`, `EC P-256`, `Ed25519`, and `X25519` from DER AlgorithmIdentifier data instead of storing a separate algorithm label.

### PKCS#12 Import

- Imports PKCS#12 files (`.p12`, `.pfx`) through the Open Key menu.
- Supports password-protected PKCS#12 files.
- Extracts private key material and matching certificates when present.
- Adds matching certificates as child items under the imported key pair.
- Uses the certificate public key internally when needed, but does not create a separate PublicKey child item for PKCS#12 imports that already include a certificate.
- Supports key-only PKCS#12 files that do not contain a certificate; those imports create a PrivateKey child item.
- Reads friendly names and local key identifiers when available to produce useful key pair labels.

### Certificate Management

- Adds a Certificate child item from the top-level key pair menu through add Certificate.
- Reads certificate files selected from the browser file picker, including DER certificates and PEM files with a `-----BEGIN CERTIFICATE-----` block.
- Checks the certificate public key against the key pair before adding it.
- Compares the certificate public key with an existing PublicKey item when one is present.
- When no PublicKey item is present, checks the certificate against the PrivateKey by signing and verifying test data for supported signing keys.
- Shows a confirmation dialog when the certificate public key does not match the key pair; accepting the dialog applies the certificate anyway.
- Updates `publicKeyDer` from the certificate only when the certificate key matches the key pair.
- Does not create or replace a PublicKey item when a mismatching certificate is applied and no PublicKey item exists.
- Does not hide or delete an existing PublicKey item just because a Certificate item is added.
- Keeps only one Certificate child item per key pair; adding another certificate replaces the current Certificate item.

### PKCS#12 Export

- Saves selected top-level key pair items through the Save Key menu.
- Shows a checkbox list of key pair items before saving.
- Checks the currently selected key pair by default when a tree item is already selected.
- Prompts for a PKCS#12 password before writing the file.
- Generates a password-protected PKCS#12 file with shrouded private key bags.
- Includes matching Certificate child items in the exported PKCS#12 when they are present.
- Uses the browser's native save-file picker when available, with a download fallback for browsers that do not support it.

### Tree View

- Displays key material in a PkiStudioJS-like tree with a menu area and message area.
- Supports multiple top-level key pair items.
- Supports child items for SubjectDN, PrivateKey, PublicKey, Certificate, and CSR objects.
- Opens node menus from the tree item icon, matching the interaction style used by PkiStudioJS.
- Closes open node menus when clicking empty space in the left pane or elsewhere in the document.
- Provides add Certificate, New SubjectDN, and Delete from the top-level key pair icon menu.
- Provides New CSR and Delete from the PrivateKey item icon menu.
- Provides New SubjectDN and Delete from the Certificate item icon menu.
- Provides Copy as PEM for CSR items from the child item icon menu.
- Allows child items to be deleted from their icon menu.
- Allows top-level key pair items to be deleted from their icon menu; deleting a key pair removes all child items as well.

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

### Embedded ASN.1 Viewer

- Embeds the vendored PkiStudioJS viewer directly in the right pane.
- Displays the selected PrivateKey, PublicKey, Certificate, SubjectDN, or CSR DER object.
- Keeps the PkiStudioJS Save menu available for writing the currently displayed DER document to a file.
- Opens PkiStudioJS new-window output in a viewer-only page.
- Hides the standalone PkiStudioJS file picker in the embedded application shell.

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

## Vendor Assets

The prototype vendors the PkiStudioJS browser assets under `public/vendor/pkistudiojs/`:

- `pkistudio-core.js`
- `pkistudio.js`
- `oids.json`

Those files are loaded directly by `index.html` so the generated key material can be displayed with the same ASN.1 viewer UI used by PkiStudioJS.

PKCS#12 parsing is handled by PKIjs, with ASN.1 support from asn1js.