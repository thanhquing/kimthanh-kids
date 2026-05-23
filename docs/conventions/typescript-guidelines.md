# TypeScript Guidelines

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`.
- Forbidden: `any` (warn-level today; goal: error). Prefer `unknown` + narrowing.
- Forbidden: non-null assertion (`!`) on values the compiler can prove `null | undefined`.
  Use `assert` / narrowing / `??`.
- Use `import type` for type-only imports — keeps bundle clean.
- Discriminated unions for tagged variants (`ApiResponse<T>`).
- Generic constraints: prefer `<T extends BaseShape>` over over-narrow signatures.
- Enums: prefer `enum` for cross-package, cross-language stability (DB persists strings).
- Avoid `enum const` — they don't survive isolated modules well.
- Avoid `namespace`. Use modules.
