import { Building2, Wallet, MessagesSquare, BarChart3, BookHeart, ScanFace } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const features = [
  {
    icon: Building2,
    title: "Quản lý trường chuyên nghiệp",
    desc: "Số hoá hồ sơ học sinh, giáo viên, lớp học và toàn bộ vận hành tài chính trên một nền tảng duy nhất.",
    color: "from-primary to-secondary",
  },
  {
    icon: Wallet,
    title: "Học phí & Thanh toán online",
    desc: "Thông báo học phí tự động, phụ huynh thanh toán trong vài chạm — minh bạch, nhanh chóng, không lo nhầm lẫn.",
    color: "from-accent to-coral",
  },
  {
    icon: MessagesSquare,
    title: "Tương tác đa chiều",
    desc: "Nhà trường – Phụ huynh – Giáo viên kết nối tức thì qua tin nhắn, thông báo và lịch trình chia sẻ.",
    color: "from-secondary to-mint",
  },
  {
    icon: BarChart3,
    title: "Báo cáo thông minh",
    desc: "Hơn 50 mẫu báo cáo trực quan với biểu đồ — ra quyết định nhanh, chính xác dựa trên dữ liệu thực.",
    color: "from-sun to-accent",
  },
  {
    icon: BookHeart,
    title: "Nhật ký hoạt động của bé",
    desc: "Ảnh, video, nhận xét hằng ngày từ cô — phụ huynh không bỏ lỡ khoảnh khắc lớn lên nào của con.",
    color: "from-coral to-sun",
  },
  {
    icon: ScanFace,
    title: "Điểm danh AI khuôn mặt",
    desc: "Xác thực khuôn mặt trẻ chính xác 99%, đảm bảo an toàn tuyệt đối khi đưa đón mỗi ngày.",
    color: "from-primary to-mint",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container-narrow">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block rounded-full bg-primary-soft text-primary px-4 py-1.5 text-xs font-semibold">
              ✨ Tính năng nổi bật
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Mọi thứ trường mầm non cần,
              <br className="hidden sm:block" />
              <span className="text-primary">gói gọn trong một nền tảng</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Từ vận hành nội bộ đến kết nối phụ huynh — KimThanh Kids xử lý mọi tác vụ với sự ấm áp
              và tỉ mỉ.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <article className="group h-full rounded-3xl bg-card border border-border p-7 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                <span
                  className={`inline-grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${f.color} text-primary-foreground shadow-card`}
                >
                  <f.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-foreground">{f.title}</h3>
                <p className="mt-2.5 text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Tìm hiểu thêm →
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
