# React Guidelines

- Components are functional. No class components.
- Hooks at top level. No conditional hook calls.
- Component file names: `kebab-case.tsx`. Export the React component as `PascalCase`.
- One default-or-named-export per file (prefer named).
- Server Components by default on Next.js. Add `'use client'` only when you need
  state, effects, or browser APIs.
- Pass primitives, not objects, as props when possible — better memoization.
- Memoize lists with stable `key`s. Avoid `index` as key when items can reorder.
- Forms: simple → `useState`; complex/validated → `react-hook-form` + Zod resolver.
- Use `Suspense` boundaries around async server components.
- Loading / empty / error states for every data view (see `EmptyState` in shared-ui/web).
