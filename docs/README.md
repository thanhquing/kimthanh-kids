# KimThanh Kindergarten — Documentation

This `/docs` directory is the **authoritative reference** for the KimThanh Kindergarten
monorepo. It is written for two audiences:

1. **Human engineers** joining the project.
2. **Future AI agents** who must extend the system safely.

## How to read these docs

- Start with [`ai-context/project-summary.md`](./ai-context/project-summary.md) — a single-page
  overview an AI agent should read before any task.
- Then [`architecture/overview.md`](./architecture/overview.md) for the system map.
- Use [`conventions/`](./conventions) before writing any code.
- Use [`product/`](./product) to understand business domains and user roles.
- Use [`setup/`](./setup) when bootstrapping a local environment.

## Map

| Area | Folder |
|---|---|
| Architecture | [`architecture/`](./architecture) |
| Conventions | [`conventions/`](./conventions) |
| Product | [`product/`](./product) |
| Setup | [`setup/`](./setup) |
| Decisions (ADRs) | [`decisions/`](./decisions) |
| AI context | [`ai-context/`](./ai-context) |

## Update rules

- Update docs **in the same PR** as the code change.
- Each ADR is immutable once merged — supersede with a new file.
- AI context files (`ai-context/*`) must always remain accurate.
