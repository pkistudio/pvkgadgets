# pvkgadgets Release Profile

## Repository

- GitHub repository: `pkistudio/pvkgadgets`
- Product name: `Private Key Gadgets`
- npm package name: `@pkistudio/pvkgadgets`
- Hosted Pages URL: `https://pkistudio.github.io/pvkgadgets/`
- Documentation URL: `https://github.com/pkistudio/pvkgadgets/wiki`
- ADR path: `docs/adr/`

## Version And Build

- Version files:
  - `package.json`
  - `package-lock.json`
  - `README.md` (`Current version:`)
- Version source: `package.json` version is injected into `__PVKGADGETS_VERSION__`, the app About display, and `PvkGadgetsCore.version`.
- Install command: `npm ci`
- Build command: `npm run build`
- Verification commands:
  - `npm run check`
  - `npm run build`
- Package preview command: `npm run pack:dry-run`
- Published package verification:
  - `npm view @pkistudio/pvkgadgets@<version> version dist-tags dist.tarball --json`

## Publishing

- npm publish workflow: `.github/workflows/publish-npm.yml`
- npm publish command in workflow: `npm publish --provenance --access public`
- npm publication requires explicit user approval.
- GitHub Release requires explicit user approval.
- GitHub Release title/name pattern: `<version>`.
- Stable published tags should have a GitHub Release marked as latest unless the user instructs otherwise.
- WordPress post workflow: `.github/workflows/publish-release-to-wordpress.yml`
- WordPress post title pattern: `Private Key Gadgets <tag> をリリースしました`

## Pages And Wiki

- Pages workflow: `.github/workflows/pages.yml`
- Pages artifact path: `dist`
- Wiki source path in repository: `wikisrc/`
- Wiki path in Codespaces: `/workspaces/pvkgadgets.wiki`
- Keep Wiki work separate from main repository work unless explicitly requested.

## Special Hooks

- Keep the package browser-first and host-neutral. VS Code-specific file access, dialogs, and Webview lifecycle belong outside this package.
- Updating `@pkistudio/pkistudiojs` for viewer compatibility is normally a dependency and documentation update, not a Private Key Gadgets feature change.
- Browser verification command: `npm run dev -- --port 5173 --strictPort`.
