# Claude Code Rules for Flux

## Git & GitHub

- **Never reference Claude in commits or PRs.** Do not include "Co-Authored-By: Claude" or any mention of Claude/AI in commit messages, PR titles, or PR descriptions.
- **All changes must be submitted as pull requests.** Never push directly to the main branch. Always create a feature branch and open a PR for review.
- **Never merge PRs.** Only the user merges pull requests. Do not use `gh pr merge` or any merge commands.

## Environment Management

- **Always use nix for environment management.** This project uses nix flakes. Do not use `npm install` directly.
- **Default dev shell:** `nix develop` - for general development with Node.js and serve
- **Test shell:** `nix develop .#test` - includes Playwright browsers for e2e tests
- **Run tests:** `nix develop .#test --command npm test`
