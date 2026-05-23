# Installation

```bash
# Clone
git clone <repo-url> kimthanh-kids
cd kimthanh-kids

# Use the right Node version (see .nvmrc)
nvm use

# Enable corepack for pinned pnpm
corepack enable
corepack prepare pnpm@9.1.0 --activate

# Install all workspaces
pnpm install

# Bootstrap DB
cp .env.example .env
# fill secrets…
pnpm --filter @kimthanh/api db:generate
pnpm --filter @kimthanh/api db:migrate
pnpm --filter @kimthanh/api db:seed
```

See `local-development.md` for run/dev commands.
