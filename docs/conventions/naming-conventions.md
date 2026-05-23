# Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Files (TS/TSX) | `kebab-case` | `auth.service.ts`, `login-screen.tsx` |
| React components | `PascalCase` | `Button`, `LanguageSwitcher` |
| Hooks | `useThing` | `useAuth`, `useAuthStore` |
| Types / interfaces | `PascalCase` | `StudentDTO`, `JwtPayload` |
| Enums + members | `PascalCase` + `UPPER_SNAKE_CASE` | `UserRole.SUPER_ADMIN` |
| Constants | `UPPER_SNAKE_CASE` | `ACCESS_TOKEN_STORAGE_KEY` |
| Zod schemas | `<entity><action>Schema` | `markAttendanceSchema` |
| API endpoint groups | `create<Entity>Endpoints` | `createStudentEndpoints` |
| Prisma models | `PascalCase` singular | `Student`, `StudentParent` |
| Prisma tables | `snake_case` plural via `@@map` | `students`, `student_parents` |
| Translation keys | `dot.case.lowercase` | `auth.errors.invalidCredentials` |

## Forbidden

- Hungarian notation (`strName`, `iCount`).
- Abbreviations for domain terms (`stud` for `student`). Acronyms are fine (`URL`, `API`, `DTO`).
- Plural component names (`Buttons` for a single component).
