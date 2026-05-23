# Assets

Replace these placeholders with real brand assets before launch.

```
assets/
├── logo/      Primary + monochrome logo (SVG + PNG @1x/@2x/@3x)
├── images/    Marketing photography, hero illustrations
├── videos/    Onboarding clips, classroom tours
└── icons/     Domain icons (attendance, health, finance, …)
```

## Naming

- `logo-primary.svg`, `logo-mono.svg`
- `hero-classroom@2x.png`
- `icon-attendance.svg`
- Use `kebab-case`. Suffix raster assets with `@1x`, `@2x`, `@3x` for retina.

## Where consumed

- Web: import or reference from `apps/web/public/...` (move processed assets there).
- Mobile: copy into `apps/mobile/assets/` so EAS bundles them.
