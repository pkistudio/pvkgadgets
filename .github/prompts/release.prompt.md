---
description: "Use when: running the pvkgadgets issue-to-release workflow, including issue creation, ADR assessment, wiki maintenance, branch work, PR, merge, tag, GitHub Release, npm publish, Trusted Publishing, GitHub Pages status, and Actions checks."
name: "pvkgadgets release workflow"
argument-hint: "[version|TBD] [#issue] <short feature or fix summary>"
agent: "agent"
---

# pvkgadgets Release Workflow

Run the standard pvkgadgets release workflow from issue creation through GitHub Release, npm publication, and GitHub Pages status confirmation.

Expected invocation examples:

```text
/release 0.3.1 "Improve PKCS#12 import"
/release v0.3.1 "Fix certificate matching"
/release TBD "Improve CSR generation"
/release "Improve API log output"
/release TBD #12
/release 0.3.2 #12 "Implement requested export option"
```

The release version may be omitted or set to `TBD` when development should proceed before the final version is known. If an existing issue number is supplied, use that issue instead of creating a duplicate issue. If the feature summary, desired release scope, issue reference, or whether a known-looking first argument is a version is unclear, ask concise clarifying questions before making changes. Otherwise proceed proactively.

## Default Operating Mode

When this prompt is invoked, proceed through the workflow without restating the full release procedure to the user. Treat the issue-to-release flow as the standard path and keep progress updates brief.

Default assumptions:

- If no issue number is supplied, create a tracking issue first.
- If an issue number is supplied, use that issue as the source of truth.
- Create a branch from the issue, implement the requested change, verify it, push it, and open a PR.
- Assess whether issue-level architectural decisions should be captured in ADRs under `docs/adr/`; ask the user only when you judge that a new ADR may be warranted and the user has not already requested or declined one.
- Assess whether user-facing behavior, package API behavior, release process expectations, or operating procedures should be reflected in the GitHub Wiki, and keep wiki work separate from the main repository PR.
- Use the issue body, issue comments, and PR body to preserve the release rationale, release notes draft, verification results, and publication status.
- Do not merge, tag, publish, or create a GitHub Release until the user explicitly says to proceed.

Ask only when:

- The requested version is missing and the workflow has reached a version-required step.
- The issue appears to introduce a meaningful ADR-worthy architectural decision and the user has not already requested or declined ADR creation.
- The working tree has unrelated uncommitted changes.
- npm or GitHub permissions block progress.
- The issue requirements are ambiguous enough that implementation could go in the wrong direction.

Confirmation gates:

- Gate 1: PR merge.
- Gate 2: version bump, tag push, GitHub Release creation, and the automatic npm publish trigger caused by the tag.
- Gate 3: npm publish workflow rerun or manual npm publication if the tag-triggered publish needs intervention.
- Gate 4: post-publication registry, fresh-install, Pages, and Actions verification.

## Required Safety Rules

- This prompt is a workflow guide only and does not grant repository permissions.
- Push, tag, release, merge, and secret-backed Actions operations are possible only for users or tokens with the required repository permissions.
- npm publication requires npm package ownership or a configured npm Trusted Publisher for `@pkistudio/pvkgadgets` and `.github/workflows/publish-npm.yml`.
- Work in the current repository only.
- Check the current branch, remote, and working tree before making changes.
- Never discard uncommitted user changes.
- If unrelated local changes exist, stop and ask how to proceed.
- Create implementation work on a feature branch, never directly on `main`.
- Use existing repository patterns and keep changes focused on the requested issue.
- Do not create ADRs for trivial implementation details, routine bug fixes, or decisions already covered by an existing ADR.
- When adding or updating ADRs, use `docs/adr/0000-template.md` and keep the ADR focused on why the decision was made, alternatives considered, and expected consequences.
- Do not add a new ADR solely on agent judgment without user confirmation, unless the user explicitly requested ADR creation in the invocation or issue discussion.
- Keep GitHub Wiki work in the wiki repository, normally `/workspaces/pvkgadgets.wiki`, and do not mix wiki commits into the main repository PR.
- Do not push wiki changes until the user has asked for publication or confirmed the prepared wiki content.
- Preserve existing `package.json` package metadata unless the release requires a focused change. Do not add `private: true` only to prevent npm publication.
- Use non-interactive git commands.

## Inputs

Derive these from the invocation when possible:

- `version`: release version, normalized to both `X.Y.Z` and `vX.Y.Z` forms when known. If omitted or `TBD`, treat it as pending and do not create tags, publish releases, or make final version bumps until the release step.
- `issueNumber`: existing GitHub issue number when the invocation includes a `#<number>` reference or an unambiguous issue URL.
- `summary`: short feature or fix summary.
- `issueBody`: issue requirements. If the user supplied detailed requirements, preserve them.
- `architectureDecision`: issue-level design decision, if the issue includes one that should be recorded in `docs/adr/`.
- `wikiWork`: user-facing documentation or operating procedure updates that should be reflected in the GitHub Wiki.
- `verificationPlan`: expected local checks. If not supplied, infer from the changed area.

## Standard Record Templates

Use these headings for new release tracking issues unless the issue already has a better structure:

```md
## Background
## Scope
## Release notes draft
## Verification
## Publication status
```

Use this shape for PR bodies:

```md
Summary:
- ...

ADR:
- Added/updated/referenced: ...

Wiki:
- Added/updated/pushed: ...

Release notes draft:
...

Verification:
- `npm run check`
- `npm run build`
- `npm run pack:dry-run`

Closes #<issue-number>
```

## Workflow

1. Preflight
   - Confirm the repository is `pkistudio/pvkgadgets` unless the user intentionally targets another repo.
   - Run a clean working tree check.
   - Confirm the current default branch and remote.
   - If `version` is known, check existing tags so the requested release version does not already exist.
   - If `version` is known, check whether `@pkistudio/pvkgadgets@<version>` is already published on npm so reruns do not attempt to publish an immutable version twice.
   - If `version` is pending, record that the final version must be chosen before version bumps, tagging, or release publication.

2. Create Issue
   - If `issueNumber` is known, fetch the existing issue and use its title, body, requirements, labels, and discussion as the source request. Do not create a new issue.
   - If no existing issue is supplied, create a GitHub issue describing the requested change.
   - For new issues, include summary, requirements, expected behavior, and verification notes.
   - Record the issue number for the branch, PR body, and final report.
   - Prefer GitHub tools when available. If the GitHub CLI is unavailable and `GITHUB_TOKEN` is set, use the GitHub REST API with `curl`. Never print token values.

3. Assess ADR Needs
   - Review `docs/adr/` before implementation when the issue involves external dependencies, package export strategy, public API design, cryptographic algorithms or key management, PKCS#12 handling, certificate or CSR semantics, host integration boundaries, deployment architecture, runtime infrastructure, or major framework or library choices.
   - Ask the user about ADR creation only when you judge that the issue introduces a meaningful architectural decision that is not already covered by an existing ADR.
   - Do not ask about ADRs for routine fixes, implementation details, local refactors, documentation-only changes, release bookkeeping, or decisions already covered by an existing ADR.
   - If the user already requested ADR creation, proceed with the ADR without asking again.
   - If the user already declined ADR creation for the issue, continue without asking again.
   - When asking, briefly explain the suspected decision, why it may deserve an ADR, and the proposed ADR title. Keep the question concise and offer a clear yes/no path.
   - If the user confirms, add a new ADR under `docs/adr/` using `docs/adr/0000-template.md`.
   - If the user declines, continue without an ADR and mention the decision in the PR body when useful.
   - Number new ADRs sequentially and use a concise kebab-case filename such as `0001-keep-host-neutral-browser-api.md`.
   - In the ADR, reference the source issue and any related ADRs in the `Related` section.
   - If the implementation follows an existing ADR, mention that ADR in the PR body instead of creating a duplicate ADR.
   - If the issue appears to conflict with an existing ADR, stop and ask how to proceed before implementing the conflicting change.

4. Assess Wiki Needs
   - Use the GitHub Wiki for user-facing operational guidance, reusable API guidance, release process notes, screenshots, and documentation that should be browsed outside the package README.
   - Keep README updates in the main repository when they describe package installation, package exports, current version, or npm-facing documentation. Use the wiki for expanded workflows and maintenance guidance.
   - If wiki changes are needed, work in `/workspaces/pvkgadgets.wiki` when it exists. If it is missing, run `.devcontainer/setup-wiki.sh` or clone `https://github.com/pkistudio/pvkgadgets.wiki.git` next to the main workspace.
   - Follow the existing wiki structure and PkiStudioJS-style conventions: Markdown pages at the wiki root, `_Sidebar.md` for navigation, `images/` for screenshots, and root `favicon.ico` for the wiki favicon.
   - Validate wiki links and image references before committing. For Gollum preview, use the VS Code task `Start pvkgadgets wiki` or run `gollum --host 0.0.0.0 --port 4567 /workspaces/pvkgadgets.wiki`; if port `4567` is already in use, use a temporary alternate port and stop it when done.
   - Commit wiki changes in the wiki repository separately from the main repository implementation branch.
   - Push wiki changes only after the user has asked for publication or confirmed the prepared wiki content. Record pushed wiki commit hashes in the issue or final report when relevant.

5. Create Branch
   - Create a branch named `issue-<number>-<short-kebab-summary>`.
   - Switch to it before editing files.

6. Implement
   - Read the relevant files before editing.
   - Update app code and documentation for the requested behavior.
   - Add or update ADR files identified during the ADR assessment, keeping them separate from implementation details.
   - Add or update wiki pages identified during the wiki assessment in the wiki repository, not in the main repository PR.
   - If `version` is known and the change is release-worthy, update version references together.
   - If `version` is pending, leave existing released version references unchanged during implementation and note the deferred version bump in the issue and PR.
   - For pvkgadgets version bumps, update at least:
     - `package.json` `version`, which is the source for the app and `window.PvkGadgetsCore.version`
     - `package-lock.json` root package version
     - `README.md` current version and any relevant feature documentation
   - Update npm `exports`, package `files`, type declarations, and workflow metadata when the release changes npm package shape.
   - Keep generated UI behavior consistent with the existing app style.

7. Verify Locally
   - Run the available local checks for this Vite/TypeScript app:

     ```sh
     npm run check
     npm run build
     npm run pack:dry-run
     ```

   - Use the existing VS Code task `Start pvkgadgets server` or run `npm run dev` when browser verification is needed.
   - For wiki changes, preview with Gollum and verify affected pages, sidebar links, images, and favicon assets.
   - Use browser automation when practical to verify critical UI behavior.
   - Stop any verification server you started when done.

8. Commit and Push
   - Review the diff and error list before committing.
   - Commit focused changes with a concise message.
   - Push the branch to `origin`.
   - If wiki changes were made, commit them separately in `/workspaces/pvkgadgets.wiki` and push `master` only after the user confirms publication.

9. Open Pull Request
   - Create a non-draft PR targeting `main` unless the user asks for a draft.
   - Include a concise summary, notable implementation details, ADR added/updated/referenced if applicable, wiki changes or wiki publication status if applicable, verification commands and manual checks, release notes draft, and `Fixes #<issue-number>`.
   - Report the PR URL.

10. Wait for User Confirmation
   - Ask the user to confirm their own manual check before merge/release.
   - If `version` is pending, ask the user to choose the final release version before continuing to merge/release steps that require version metadata.
   - When they explicitly say to proceed, continue.

11. Merge PR
   - Re-check PR status, review requirements, and local working tree.
   - Merge using the repository's preferred style. If no preference is known, use squash merge.
   - Confirm the issue closes automatically or report if it does not.

12. Tag, Release, and Publish
    - Switch to `main`, fetch, and fast-forward pull.
      - If `version` is pending, stop and ask for the final version before changing files, tagging, or publishing a release.
      - Once the final version is chosen, normalize it to both `X.Y.Z` and `vX.Y.Z` forms and check that the tag does not already exist.
      - If version references were deferred, create a focused version bump commit on `main` or on a release-prep branch/PR if the user wants review before publication.
    - Create an annotated tag `vX.Y.Z` on the merged `main` commit and push it only after the user has approved Gate 2.
      - The `Publish npm package` workflow runs on `v*` tag pushes and publishes with npm Trusted Publishing. It expects:
        - npm package name: `@pkistudio/pvkgadgets`
        - GitHub owner/repository: `pkistudio/pvkgadgets`
        - workflow filename: `publish-npm.yml`
        - npm Trusted Publishing environment: none / blank, unless the workflow is later changed to use one.
      - For scoped npm packages, `E404` during publish can mean the package does not exist yet or the workflow/account lacks scope permission.
      - If npm publish fails with `E404` or `no permission`, explain that npm Trusted Publishing or initial package ownership is not configured. Do not keep rerunning the same job until npm permissions are fixed.
      - Do not create a new tag just to retry npm publication when the version and tag are already correct. After fixing npm permissions or Trusted Publishing, rerun the failed publish workflow or publish manually from an authorized npm account.
      - If the version was already published manually, do not rerun the publish job for the same tag/version; npm versions are immutable and the rerun will fail.
    - Create a GitHub Release named `vX.Y.Z` with release notes summarizing user-facing changes and referencing the issue.
    - Mark it as the latest stable release, not draft and not prerelease, unless instructed otherwise.
    - After publication, verify `npm view @pkistudio/pvkgadgets@X.Y.Z version dist-tags dist.tarball --json` and, when practical, perform a fresh temporary install from npm and import the package entry points.

13. Confirm Final State
      - Verify:
         - PR is merged and closed.
         - issue is closed as completed.
         - tag exists on `main` HEAD.
         - GitHub Release is published.
         - npm package version is published and has the expected dist-tag.
         - wiki changes are pushed, intentionally deferred, or not applicable.
         - GitHub Pages deployment from `.github/workflows/pages.yml` completed, failed, or is clearly reported as pending.
         - relevant GitHub Actions completed or are still running.
      - Final response must include issue, PR, release, tag, npm, wiki, Pages, and Actions status.

## Final Response Format

Keep the final response concise and include:

- Issue link and state
- PR link and merge state
- Release link and tag
- npm package/version status
- Wiki publication status, if applicable
- Pages URL and deployment status
- Verification summary
- Actions status
- Any follow-up needed
