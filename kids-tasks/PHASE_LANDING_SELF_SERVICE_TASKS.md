# Phase Landing Self-Service — `kids-landing` đăng ký trường + pricing thật + VietQR

> **Mục tiêu:** biến `kids-landing` từ brochure tĩnh thành phễu tự đăng ký SaaS: nhà trường xem gói thật từ API → chọn gói/chu kỳ → đăng ký trường → nhận tài khoản chủ trường → nếu chọn gói trả phí thì nhận hóa đơn nền tảng + VietQR để chuyển khoản cho KimThanh Kids.
>
> **Nguyên tắc sản phẩm:** ưu tiên trường **vào dùng được ngay**. Signup luôn tạo tenant gói Free ACTIVE trước; gói trả phí tạo hóa đơn nâng cấp OPEN để đối soát thủ công bằng VietQR. Khi platform admin bấm “Đã thu”, subscription mới nâng gói. Auto đối soát ngân hàng để P2.

> **Trạng thái 2026-07-02:** MVP đã triển khai. `kids-landing` đọc pricing/blog từ API, có `/dang-ky` + `/dang-ky/thanh-cong`, paid signup tạo invoice nâng cấp, mark-paid nâng subscription, `kids-platform` có trang `/posts`, seed đủ 6 bài blog cũ. Deferred: lead/contact API, auto đối soát ngân hàng, payment gateway production.

---

## 0. Hiện trạng

- `kids-landing` hiện tĩnh:
  - `/bang-gia`: giá hardcode trong `src/routes/bang-gia.tsx`.
  - `/lien-he`: form chỉ `console.log`, chưa gửi API.
  - CTA gói đang trỏ về `/lien-he`.
- Backend đã có nền:
  - `POST /public/signup`: tạo tenant/school/admin/subscription **gói Free ACTIVE**.
  - `GET /billing/plans`: trả plan thật nhưng hiện là endpoint billing tenant, chưa tối ưu cho landing public.
  - `PlatformInvoice.publicToken` + `GET /public/platform-invoices/:token`: xem hóa đơn nền tảng public.
  - `PlatformConfig` lưu tài khoản ngân hàng nền tảng để sinh VietQR.
  - Platform console có mark-paid thủ công để đối soát.
- Gap chính:
  - Landing chưa đọc pricing thật.
  - Signup chưa nhận `planCode/billingCycle`.
  - Chưa có luồng “signup chọn gói trả phí → tạo hóa đơn nâng cấp → hiển thị QR”.
  - Blog/tin tức đang hardcode trong `tin-tuc.tsx` + `BlogPreview.tsx`; chưa có nơi trong `kids-platform` để thêm/sửa/xuất bản bài viết.

---

## 1. Quyết định chốt

| # | Quyết định | Lý do |
|---|---|---|
| L1 | Signup luôn tạo tenant Free ACTIVE trước | Trường vào CRM ngay, không kẹt vì chuyển khoản thủ công chưa đối soát. |
| L2 | Gói trả phí tạo **pending upgrade invoice** | Dễ hiểu, phù hợp VietQR thủ công; không cần auto webhook ở MVP. |
| L3 | Chỉ đổi subscription khi hóa đơn đã PAID | Tránh cấp quota/feature trả phí trước khi nhận tiền. |
| L4 | Landing dùng public plans API riêng | Không phụ thuộc auth/tenant context; chỉ trả field an toàn để render giá. |
| L5 | VietQR dùng hóa đơn public token | Nhà trường xem/chuyển khoản không cần đăng nhập; nội dung chuyển khoản là số HĐ. |
| L6 | Blog dùng CMS đơn giản trong `kids-platform` | Marketing tự thêm bài, landing không phải deploy lại mỗi lần đổi nội dung. |

---

## 2. Backend cần bổ sung

### 2.1 Public plans

- [x] Thêm `GET /public/plans`.
- [x] Trả danh sách plan public/active/deletedAt null, gồm:
  - `id`, `code`, `tier`, `name`, `description`, `trialDays`, `sortOrder`.
  - `prices[]`: `billingCycle`, `currency`, `amount`, `isActive`.
  - `features[]`: `featureKey`, `enabled`.
  - `limits[]`: `metric`, `value`, `enforcement`.
- [x] Không trả internal counters, tenantCount, audit, private/dedicated hidden plan nếu `isPublic=false`.
- [x] Cập nhật `kids-documentation/API.md`.

### 2.2 Signup nhận gói chọn

Mở rộng `SignupInput`:

```ts
{
  schoolName: string;
  slug: string;
  code?: string;
  taxCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  phone?: string;
  planCode?: string;        // default "free"
  billingCycle?: BillingCycle; // default MONTHLY
}
```

- [x] Validate `planCode` public/active.
- [x] Nếu `planCode` rỗng hoặc `free`: giữ behavior hiện tại.
- [x] Nếu `planCode` trả phí:
  - vẫn tạo subscription Free ACTIVE.
  - tạo hóa đơn OPEN cho gói trả phí/chữ kỳ đã chọn.
  - response trả thêm `selectedPlan`, `upgradeInvoice`, `publicInvoiceUrl`.
- [x] Cập nhật e2e `provisioning` cho signup paid.

### 2.3 Pending upgrade invoice

Thêm service method, ví dụ:

```ts
BillingService.createSignupUpgradeInvoice(tenantId, planCode, billingCycle)
```

Yêu cầu:

- [x] Lấy `PlanPrice` theo `planCode + billingCycle + VND`.
- [x] Tạo `PlatformInvoice` OPEN với line `SUBSCRIPTION`.
- [x] Ghi đủ metadata để khi paid biết đây là invoice nâng cấp từ signup.
- [x] Cần quyết định nơi lưu metadata:
  - Ưu tiên thêm field JSON `PlatformInvoice.metadata` nếu chưa có.
  - Hoặc dùng `PlatformInvoiceLine.label` + `subscriptionId` + planCode trong invoice number chỉ là tạm, không đủ chắc.
- [x] Khi `markInvoicePaid` gặp invoice nâng cấp:
  - đổi `Subscription.planId/billingCycle`.
  - set `currentPeriodStart=now`, `currentPeriodEnd` theo cycle.
  - reset `entitlementsCache`.
  - `LifecycleService.syncTenantCache`.
  - ghi `SubscriptionChange` type `UPGRADE`.

### 2.4 Public invoice/VietQR UX

Hiện `GET /public/platform-invoices/:token` đã có. Cần kiểm tra shape đủ cho landing:

- [x] Có `invoiceNumber`, `amountDue`, `bank`, `buyer`, `seller`, `lines`, `status`.
- [x] Có đủ field để frontend dựng VietQR URL hoặc trả sẵn `vietQrUrl`.
- [x] Nếu thiếu bank config → hiển thị hướng dẫn liên hệ thay vì vỡ UI.

---

## 3. Landing frontend cần làm

### 3.1 API client nhẹ

- [x] Tạo `kids-landing/src/api/http.ts`.
- [x] Base URL:
  - dev: `/api` qua Vite proxy hoặc `VITE_API_BASE_URL`.
  - prod: same-origin `/api` qua nginx reverse proxy.
- [x] Bóc envelope `{ success, data, meta? }`.
- [x] Throw `ApiError(code,message,status)`.
- [x] Gửi `x-language: vi`.

### 3.2 Pricing thật (`/bang-gia`)

- [x] Thay `plans` hardcode bằng `GET /public/plans`.
- [x] Map limit:
  - `STUDENTS`, `TEACHERS`, `CLASSROOMS`, `STORAGE_MB`.
- [x] Map feature:
  - `media_gallery`, `lesson_plan`, `analytics`, `api_access`.
- [x] Thêm segmented control `Tháng / Quý / Năm`.
- [x] CTA:
  - Free: `/dang-ky?plan=free&cycle=MONTHLY`.
  - Starter/Pro: `/dang-ky?plan=starter&cycle=MONTHLY`...
  - Enterprise/Dedicated: `/lien-he?plan=enterprise`.
- [x] Empty/loading/error states.

### 3.3 Signup wizard (`/dang-ky`)

Tạo route mới `kids-landing/src/routes/dang-ky.tsx`.

Flow đề xuất:

1. **Chọn gói**
   - đọc từ query `plan/cycle`.
   - cho đổi gói/chu kỳ ngay trong form.
2. **Thông tin trường**
   - `schoolName`, `slug`, `code?`, `taxCode`, `phone`.
   - debounce `GET /public/availability?slug=`.
   - hiển thị host dự kiến: `<slug>.<ROOT_DOMAIN>`.
3. **Tài khoản chủ trường**
   - `adminFullName`, `adminEmail`, `adminPassword`.
4. **Xác nhận**
   - tóm tắt gói, giá, quota, trường, tài khoản.
   - submit `POST /public/signup`.

Validation FE bám backend:

- slug 3..32, lowercase, gạch ngang.
- MST 10/13 số; FE chỉ validate format, checksum vẫn backend là nguồn sự thật.
- password min 8.
- phone optional.

### 3.4 Success page (`/dang-ky/thanh-cong`)

Sau signup:

- [x] Hiển thị “Tạo trường thành công”.
- [x] Nút “Vào CRM” → `https://<host>` hoặc link dev tương ứng.
- [x] Hiển thị tài khoản admin email/phone.
- [x] Nếu gói Free:
  - CTA “Bắt đầu cấu hình trường”.
- [x] Nếu gói trả phí:
  - card hóa đơn OPEN.
  - QR VietQR, số tiền, nội dung chuyển khoản.
  - link “Xem hóa đơn” tới public invoice URL.
  - ghi rõ: “Tài khoản Free đã dùng được ngay; gói trả phí được kích hoạt sau khi KimThanh Kids xác nhận thanh toán.”

### 3.5 Contact form

MVP có thể để sau. Nếu làm trong phase này:

- [ ] Thêm lead API `POST /public/leads` hoặc gửi về CRM/platform lead table. _(Deferred P2)_
- [x] Không hứa chat realtime trong UI.
- [x] CTA “Chat ngay” đổi thành hotline/Zalo/Email thật nếu chưa có live chat.

---

## 4. UX copy cần thống nhất

Không viết “dùng thử 30 ngày” nếu seed plan `trialDays=0`.

Copy đề xuất:

- Free: “Miễn phí vĩnh viễn cho trường nhỏ”.
- Paid: “Đăng ký trước, chuyển khoản VietQR để kích hoạt gói”.
- Success paid: “Trường đã sẵn sàng ở gói Free. Sau khi thanh toán được xác nhận, hệ thống tự nâng lên gói đã chọn.”
- Payment: “VietQR miễn phí, đối soát thủ công trong MVP. Auto đối soát là giai đoạn sau.”

---

## 5. Blog / bài viết landing

### 5.1 Có cần CMS không?

**Có, nhưng làm rất nhỏ.** Bài viết tĩnh đủ cho bản demo/landing đầu, nhưng không đủ cho vận hành thật vì mỗi bài mới phải sửa code + deploy. Nên thêm một module nội dung đơn giản trong `kids-platform`, không làm CMS lớn.

**Yêu cầu migration bắt buộc:** toàn bộ bài đang hardcode trong `kids-landing` phải được chuyển thành data quản lý từ `kids-platform` và public API. Landing không giữ mảng `posts` hardcode làm nguồn sự thật nữa.

Mục tiêu MVP:

- Platform admin thêm/sửa/xóa nháp bài viết.
- Publish/unpublish.
- Landing đọc danh sách bài public + trang chi tiết theo slug.
- Hỗ trợ SEO cơ bản: title, description, cover image, canonical slug.
- **Giữ nguyên hình ảnh/nội dung hiện tại** khi migrate: title, excerpt, tag/category, date hiển thị và cover image phải khớp với `tin-tuc.tsx` + `BlogPreview.tsx` hiện tại.

Không làm ở MVP:

- Editor kéo thả phức tạp.
- Bình luận, tác giả nhiều người, newsletter automation.
- CMS đa ngôn ngữ đầy đủ.
- Upload asset riêng nếu chưa cần; dùng `coverImageUrl` trước, sau này nối media/R2.

### 5.2 Backend content module

Thêm model gợi ý:

```prisma
model PlatformPost {
  id              String   @id @default(uuid())
  slug            String   @unique
  title           String
  excerpt         String?
  contentMarkdown String
  coverImageUrl   String?
  category        String?
  tags            String[]
  status          PostStatus @default(DRAFT)
  seoTitle        String?
  seoDescription  String?
  publishedAt     DateTime?
  authorId        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

API platform:

- [x] `GET /platform/posts?page=&status=&q=`
- [x] `POST /platform/posts`
- [x] `GET /platform/posts/:id`
- [x] `PATCH /platform/posts/:id`
- [x] `POST /platform/posts/:id/publish`
- [x] `POST /platform/posts/:id/unpublish`
- [x] `DELETE /platform/posts/:id` soft-delete

API public:

- [x] `GET /public/posts?page=&category=&tag=`
  - chỉ `PUBLISHED`, `publishedAt <= now`, `deletedAt=null`.
  - trả card fields: `slug/title/excerpt/coverImageUrl/category/tags/publishedAt`.
- [x] `GET /public/posts/:slug`
  - trả detail + markdown content + SEO fields.

Quyền:

- `PLATFORM_SUPER_ADMIN` và `PLATFORM_SUPPORT` có thể CRUD/publish.
- Nếu muốn chặt hơn: SUPER_ADMIN publish, SUPPORT draft/edit.

### 5.3 kids-platform UI

Thêm nav group “Nội dung” hoặc trong “Vận hành”:

- [x] Route `/posts`.
- [x] Route `/posts/:id` hoặc modal editor.
- [x] List bài: search, filter status, badge DRAFT/PUBLISHED/ARCHIVED.
- [x] Form:
  - title, slug auto-generate + cho sửa.
  - excerpt.
  - coverImageUrl.
  - category/tags.
  - seoTitle/seoDescription.
  - contentMarkdown textarea.
  - preview markdown bên phải hoặc tab Preview.
- [x] Actions: save draft, publish, unpublish, archive/delete.

### 5.4 kids-landing blog dynamic

Thay hardcode:

- [x] Xóa mảng `posts` hardcode khỏi `BlogPreview.tsx` và `tin-tuc.tsx` sau khi API/seed sẵn.
- [x] `BlogPreview.tsx` đọc `GET /public/posts?page=1&pageSize=3&featured=true` hoặc `pageSize=3` theo `publishedAt/sortOrder`.
- [x] `/tin-tuc` đọc `GET /public/posts`.
- [x] Thêm route `/tin-tuc/$slug.tsx` đọc `GET /public/posts/:slug`.
- [x] Render markdown an toàn.
- [x] Head SEO dùng `seoTitle/seoDescription`, fallback `title/excerpt`.
- [x] Empty state: nếu chưa có bài public, ẩn BlogPreview khỏi homepage. **Không fallback về mảng hardcode** để tránh drift dữ liệu.

Seed:

- [x] `prisma/seed.ts` tạo **đủ 6 bài đang hardcode** trong `kids-landing/src/routes/tin-tuc.tsx`; 3 bài đầu cũng chính là data cho `BlogPreview`.
- [x] Giữ nguyên các field hiện tại:
  - `tag/category`
  - `date` → map sang `publishedAt`
  - `title`
  - `excerpt`
  - `img` → map sang `coverImageUrl`
- [x] Ảnh hiện tại phải được đưa ra URL public ổn định:
  - copy `blog-1.jpg`, `blog-2.jpg`, `blog-3.jpg` sang `kids-landing/public/blog/` **hoặc** seed thành media/static asset ở API nếu đã có storage public.
  - seed `coverImageUrl` dạng `/blog/blog-1.jpg`... để landing render qua URL từ API.
  - Không đổi ảnh cover của từng bài so với mapping hiện tại.
- [x] Tạo `contentMarkdown` seed tối thiểu từ title + excerpt nếu chưa có thân bài thật, để trang chi tiết không trống.
- [x] Nội dung seed giữ nguyên để không đổi landing hiện tại; trước khi publish production có thể biên tập lại các claim roadmap/AI nếu cần.

Mapping seed bắt buộc từ hardcode hiện tại:

| slug đề xuất | cover | category | publishedAt | title |
|---|---|---|---|---|
| `kimthanh-kids-ra-mat-nhat-ky-be-2026-goi-y-ai` | `/blog/blog-1.jpg` | KimThanh Kids | 2026-05-12 | KimThanh Kids ra mắt Nhật ký bé 2026 — gợi ý nội dung bằng AI |
| `1200-ngoi-truong-dong-hanh-cung-kimthanh-kids` | `/blog/blog-2.jpg` | Cộng đồng | 2026-05-05 | 1.200 ngôi trường đồng hành cùng KimThanh Kids |
| `phu-huynh-kimthanh-kids-moi-toi-la-mot-thuoc-phim-cua-con` | `/blog/blog-3.jpg` | Phụ huynh | 2026-04-28 | Phụ huynh KimThanh Kids: 'Mỗi tối là một thước phim của con' |
| `thuc-don-mam-non-chuan-dinh-duong` | `/blog/blog-2.jpg` | Dinh dưỡng | 2026-04-20 | Thực đơn mầm non chuẩn dinh dưỡng — quản lý ngay trên KimThanh Kids |
| `dong-hanh-cung-be-hoc-goi-ten-cam-xuc` | `/blog/blog-1.jpg` | Cảm xúc | 2026-04-10 | KimThanh Kids đồng hành cùng bé học gọi tên cảm xúc |
| `diem-danh-ai-co-that-su-an-toan-cho-tre` | `/blog/blog-3.jpg` | Công nghệ | 2026-04-01 | Điểm danh AI của KimThanh Kids có thật sự an toàn cho trẻ? |

---

## 6. Tài liệu cần cập nhật khi làm

- [x] `kids-documentation/API.md`
  - `GET /public/plans`.
  - `POST /public/signup` thêm `planCode/billingCycle` và response paid invoice.
  - Public posts + platform posts endpoints.
- [x] `kids-documentation/BILLING.md`
  - Luồng signup Free + pending upgrade invoice.
  - Quy tắc mark-paid mới kích hoạt gói.
- [x] `kids-documentation/ARCHITECTURE.md`
  - Module `platform-posts/content`.
- [x] `kids-tasks/ROADMAP.md`
  - Link task này.
- [x] `kids-business-docs/03-SALES-PLAYBOOK.md`
  - Cách nói signup/Free/VietQR, tránh hứa auto đối soát.
- [x] `kids-business-docs/01-BUSINESS-FLOWS.md`
  - Flow chủ trường tự đăng ký.

---

## 7. Test bắt buộc

### Backend

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd kids-api
pnpm exec tsc --noEmit
pnpm lint
pnpm test:e2e
```

E2E cần có:

- [x] `GET /public/plans` chỉ trả public active plans.
- [x] Signup Free giữ behavior cũ.
- [x] Signup paid tạo tenant Free ACTIVE + invoice OPEN + public token.
- [x] Public invoice token xem được không auth.
- [x] Mark-paid invoice nâng gói + entitlement/quota đổi đúng.
- [x] Platform post CRUD/publish/unpublish.
- [x] Public posts chỉ trả bài published.
- [x] Draft/unpublished/archived không truy cập được từ public slug.

### Landing

```bash
cd kids-landing
pnpm lint
pnpm build
```

Smoke UI:

- [x] `/bang-gia` loading/error/data thật.
- [x] chọn cycle đổi giá đúng.
- [x] signup slug available/unavailable.
- [x] signup Free thành công → CRM link.
- [x] signup paid thành công → QR/hóa đơn public.
- [x] `/tin-tuc` render bài từ API.
- [x] `/tin-tuc/:slug` có SEO/meta đúng và render markdown an toàn.

---

## 8. Thứ tự triển khai đề xuất

1. [x] Backend `GET /public/plans` + docs API.
2. [x] Landing pricing dynamic từ `/public/plans`.
3. [x] Landing `/dang-ky` signup Free thật.
4. [x] Backend signup paid → pending invoice.
5. [x] Landing success paid + VietQR/public invoice.
6. [x] Mark-paid invoice nâng gói.
7. [x] Platform posts backend + platform UI CRUD.
8. [x] Landing blog dynamic + post detail.
9. [x] E2E backend + landing/platform build/lint.
10. [x] Business docs/Sales copy.

---

## 9. Không làm trong MVP này

- Auto đối soát VietQR qua Casso/SePay.
- Cổng MoMo/ZaloPay production.
- Token hóa thẻ/auto-charge.
- Hóa đơn VAT điện tử.
- Chat realtime/live chat trong landing.
- Trial 30 ngày nếu seed plan vẫn `trialDays=0`.
- CMS đầy đủ kiểu WordPress/Notion.
- Bình luận bài viết/newsletter automation.
