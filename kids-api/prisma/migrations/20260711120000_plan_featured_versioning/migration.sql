-- BL-050: Gói đại diện (featured) cho mỗi tier để versioning giá.
-- Landing chỉ hiển thị 1 gói/tier (isFeatured=true). Đổi giá về sau = tạo Plan mới rồi set featured.
ALTER TABLE "plans" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Dữ liệu hiện có: chọn ĐÚNG 1 gói đại diện cho mỗi tier (gói active+public, ưu tiên sortOrder nhỏ
-- nhất rồi tạo sớm nhất) — tránh nhiều gói/tier nếu DB thật từng có nhiều bản cùng tier.
UPDATE "plans"
SET "isFeatured" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("tier") "id"
  FROM "plans"
  WHERE "deletedAt" IS NULL AND "isActive" = true AND "isPublic" = true
  ORDER BY "tier", "sortOrder" ASC, "createdAt" ASC
);

-- Bất biến "≤1 featured mỗi tier" ở tầng DB (partial unique index PostgreSQL).
CREATE UNIQUE INDEX "plans_one_featured_per_tier" ON "plans"("tier") WHERE "isFeatured" = true;
