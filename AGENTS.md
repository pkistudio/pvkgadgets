# Project Guidelines

## Project Overview

Private Key Gadgets is a browser-based PKI key material tool and reusable TypeScript API. The package is published as `@pkistudio/pvkgadgets`.

Key files:

- `src/core.ts`: UI-independent `PvkGadgetsCore` API for WebCrypto key generation, key recognition, SubjectDN, CSR, self-signed certificate, PEM, and DER helpers.
- `src/pkcs12.ts`: PKCS#12 import and export helpers built on PKIjs and asn1js.
- `src/app.ts`: browser application shell, key tree UI, embedded PkiStudioJS viewer integration, host callbacks, and `initPrivateKeyGadgets` export.
- `src/main.ts`: default app entry for `index.html`.
- `src/viewer.ts`: standalone PkiStudioJS viewer entry for `viewer.html`.
- `src/pkistudio.ts`, `src/pkistudio-types.ts`, and `src/pkistudiojs.d.ts`: adapter and local typings for the `@pkistudio/pkistudiojs` dependency.
- `src/styles.css`: application and viewer-host styling.
- `vite.config.ts`: Vite build configuration, version injection, app entries, and package entry outputs.
- `README.md`: user-facing feature, API, package, and deployment documentation.

## Development Commands

Run these for normal code changes before handing work back:

```sh
npm run check
npm run build
```

Use the VS Code task `Start pvkgadgets server` or run this when browser verification is needed:

```sh
npm run dev -- --port 5173 --strictPort
```

For package or release-related changes, also run:

```sh
npm run pack:dry-run
```

When checking published package state, use the scoped package name:

```sh
npm view @pkistudio/pvkgadgets version --json
```

## Architecture Notes

- Keep the package browser-first and host-neutral. VS Code-specific file access, dialogs, and Webview lifecycle should remain outside this package and flow through `host` callbacks.
- Preserve the current Vite and TypeScript build model unless the task explicitly requires changing it.
- Keep UI-specific browser behavior in `src/app.ts`; keep reusable key, certificate, CSR, SubjectDN, PEM, DER, and PKCS#12 behavior in `src/core.ts` and `src/pkcs12.ts`.
- `@pkistudio/pvkgadgets` and `@pkistudio/pvkgadgets/core` expose the UI-independent core API from `dist/core.js`.
- `@pkistudio/pvkgadgets/pkcs12` exposes PKCS#12 helpers from `dist/pkcs12.js`.
- `@pkistudio/pvkgadgets/app` exposes `initPrivateKeyGadgets` from `dist/app.js`, and `@pkistudio/pvkgadgets/styles.css` exposes the app stylesheet.
- `package.json` version is the source for `__PVKGADGETS_VERSION__`, the app About display, and `PvkGadgetsCore.version`.
- Generated and imported key material should remain in browser memory as DER bytes: PKCS#8 private keys, SPKI public keys, certificate DER, SubjectDN RDNSequence DER, and PKCS#10 CSR DER.
- Keep PkiStudioJS embedded viewer behavior stable for embedders, including viewer imports, OID resolver wiring, theme forwarding, read-only mode, SubjectDN edit synchronization, Save support, and New Window routing.
- PkiStudioJS is embedded for ASN.1 inspection. Private Key Gadgets owns key generation, PKCS#12 import/export, certificate loading, CSR creation, self-signed certificate creation, and selected-item routing.
- The embedded PkiStudioJS viewer should stay read-only for PrivateKey, PublicKey, Certificate, and CSR items. Keep editing enabled only for SubjectDN items unless the user explicitly asks for a behavior change.
- Updating `@pkistudio/pkistudiojs` for viewer compatibility is normally a dependency and documentation update. Do not infer a Private Key Gadgets feature change from a PkiStudioJS feature release.
- Preserve the separation between PublicKey and Certificate tree items. Adding or replacing a certificate must not silently delete an existing PublicKey item, and mismatching certificates must not populate `publicKeyDer` unless the user explicitly accepts the mismatch behavior already implemented.
- PKCS#12 parsing and writing should continue to use PKIjs/asn1js structured APIs rather than ad hoc byte or string manipulation.

## Coding Conventions

- Follow the existing TypeScript style: two-space indentation, semicolons, explicit exported types, and narrow helper functions near their call sites.
- Keep changes focused and avoid broad formatting churn, especially in large UI template or style sections.
- Prefer WebCrypto, PKIjs, asn1js, and existing `PvkGadgetsCore` helpers over introducing new PKI parsing or encoding logic.
- Keep browser feature fallbacks intact, including unsupported WebCrypto algorithms, clipboard failures, save-file picker fallbacks, and browsers without newer key algorithms.
- Do not introduce Node-only runtime dependencies into code that is shipped to the browser.
- Use `@pkistudio/pkistudiojs` as an external dependency; do not vendor PkiStudioJS assets into this repository.
- Keep npm install, import, and documentation examples using `@pkistudio/pvkgadgets`.
- Update README or docs when public API behavior, package exports, browser behavior, or release workflow expectations change.
- For version bumps, keep at least `package.json`, `package-lock.json`, and the README current version synchronized.

## GitHub And Release Notes

- Prefer `gh` for GitHub issue, PR, tag, and release operations when available.
- The standard release workflow is documented in `.github/prompts/release.prompt.md`.
- Do not merge PRs unless the user explicitly asks to proceed.
- After merge is explicitly approved and required versions, credentials, and checks are in place, proceed with tags, GitHub Releases, npm publication, workflow reruns, and post-publication verification without asking for separate confirmations unless something is blocked or ambiguous.
- For release work, use a PR path: branch, focused commit, push, PR, CI, merge, annotated tag, GitHub Release, npm publication, and final verification.
- npm publication targets `@pkistudio/pvkgadgets` and should be verified after publishing with:

  ```sh
  npm view @pkistudio/pvkgadgets@<version> version dist-tags dist.tarball --json
  ```

- GitHub Releases should be created for published stable tags and marked as the latest release unless the user instructs otherwise.
- In Codespaces or devcontainers, the default `GITHUB_TOKEN` may not have branch protection administration permissions. Use browser authentication for those operations:

  ```sh
  env -u GITHUB_TOKEN gh auth login --web --scopes repo
  ```
