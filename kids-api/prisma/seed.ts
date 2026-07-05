import {
  BillingCycle,
  LimitMetric,
  PlanTier,
  PostStatus,
  PrismaClient,
  UserType,
} from "@prisma/client";
import { hashPassword } from "../src/common/crypto/password";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const FEATURES = ["messaging", "media_gallery", "lesson_plan", "analytics", "api_access"];
const BLOG_PLACEHOLDER_COVER = "/public/assets/blog/blog-placeholder.webp";
const BLOG_DAILY_JOURNAL_COVER =
  "/public/assets/blog/kimthanh-kids-ra-mat-nhat-ky-be-2026-goi-y-ai.webp";

type BlogSeedPost = {
  slug: string;
  coverImageUrl: string;
  category: string;
  publishedAt: string;
  title: string;
  excerpt: string;
  contentMarkdown: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
};

const BLOG_POSTS: BlogSeedPost[] = [
  {
    slug: "kimthanh-kids-ra-mat-nhat-ky-be-2026-goi-y-ai",
    coverImageUrl: BLOG_DAILY_JOURNAL_COVER,
    category: "KimThanh Kids",
    publishedAt: "2026-05-12T00:00:00.000Z",
    title: "KimThanh Kids ra mắt Nhật ký bé 2026 — gợi ý nội dung bằng AI",
    excerpt:
      "Giáo viên chỉ cần 30 giây để gửi khoảnh khắc của bé tới phụ huynh trên KimThanh Kids.",
    contentMarkdown: `
## Nhật ký bé 2026 giải quyết vấn đề gì?

Với trường mầm non, báo cáo hằng ngày không chỉ là một tin nhắn cuối buổi. Đó là cách nhà trường cho phụ huynh thấy con đã ăn, ngủ, vui chơi, học tập và được chăm sóc như thế nào. Khi báo cáo đều và có hình ảnh phù hợp, phụ huynh an tâm hơn, giáo viên bớt phải trả lời lặp lại, còn hiệu trưởng có dữ liệu để kiểm soát chất lượng từng lớp.

Nhật ký bé 2026 của KimThanh Kids được thiết kế cho nhu cầu đó: giáo viên có thể ghi nhận nhanh hoạt động trong ngày, gắn hình ảnh, thêm ghi chú và gửi tới đúng phụ huynh. Nội dung được tổ chức theo từng bé và từng lớp, thay vì trôi trong nhiều nhóm chat.

## Vì sao giáo viên cần công cụ nhẹ?

Một công cụ cho giáo viên mầm non phải đủ nhanh để dùng trong ngày thật. Nếu mỗi báo cáo mất quá nhiều thao tác, giáo viên sẽ ngại cập nhật hoặc chỉ làm khi có nhắc nhở. Vì vậy, trải nghiệm quan trọng nhất là chọn lớp, chọn bé, ghi nhận nội dung chính và gửi báo cáo trong thời gian ngắn.

Gợi ý nội dung bằng AI trong bối cảnh này không nhằm thay giáo viên. Nó chỉ giúp giáo viên có điểm bắt đầu khi viết mô tả hoạt động, sau đó giáo viên vẫn kiểm tra và chỉnh lại theo tình hình thực tế của bé.

## Chủ trường nhận được giá trị gì?

Khi báo cáo được số hóa, chủ trường có thể nhìn lớp nào gửi đều, lớp nào cần hỗ trợ và phụ huynh đang nhận trải nghiệm ra sao. Đây là dữ liệu quan trọng để giữ chân phụ huynh và nâng chất lượng vận hành.

Nếu trường đang dùng Zalo để gửi ảnh và báo cáo, KimThanh Kids là một cách chuyển đổi mềm: bắt đầu từ báo cáo ngày, sau đó nối với điểm danh, thông báo, sức khỏe và học phí.
`.trim(),
  },
  {
    slug: "1200-ngoi-truong-dong-hanh-cung-kimthanh-kids",
    coverImageUrl: BLOG_PLACEHOLDER_COVER,
    category: "Cộng đồng",
    publishedAt: "2026-05-05T00:00:00.000Z",
    title: "1.200 ngôi trường đồng hành cùng KimThanh Kids",
    excerpt: "Câu chuyện những hiệu trưởng chọn KimThanh Kids để chuyển đổi số toàn diện.",
    contentMarkdown: `
## Chuyển đổi số bắt đầu từ những việc rất nhỏ

Nhiều trường mầm non không bắt đầu chuyển đổi số bằng một dự án lớn. Họ bắt đầu từ một vấn đề rất cụ thể: điểm danh bị chậm, phụ huynh hỏi thông tin nhiều lần, học phí khó đối chiếu, hoặc giáo viên mất quá nhiều thời gian viết sổ liên lạc.

KimThanh Kids đồng hành cùng các trường theo cách đó. Thay vì yêu cầu đội ngũ thay đổi toàn bộ trong một ngày, trường có thể bắt đầu từ các nghiệp vụ cốt lõi như điểm danh, báo cáo hằng ngày, thông báo, hồ sơ sức khỏe và học phí.

## Bài học từ các hiệu trưởng

Điểm chung của các hiệu trưởng triển khai tốt không phải là họ giỏi công nghệ hơn. Họ làm rõ quy trình trước: ai điểm danh, ai duyệt thông báo, ai theo dõi công nợ, ai phản hồi phụ huynh và dữ liệu nào chủ trường cần xem mỗi tuần.

Khi quy trình rõ, phần mềm trở thành nơi giúp mọi người làm cùng một cách. Giáo viên nhẹ việc giấy tờ hơn, phụ huynh nhận thông tin chính thống hơn, còn chủ trường nhìn được vận hành bằng dữ liệu.

## Từ một lớp đến toàn trường

Một cách triển khai an toàn là chọn một lớp hoặc một khối lớp để thử trước. Sau khi giáo viên quen thao tác và phụ huynh hiểu cách xem thông tin, trường mở rộng ra toàn bộ lớp. Cách làm từng bước giúp giảm áp lực cho đội ngũ và tránh tình trạng dùng phần mềm nửa vời.

Với chủ trường đang cân nhắc chuyển đổi số, câu hỏi nên đặt ra là: nghiệp vụ nào đang làm mất nhiều thời gian nhất và ảnh hưởng trực tiếp đến niềm tin phụ huynh? Câu trả lời đó sẽ quyết định điểm bắt đầu.
`.trim(),
  },
  {
    slug: "phu-huynh-kimthanh-kids-moi-toi-la-mot-thuoc-phim-cua-con",
    coverImageUrl: BLOG_PLACEHOLDER_COVER,
    category: "Phụ huynh",
    publishedAt: "2026-04-28T00:00:00.000Z",
    title: "Phụ huynh KimThanh Kids: 'Mỗi tối là một thước phim của con'",
    excerpt: "Cách các gia đình biến 15 phút buổi tối thành khoảnh khắc kết nối cùng con.",
    contentMarkdown: `
## Phụ huynh cần nhìn thấy điều gì mỗi ngày?

Với trẻ mầm non, phụ huynh thường không nhận được câu trả lời đầy đủ khi hỏi "hôm nay con đi học thế nào?". Vì vậy, một báo cáo ngắn có hình ảnh, hoạt động, ăn ngủ và ghi chú sức khỏe có thể tạo ra cảm giác yên tâm rất lớn.

KimThanh Kids giúp thông tin của bé được lưu theo từng ngày. Phụ huynh không phải kéo lại hàng trăm tin nhắn trong nhóm lớp để tìm ảnh hoặc thông báo. Mọi nội dung quan trọng được đặt trong một luồng chính thống của nhà trường.

## 15 phút buổi tối có thể thay đổi niềm tin

Khi phụ huynh xem lại hình ảnh và hoạt động của con, cuộc trò chuyện trong gia đình trở nên cụ thể hơn. Thay vì hỏi chung chung, phụ huynh có thể nhắc tới bức tranh con vẽ, món ăn con thử, hoặc trò chơi con tham gia cùng bạn.

Niềm tin với nhà trường không chỉ đến từ ngày khai giảng hay buổi họp phụ huynh. Nó đến từ những điểm chạm nhỏ được lặp lại đều đặn mỗi ngày.

## Nhà trường được lợi gì?

Khi thông tin minh bạch, phụ huynh ít phải hỏi lại. Giáo viên không cần gửi riêng cùng một nội dung cho nhiều người. Hiệu trưởng cũng dễ kiểm tra lớp nào cập nhật đều và lớp nào cần hỗ trợ thêm.

Với trường mầm non tư thục, trải nghiệm phụ huynh là một phần của tuyển sinh và tái ghi danh. Báo cáo ngày tốt giúp phụ huynh có thêm lý do để tiếp tục gắn bó với trường.
`.trim(),
  },
  {
    slug: "thuc-don-mam-non-chuan-dinh-duong",
    coverImageUrl: BLOG_PLACEHOLDER_COVER,
    category: "Dinh dưỡng",
    publishedAt: "2026-04-20T00:00:00.000Z",
    title: "Thực đơn mầm non chuẩn dinh dưỡng — quản lý ngay trên KimThanh Kids",
    excerpt: "Cách bếp trưởng các trường KimThanh Kids xây dựng thực đơn 4 tuần cho bé 2–6 tuổi.",
    contentMarkdown: `
## Thực đơn là một phần của vận hành trường

Thực đơn mầm non không chỉ là danh sách món ăn. Nó liên quan đến sức khỏe, chi phí bữa ăn, dị ứng, khẩu vị của trẻ và niềm tin phụ huynh. Khi thực đơn được chuẩn bị theo tuần hoặc theo tháng, nhà trường dễ kiểm soát nguyên liệu và truyền thông rõ ràng hơn với gia đình.

Một thực đơn tốt cần cân bằng giữa dinh dưỡng, tính khả thi của bếp, ngân sách và độ phù hợp với độ tuổi. Trường cũng nên có cách ghi nhận phản hồi: bé ăn tốt món nào, món nào thường bỏ, lớp nào có nhiều bé cần lưu ý.

## Vì sao nên số hóa thực đơn?

Khi thực đơn chỉ dán ở bảng thông báo, phụ huynh dễ bỏ lỡ. Khi gửi qua nhóm chat, thông tin có thể trôi. Số hóa giúp phụ huynh xem lại bất cứ lúc nào và giúp trường lưu lịch sử thực đơn theo tuần.

Nếu dữ liệu thực đơn kết nối với hồ sơ sức khỏe hoặc ghi chú dị ứng, giáo viên và người phụ trách bữa ăn sẽ cẩn thận hơn với những bé có nhu cầu đặc biệt.

## KimThanh Kids hỗ trợ truyền thông với phụ huynh

KimThanh Kids giúp trường đưa các thông tin sinh hoạt như thông báo, báo cáo ngày, hình ảnh và ghi chú sức khỏe vào một kênh chính thống. Với thực đơn, trường có thể dùng nội dung này như một phần trong trải nghiệm phụ huynh: rõ ràng, đều đặn và dễ xem.

Điều quan trọng không phải là làm thực đơn thật phức tạp, mà là duy trì sự minh bạch và nhất quán. Phụ huynh tin hơn khi họ biết con ăn gì và nhà trường theo dõi việc chăm sóc ra sao.
`.trim(),
  },
  {
    slug: "dong-hanh-cung-be-hoc-goi-ten-cam-xuc",
    coverImageUrl: BLOG_PLACEHOLDER_COVER,
    category: "Cảm xúc",
    publishedAt: "2026-04-10T00:00:00.000Z",
    title: "KimThanh Kids đồng hành cùng bé học gọi tên cảm xúc",
    excerpt:
      "Bộ công cụ trò chuyện tích hợp trong app KimThanh Kids dành cho phụ huynh và giáo viên.",
    contentMarkdown: `
## Trẻ mầm non cần được hỗ trợ gọi tên cảm xúc

Ở lứa tuổi mầm non, trẻ đang học cách nhận biết vui, buồn, tức giận, sợ hãi, tự hào hoặc thất vọng. Khi người lớn giúp trẻ gọi tên cảm xúc, trẻ có cơ hội diễn đạt nhu cầu tốt hơn thay vì chỉ khóc, né tránh hoặc phản ứng mạnh.

Nhà trường và gia đình nên dùng cùng một ngôn ngữ cảm xúc. Nếu giáo viên ghi nhận hôm nay bé hơi lo lắng khi tham gia hoạt động nhóm, phụ huynh có thể tiếp tục trò chuyện nhẹ nhàng với con ở nhà.

## Báo cáo ngày nên có nhiều hơn ảnh đẹp

Ảnh lớp rất quan trọng, nhưng một ghi chú ngắn về cảm xúc hoặc tương tác của bé cũng có giá trị lớn. Phụ huynh muốn biết con có hòa nhập không, có chơi với bạn không, có gặp khó khăn gì cần hỗ trợ không.

KimThanh Kids giúp giáo viên gửi báo cáo ngày và ghi chú theo từng bé. Khi thông tin được lưu lại, hiệu trưởng và phụ huynh có thể nhìn thấy tiến bộ của trẻ theo thời gian.

## Công nghệ chỉ là cầu nối

Việc gọi tên cảm xúc vẫn cần sự quan sát và tình yêu thương của giáo viên. Phần mềm không thay thế điều đó. Nó giúp những quan sát tốt đẹp không bị quên, không bị trôi trong nhóm chat và đến đúng phụ huynh.

Với chủ trường, đây là một cách nâng chất lượng dịch vụ mà không cần quảng cáo ồn ào: phụ huynh cảm nhận được nhà trường hiểu con mình.
`.trim(),
  },
  {
    slug: "diem-danh-ai-co-that-su-an-toan-cho-tre",
    coverImageUrl: BLOG_PLACEHOLDER_COVER,
    category: "Công nghệ",
    publishedAt: "2026-04-01T00:00:00.000Z",
    title: "Điểm danh AI của KimThanh Kids có thật sự an toàn cho trẻ?",
    excerpt:
      "Giải đáp những băn khoăn phổ biến về công nghệ nhận diện khuôn mặt tại KimThanh Kids.",
    contentMarkdown: `
## An toàn dữ liệu phải đi trước sự tiện lợi

Điểm danh là nghiệp vụ quan trọng trong trường mầm non vì liên quan trực tiếp đến sĩ số, an toàn lớp, bữa ăn và thông tin phụ huynh. Khi nhắc đến AI hoặc nhận diện khuôn mặt, câu hỏi đầu tiên không nên là "có nhanh không", mà là "dữ liệu trẻ được bảo vệ thế nào".

Trường mầm non cần thận trọng với mọi công nghệ xử lý thông tin trẻ em. Phụ huynh cần biết dữ liệu nào được thu thập, dùng vào mục đích gì, ai có quyền xem và trường có quy trình xử lý khi phụ huynh không đồng ý hay không.

## AI không thay thế quy trình điểm danh

Dù dùng công nghệ nào, trường vẫn cần quy trình rõ: giáo viên chịu trách nhiệm điểm danh, hiệu trưởng kiểm tra bé vắng chưa rõ lý do, và phụ huynh được cập nhật thông tin cần thiết. AI nếu có chỉ nên hỗ trợ thao tác, không thay thế trách nhiệm của con người.

Với KimThanh Kids, nội dung tư vấn nên tập trung vào điểm danh rõ ràng, phân quyền, báo cáo và trải nghiệm phụ huynh. Những tính năng AI cần được triển khai thận trọng, có kiểm duyệt và không phóng đại.

## Chủ trường nên hỏi gì khi xem demo?

Hãy hỏi nhà cung cấp: dữ liệu được lưu ở đâu, phụ huynh có quyền gì, giáo viên thao tác ra sao, khi nhận diện sai thì xử lý thế nào, và hệ thống có nhật ký thao tác không. Đây là các câu hỏi giúp đánh giá công nghệ ở góc độ vận hành thật.

An toàn không đến từ một nhãn "AI", mà từ quy trình, phân quyền, minh bạch và cách trường giao tiếp với phụ huynh.
`.trim(),
  },
];

const SEO_B2B_DOC_PATH = join(
  __dirname,
  "../../kids-business-docs/seo-content/2026-B2B-SAAS-BLOG-DATA-20-POSTS.md",
);

const SEO_B2B_CATEGORY_BY_SLUG: Record<string, string> = {
  "phan-mem-quan-ly-truong-mam-non": "Chuyển đổi số",
  "quan-ly-hoc-phi-mam-non": "Tài chính",
  "quy-trinh-van-hanh-truong-mam-non": "Vận hành",
  "checklist-cong-viec-hieu-truong-mam-non": "Vận hành",
  "SOP-truong-mam-non": "Vận hành",
  "quan-ly-chuoi-truong-mam-non": "Vận hành",
  "marketing-tuyen-sinh-truong-mam-non": "Tuyển sinh",
  "CRM-truong-mam-non": "Tuyển sinh",
  "tang-ty-le-tai-ghi-danh-truong-mam-non": "Tuyển sinh",
  "KPI-giao-vien-mam-non": "Nhân sự",
  "cham-cong-tinh-luong-giao-vien-mam-non": "Nhân sự",
  "so-lien-lac-dien-tu-mam-non": "Phụ huynh",
  "diem-danh-mam-non": "Vận hành",
  "quan-ly-suc-khoe-don-thuoc-di-ung-mam-non": "Sức khỏe",
  "dashboard-quan-ly-truong-mam-non": "Chuyển đổi số",
  "chuyen-doi-so-truong-mam-non": "Chuyển đổi số",
  "AI-trong-giao-duc-mam-non": "Công nghệ",
  "ho-so-mo-truong-mam-non-tu-thuc": "Pháp lý",
  "bao-cao-doanh-thu-truong-mam-non": "Tài chính",
  "zalo-excel-hay-phan-mem-quan-ly-mam-non": "Chuyển đổi số",
};

function readMarkdownField(block: string, heading: string): string {
  const startMarker = `### ${heading}\n\n`;
  const start = block.indexOf(startMarker);
  if (start === -1) return "";

  const rest = block.slice(start + startMarker.length);
  const end = rest.search(/\n### /);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

function extractKeywordTags(block: string, category: string): string[] {
  const primary = block.match(/^- Primary keyword: (.+)$/m)?.[1] ?? "";
  const secondary = block.match(/^- Secondary keywords: (.+)$/m)?.[1] ?? "";
  const keywordTags = [primary, ...secondary.split(",")]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  return Array.from(new Set([category, ...keywordTags]));
}

function loadSeoB2BPosts(): BlogSeedPost[] {
  const source = readFileSync(SEO_B2B_DOC_PATH, "utf8");
  const matches = Array.from(source.matchAll(/^## \d+\. (.+)$/gm));

  return matches.map((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = matches[index + 1]?.index ?? source.length;
    const block = source.slice(sectionStart, sectionEnd);
    const slug = readMarkdownField(block, "URL slug");
    const category = SEO_B2B_CATEGORY_BY_SLUG[slug] ?? "Quản trị trường";
    const title = match[1].trim();
    const seoTitle = readMarkdownField(block, "SEO title") || title;
    const excerpt = readMarkdownField(block, "Meta description");
    const contentMarkdown = readMarkdownField(block, "Full article");
    const publishedAt = new Date(Date.UTC(2026, 5, 30 - index, 0, 0, 0)).toISOString();

    if (!slug || !excerpt || !contentMarkdown) {
      throw new Error(`Không parse được bài SEO B2B #${index + 1}: ${title}`);
    }

    return {
      slug,
      coverImageUrl: BLOG_PLACEHOLDER_COVER,
      category,
      publishedAt,
      title,
      excerpt,
      contentMarkdown,
      seoTitle,
      seoDescription: excerpt,
      tags: extractKeywordTags(block, category),
    };
  });
}

async function upsertPlan(args: {
  code: string;
  name: string;
  tier: PlanTier;
  isPublic: boolean;
  trialDays: number;
  sortOrder: number;
  prices: { billingCycle: BillingCycle; amount: number }[];
  features: Record<string, boolean>;
  limits: Partial<Record<LimitMetric, number | null>>;
}) {
  const plan = await prisma.plan.upsert({
    where: { code: args.code },
    update: {
      name: args.name,
      tier: args.tier,
      isPublic: args.isPublic,
      trialDays: args.trialDays,
      sortOrder: args.sortOrder,
    },
    create: {
      code: args.code,
      name: args.name,
      tier: args.tier,
      isPublic: args.isPublic,
      trialDays: args.trialDays,
      sortOrder: args.sortOrder,
    },
  });

  for (const p of args.prices) {
    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle_currency: {
          planId: plan.id,
          billingCycle: p.billingCycle,
          currency: "VND",
        },
      },
      update: { amount: p.amount },
      create: { planId: plan.id, billingCycle: p.billingCycle, currency: "VND", amount: p.amount },
    });
  }
  for (const key of FEATURES) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: plan.id, featureKey: key } },
      update: { enabled: args.features[key] ?? false },
      create: { planId: plan.id, featureKey: key, enabled: args.features[key] ?? false },
    });
  }
  for (const [metric, limitValue] of Object.entries(args.limits)) {
    await prisma.planLimit.upsert({
      where: { planId_metric: { planId: plan.id, metric: metric as LimitMetric } },
      update: { limitValue },
      create: { planId: plan.id, metric: metric as LimitMetric, limitValue, enforcement: "HARD" },
    });
  }
  return plan;
}

async function main() {
  // ─── 4 gói công khai (bậc theo số GV + HS) + 1 gói dedicated ẩn ───
  // Free vĩnh viễn = entry tier khi đăng ký (xem provisioning.signup).
  await upsertPlan({
    code: "free",
    name: "Miễn phí",
    tier: PlanTier.FREE,
    isPublic: true,
    trialDays: 0, // freemium: dùng mãi, không hết hạn
    sortOrder: 0,
    prices: [{ billingCycle: BillingCycle.MONTHLY, amount: 0 }],
    features: {
      messaging: false,
      media_gallery: false,
      lesson_plan: false,
      analytics: false,
      api_access: false,
    },
    limits: { STUDENTS: 20, TEACHERS: 2, CLASSROOMS: 2, SCHOOLS: 1, STORAGE_MB: 1024 },
  });

  await upsertPlan({
    code: "starter",
    name: "Khởi đầu",
    tier: PlanTier.STARTER,
    isPublic: true,
    trialDays: 0,
    sortOrder: 1,
    prices: [
      { billingCycle: BillingCycle.MONTHLY, amount: 490_000 },
      { billingCycle: BillingCycle.ANNUAL, amount: 4_900_000 }, // ~10 tháng
    ],
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: false,
      analytics: false,
      api_access: false,
    },
    limits: { STUDENTS: 100, TEACHERS: 8, CLASSROOMS: 8, SCHOOLS: 1, STORAGE_MB: 5120 },
  });

  await upsertPlan({
    code: "pro",
    name: "Chuyên nghiệp",
    tier: PlanTier.PRO,
    isPublic: true,
    trialDays: 0,
    sortOrder: 2,
    prices: [
      { billingCycle: BillingCycle.MONTHLY, amount: 1_200_000 },
      { billingCycle: BillingCycle.QUARTERLY, amount: 3_240_000 },
      { billingCycle: BillingCycle.ANNUAL, amount: 12_240_000 },
    ],
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: true,
      analytics: true,
      api_access: false,
    },
    limits: { STUDENTS: 300, TEACHERS: 25, CLASSROOMS: 20, SCHOOLS: 1, STORAGE_MB: 20480 },
  });

  await upsertPlan({
    code: "enterprise",
    name: "Hệ thống",
    tier: PlanTier.ENTERPRISE,
    isPublic: true,
    trialDays: 0,
    sortOrder: 3,
    prices: [{ billingCycle: BillingCycle.ANNUAL, amount: 0 }], // liên hệ — giá thỏa thuận
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: true,
      analytics: true,
      api_access: true,
    },
    limits: { STUDENTS: null, TEACHERS: null, CLASSROOMS: null, SCHOOLS: null, STORAGE_MB: null },
  });

  await upsertPlan({
    code: "dedicated",
    name: "Triển khai riêng",
    tier: PlanTier.CUSTOM,
    isPublic: false,
    trialDays: 0,
    sortOrder: 4,
    prices: [{ billingCycle: BillingCycle.ANNUAL, amount: 0 }],
    features: {
      messaging: true,
      media_gallery: true,
      lesson_plan: true,
      analytics: true,
      api_access: true,
    },
    limits: { STUDENTS: null, TEACHERS: null, CLASSROOMS: null, SCHOOLS: null, STORAGE_MB: null },
  });

  // ─── Platform super-admin (staff của bạn) ───
  const passwordHash = await hashPassword("Admin@12345");
  const existing = await prisma.user.findFirst({
    where: { email: "admin@kimthanhkids.vn", tenantId: null },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        type: UserType.PLATFORM,
        email: "admin@kimthanhkids.vn",
        fullName: "Platform Super Admin",
        passwordHash,
        platformRole: "PLATFORM_SUPER_ADMIN",
        tenantId: null,
      },
    });
  }

  // ─── Cấu hình nền tảng (singleton) — TK ngân hàng nhận thanh toán (cho VietQR hóa đơn) ───
  await prisma.platformConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      bankBin: "970436", // Vietcombank
      bankAccountNumber: "1027123456",
      bankAccountName: "CONG TY TNHH KIMTHANH KIDS",
    },
  });

  const seoB2BPosts = loadSeoB2BPosts();
  const allBlogPosts = [...BLOG_POSTS, ...seoB2BPosts];

  // ─── Blog landing: seed bài cũ + bộ SEO B2B để kids-landing render bằng API/platform data ───
  for (const post of allBlogPosts) {
    await prisma.platformPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        contentMarkdown: post.contentMarkdown,
        coverImageUrl: post.coverImageUrl,
        category: post.category,
        tags: post.tags ?? [post.category],
        status: PostStatus.PUBLISHED,
        seoTitle: post.seoTitle ?? post.title,
        seoDescription: post.seoDescription ?? post.excerpt,
        publishedAt: new Date(post.publishedAt),
        deletedAt: null,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        contentMarkdown: post.contentMarkdown,
        coverImageUrl: post.coverImageUrl,
        category: post.category,
        tags: post.tags ?? [post.category],
        status: PostStatus.PUBLISHED,
        seoTitle: post.seoTitle ?? post.title,
        seoDescription: post.seoDescription ?? post.excerpt,
        publishedAt: new Date(post.publishedAt),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed xong: 5 plan + platform super-admin + cấu hình NH + ${allBlogPosts.length} bài blog (${BLOG_POSTS.length} cũ + ${seoB2BPosts.length} SEO B2B)`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
