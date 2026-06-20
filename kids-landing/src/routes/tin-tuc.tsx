import { createFileRoute } from "@tanstack/react-router";
import { Calendar, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import b1 from "@/assets/blog-1.jpg";
import b2 from "@/assets/blog-2.jpg";
import b3 from "@/assets/blog-3.jpg";

export const Route = createFileRoute("/tin-tuc")({
  component: BlogPage,
  head: () => ({
    meta: [
      { title: "Blog — KimThanh Kids" },
      {
        name: "description",
        content:
          "Kiến thức nuôi dạy trẻ, phương pháp giáo dục mầm non và câu chuyện từ cộng đồng KimThanh Kids.",
      },
      { property: "og:title", content: "Blog — KimThanh Kids" },
      {
        property: "og:description",
        content: "Kiến thức nuôi dạy & câu chuyện cộng đồng KimThanh Kids.",
      },
    ],
  }),
});

const posts = [
  {
    img: b1,
    tag: "KimThanh Kids",
    date: "12/05/2026",
    title: "KimThanh Kids ra mắt Nhật ký bé 2026 — gợi ý nội dung bằng AI",
    excerpt:
      "Giáo viên chỉ cần 30 giây để gửi khoảnh khắc của bé tới phụ huynh trên KimThanh Kids.",
  },
  {
    img: b2,
    tag: "Cộng đồng",
    date: "05/05/2026",
    title: "1.200 ngôi trường đồng hành cùng KimThanh Kids",
    excerpt: "Câu chuyện những hiệu trưởng chọn KimThanh Kids để chuyển đổi số toàn diện.",
  },
  {
    img: b3,
    tag: "Phụ huynh",
    date: "28/04/2026",
    title: "Phụ huynh KimThanh Kids: 'Mỗi tối là một thước phim của con'",
    excerpt: "Cách các gia đình biến 15 phút buổi tối thành khoảnh khắc kết nối cùng con.",
  },
  {
    img: b2,
    tag: "Dinh dưỡng",
    date: "20/04/2026",
    title: "Thực đơn mầm non chuẩn dinh dưỡng — quản lý ngay trên KimThanh Kids",
    excerpt: "Cách bếp trưởng các trường KimThanh Kids xây dựng thực đơn 4 tuần cho bé 2–6 tuổi.",
  },
  {
    img: b1,
    tag: "Cảm xúc",
    date: "10/04/2026",
    title: "KimThanh Kids đồng hành cùng bé học gọi tên cảm xúc",
    excerpt:
      "Bộ công cụ trò chuyện tích hợp trong app KimThanh Kids dành cho phụ huynh và giáo viên.",
  },
  {
    img: b3,
    tag: "Công nghệ",
    date: "01/04/2026",
    title: "Điểm danh AI của KimThanh Kids có thật sự an toàn cho trẻ?",
    excerpt:
      "Giải đáp những băn khoăn phổ biến về công nghệ nhận diện khuôn mặt tại KimThanh Kids.",
  },
];

function BlogPage() {
  return (
    <>
      <section className="pt-32 md:pt-40 pb-12 gradient-hero-bg">
        <div className="container-narrow text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Blog & Kiến thức
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
            Đồng hành cùng bé bằng{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              kiến thức đúng
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Bài viết được biên tập bởi đội ngũ chuyên gia giáo dục mầm non và đối tác KimThanh Kids.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-narrow grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={i} delay={(i % 3) * 80}>
              <article className="group rounded-3xl bg-card border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 rounded-full bg-card/95 backdrop-blur px-3 py-1 text-xs font-semibold text-primary">
                    {p.tag}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {p.date}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                    {p.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Đọc tiếp <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
