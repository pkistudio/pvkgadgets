---
description: "Use when: running the pvkgadgets issue-to-release workflow, including issue creation, branch work, PR, merge, tag, GitHub Release, GitHub Pages deployment, and Actions checks."
name: "pvkgadgets release workflow"
argument-hint: "[version|TBD] [#issue] <short feature or fix summary>"
agent: "agent"
---

# pvkgadgets Release Workflow

Run the standard pvkgadgets release workflow from issue creation through GitHub Release publication and GitHub Pages deployment.

Expected invocation examples:

```text
/release 0.0.2 "Improve PKCS#12 import"
/release v0.0.2 "Fix certificate matching"
/release TBD "Improve CSR generation"
/release "Improve API log output"
/release TBD #12
/release 0.0.3 #12 "Implement requested export option"
```

The release version may be omitted or set to `TBD` when development should proceed before the final version is known. If an existing issue number is supplied, use that issue instead of creating a duplicate issue. If the feature summary, desired release scope, issue reference, or whether a known-looking first argument is a version is unclear, ask concise clarifying questions before making changes. Otherwise proceed proactively.

## Required Safety Rules

- This prompt is a workflow guide only and does not grant repository permissions.
- Push, tag, release, merge, and secret-backed Actions operations are possible only for users or tokens with the required repository permissions.
- Work in the current repository only.
- Check the current branch, remote, and working tree before making changes.
- Never discard uncommitted user changes.
- If unrelated local changes exist, stop and ask how to proceed.
- Create implementation work on a feature branch, never directly on `main`.
- Do not merge the PR or publish the release until the user confirms they have reviewed the behavior, unless the user explicitly asks to proceed without that confirmation.
- Use existing repository patterns and keep changes focused on the requested issue.
- Preserve existing `package.json` package metadata unless the release requires a focused change. Do not add `private: true` only to prevent npm publication; npm publishing is outside this workflow unless explicitly requested.
- Use non-interactive git commands.

## Inputs

Derive these from the invocation when possible:

- `version`: release version, normalized to both `X.Y.Z` and `vX.Y.Z` forms when known. If omitted or `TBD`, treat it as pending and do not create tags, publish releases, or make final version bumps until the release step.
- `issueNumber`: existing GitHub issue number when the invocation includes a `#<number>` reference or an unambiguous issue URL.
- `summary`: short feature or fix summary.
- `issueBody`: issue requirements. If the user supplied detailed requirements, preserve them.
- `verificationPlan`: expected local checks. If not supplied, infer from the changed area.

## Workflow

1. Preflight
   - Confirm the repository is `pkistudio/pvkgadgets` unless the user intentionally targets another repo.
   - Run a clean working tree check.
   - Confirm the current default branch and remote.
   - If `version` is known, check existing tags so the requested release version does not already exist.
   - If `version` is pending, record that the final version must be chosen before version bumps, tagging, or release publication.

2. Create Issue
   - If `issueNumber` is known, fetch the existing issue and use its title, body, requirements, labels, and discussion as the source request. Do not create a new issue.
   - If no existing issue is supplied, create a GitHub issue describing the requested change.
   - For new issues, include summary, requirements, expected behavior, and verification notes.
   - Record the issue number for the branch, PR body, and final report.
   - Prefer GitHub tools when available. If the GitHub CLI is unavailable and `GITHUB_TOKEN` is set, use the GitHub REST API with `curl`. Never print token values.

3. Create Branch
   - Create a branch named `issue-<number>-<short-kebab-summary>`.
   - Switch to it before editing files.

4. Implement
   - Read the relevant files before editing.
   - Update app code and documentation for the requested behavior.
   - If `version` is known and the change is release-worthy, update version references together.
   - If `version` is pending, leave existing released version references unchanged during implementation and note the deferred version bump in the issue and PR.
   - For pvkgadgets version bumps, update at least:
     - `package.json` `version`, which is the source for the app and `window.PkiGadgetsCore.version`
     - `package-lock.json` root package version
     - `README.md` current version and any relevant feature documentation
   - Keep generated UI behavior consistent with the existing app style.

5. Verify Locally
   - Run the available local checks for this Vite/TypeScript app:

     ```sh
     npm run check
     npm run build
     ```

   - Use the existing VS Code task `Start pvkgadgets server` or run `npm run dev` when browser verification is needed.
   - Use browser automation when practical to verify critical UI behavior.
   - Stop any verification server you started when done.

6. Commit and Push
   - Review the diff and error list before committing.
   - Commit focused changes with a concise message.
   - Push the branch to `origin`.

7. Open Pull Request
   - Create a non-draft PR targeting `main` unless the user asks for a draft.
   - Include:
     - concise summary
     - notable implementation details
     - verification commands and manual checks
     - `Fixes #<issue-number>`
   - Report the PR URL.

8. Wait for User Confirmation
   - Ask the user to confirm their own manual check before merge/release.
   - If `version` is pending, ask the user to choose the final release version before continuing to merge/release steps that require version metadata.
   - When the user explicitly asks to proceed through release publication, continue.

9. Merge PR
   - Re-check PR status, review requirements, and local working tree.
   - Merge using the repository's preferred style. If no preference is known, use squash merge.
   - Confirm the issue closes automatically or report if it does not.

10. Tag and Release
    - Switch to `main`, fetch, and fast-forward pull.
      - If `version` is pending, stop and ask for the final version before changing files, tagging, or publishing a release.
      - Once the final version is chosen, normalize it to both `X.Y.Z` and `vX.Y.Z` forms and check that the tag does not already exist.
      - If version references were deferred, create a focused version bump commit on `main` or on a release-prep branch/PR if the user wants review before publication.
    - Create an annotated tag `vX.Y.Z` on the merged `main` commit.
    - Push the tag.
    - Create a GitHub Release named `vX.Y.Z` with release notes summarizing user-facing changes and referencing the issue.
    - Mark it as the latest stable release, not draft and not prerelease, unless instructed otherwise.

11. Deploy GitHub Pages
   - Confirm `.github/workflows/pages.yml` exists and deploys the Vite `dist` output to GitHub Pages.
   - Confirm the Pages workflow is triggered by the release merge to `main`. If needed and the user has permission, trigger `Deploy GitHub Pages` manually with `workflow_dispatch`.
   - Watch the Pages workflow until it succeeds, fails, or remains running long enough that it should be reported as pending.
   - Confirm the deployed Pages URL from the `github-pages` environment or the workflow deployment output.
   - If the workflow fails, report the failing job and log summary before stopping; do not publish extra tags or releases to retry.

12. Confirm Final State
   - Verify PR is merged and closed.
   - Verify issue is closed as completed.
   - Verify tag exists on `main` HEAD.
   - Verify GitHub Release is published.
   - Verify GitHub Pages deployment completed successfully or is clearly reported as pending/failed.
   - Verify relevant GitHub Actions completed or are still running.
   - Final response must include issue, PR, release, tag, Pages URL/deployment status, and any Actions status.

## Final Response Format

Keep the final response concise and include:

- Issue link and state
- PR link and merge state
- Release link and tag
- Pages URL and deployment status
- Verification summary
- Actions status
- Any follow-up needed
