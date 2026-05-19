# Claude Code Rules for Flux

## Product context

Flux is the **umbrella app** for a three-app wellness toolset driven by an AI coach. It implements the **workouts** surface directly, while its siblings are **vibe** (meditation, native Android, separate repo) and **balance** (check-ins / tracking, `gunk-dev/balance`, Capacitor + React, syncs via Google Sheets).

The coach generates programs, reviews progress, adapts to mood / sickness / stress signals from check-ins, and schedules reminders. Flux is one of its expressions — design and architecture decisions should be evaluated against the coaching relationship, not against Flux as a standalone app.

## Git & GitHub

- **Never reference Claude in commits or PRs.** Do not include "Co-Authored-By: Claude" or any mention of Claude/AI in commit messages, PR titles, or PR descriptions.
- **All changes must be submitted as pull requests.** Never push directly to the main branch. Always create a feature branch and open a PR for review.
- **Never merge PRs.** Only the user merges pull requests. Do not use `gh pr merge` or any merge commands.

## Environment Management

- **Always use nix for environment management.** This project uses nix flakes. Do not use `npm install` directly.
- **Default dev shell:** `nix develop` - for general development with Node.js and serve
- **Test shell:** `nix develop .#test` - includes Playwright browsers for e2e tests
- **Run tests:** `nix develop .#test --command npm test`
