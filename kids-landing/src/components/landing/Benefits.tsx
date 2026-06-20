import { useState } from "react";
import { Check, School, GraduationCap, HeartHandshake } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import tabSchool from "@/assets/tab-school.jpg";
import tabTeacher from "@/assets/tab-teacher.jpg";
import tabParent from "@/assets/tab-parent.jpg";

const tabs = [
  {
    key: "school",
    label: "Nhà trường",
    icon: School,
    title: "Vận hành tinh gọn, quyết định bằng dữ liệu",
    image: tabSchool,
    points: [
      "Quản lý hồ sơ trường, lớp, học sinh và giáo viên trên một dashboard duy nhất",
      "Tự động hoá học phí, giảm 80% thời gian thu chi mỗi tháng",
      "Báo cáo tài chính, tuyển sinh, dinh dưỡng theo thời gian thực",
      "Mở rộng linh hoạt từ 1 cơ sở đến hệ thống trăm trường",
    ],
  },
  {
    key: "teacher",
    label: "Giáo viên",
    icon: GraduationCap,
    title: "Nhẹ gánh sổ sách, dành thời gian cho bé",
    image: tabTeacher,
    points: [
      "Điểm danh, nhận xét, cập nhật ảnh bé chỉ trong vài chạm",
      "Soạn giáo án, lưu ngân hàng hoạt động theo chương trình giảng dạy",
      "Trao đổi với phụ huynh trực tiếp, không cần dùng nhiều ứng dụng",
      "Theo dõi sự phát triển từng bé qua biểu đồ trực quan",
    ],
  },
  {
    key: "parent",
    label: "Phụ huynh",
    icon: HeartHandshake,
    title: "Đồng hành cùng con yêu trong từng khoảnh khắc",
    image: tabParent,
    points: [
      "Xem ảnh, video, nhận xét hằng ngày của con từ lớp học",
      "Nhận thông báo điểm danh, thực đơn, lịch học theo thời gian thực",
      "Thanh toán học phí an toàn, lưu giữ hoá đơn điện tử minh bạch",
      "Trò chuyện trực tiếp với cô giáo bất cứ khi nào cần",
    ],
  },
] as const;

export function Benefits() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("school");
  const current = tabs.find((t) => t.key === active)!;

  return (
    <section className="py-20 md:py-28 bg-surface">
      <div className="container-narrow">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block rounded-full bg-accent-soft text-accent px-4 py-1.5 text-xs font-semibold">
              💛 Dành cho mọi người
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Lợi ích cho từng đối tượng
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Một nền tảng — ba trải nghiệm được thiết kế riêng để ai cũng cảm thấy được lắng nghe.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex flex-wrap gap-1 p-1.5 rounded-full bg-card border border-border shadow-card">
            {tabs.map((t) => {
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  onClick={() => setActive(t.key)}
                  className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-card"
                      : "text-foreground/70 hover:text-primary"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          key={current.key}
          className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center animate-fade-in"
        >
          <div className="relative order-2 lg:order-1">
            <div className="rounded-3xl overflow-hidden shadow-card-hover ring-1 ring-border aspect-[4/3]">
              <img
                src={current.image}
                alt={current.title}
                width={1024}
                height={768}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-2 sm:right-6 rounded-2xl bg-card shadow-card-hover p-4 max-w-[220px] hidden sm:block">
              <p className="text-xs text-muted-foreground">Mức độ hài lòng</p>
              <p className="font-display text-2xl font-bold text-primary">98%</p>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[98%] gradient-cta-bg" />
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              {current.title}
            </h3>
            <ul className="mt-6 space-y-4">
              {current.points.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-primary flex-none">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <p className="text-foreground/85 leading-relaxed">{p}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
