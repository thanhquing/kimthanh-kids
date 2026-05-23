# Business Domains

| Domain | Description | Owner role |
|---|---|---|
| Identity & Access | Users, sessions, roles. | Admin |
| School & Classroom | Tenant root + classrooms. | Admin |
| Students | Enrollment, profile, classroom assignment. | Admin |
| Attendance | Daily check-in/out per student per classroom. | Teacher |
| Daily Reports | Mood, meals, naps, activities, media. | Teacher |
| Health | Medicine requests, health records, incidents. | Nurse |
| Finance | Tuition invoices, payments. | Finance |
| Announcements | Tenant-wide / class-wide notices. | Admin / Teacher |
| Media | Photos / videos linked to students + reports. | Teacher |

Each domain has its own NestJS module (`apps/api/src/modules/<domain>/`) and a typed
endpoint group in `packages/shared-api-client/src/endpoints.ts`.
