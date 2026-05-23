# Git Workflow

## Branches

- `main` — protected, always deployable to staging.
- `feat/<scope>-<summary>` — new features.
- `fix/<scope>-<summary>` — bug fixes.
- `chore/<summary>` — tooling, deps, docs.

## Commits (Conventional Commits)

```
<type>(<scope>): <summary>

feat(api): add medicine-request approval endpoint
fix(web): correct locale switcher on dashboard pages
chore(deps): bump prisma to 5.13
docs(architecture): clarify refresh-token rotation
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.

## Pull requests

- Small, focused. Prefer multiple PRs over one mega-PR.
- Description includes: what, why, screenshots (for UI), and any migration notes.
- All checks must pass: lint, typecheck, build, test.
- Update `/docs` in the same PR if behavior changed.

## Hooks (Husky + lint-staged)

Pre-commit runs `eslint --fix` + `prettier --write` on staged files.

## Releases

Tag `vX.Y.Z` on `main`. CI deploys API + web. Mobile uses EAS Build/Update.
