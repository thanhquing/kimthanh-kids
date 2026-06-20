-- Platform users có tenantId = NULL. Postgres coi NULL là phân biệt trong UNIQUE,
-- nên @@unique([tenantId, email]) KHÔNG chặn 2 platform user trùng email.
-- Partial unique index dưới đây đảm bảo email là duy nhất trong nhóm platform user.
CREATE UNIQUE INDEX "users_platform_email_key" ON "users" ("email") WHERE "tenantId" IS NULL;