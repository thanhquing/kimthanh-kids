# Import Rules

## Direction

```
apps/* → packages/*           ✅
packages/* → packages/*       ✅ (only declared deps)
packages/* → apps/*           ❌ never
apps/web → apps/api           ❌ never (HTTP only)
apps/mobile → apps/api        ❌ never (HTTP only)
```

## Order (enforced by `eslint-plugin-import`)

1. Builtins (`node:*`).
2. External packages.
3. Internal monorepo packages (`@kimthanh/...`).
4. Parent paths (`../`).
5. Sibling paths (`./`).
6. Index.

Blank line between groups. Alphabetical within a group.

## Workspace imports

Use the package name, not relative paths into another package.

```ts
// ✅
import { UserRole } from '@kimthanh/shared-types';

// ❌
import { UserRole } from '../../../packages/shared-types/src/enums';
```

## Type-only imports

```ts
import type { Paginated } from '@kimthanh/shared-types';
```

## Subpath imports

`@kimthanh/shared-ui` exposes three entrypoints:

- `@kimthanh/shared-ui` — tokens only (default).
- `@kimthanh/shared-ui/web` — Tailwind components.
- `@kimthanh/shared-ui/native` — NativeWind components.

Never import `shared-ui/web` from `apps/mobile` or vice versa.
