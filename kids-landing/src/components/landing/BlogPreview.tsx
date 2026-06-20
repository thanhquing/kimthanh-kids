import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import b1 from "@/assets/blog-1.jpg";
import b2 from "@/assets/blog-2.jpg";
import b3 from "@/assets/blog-3.jpg";

const posts = [
  {
    img: b1,
    tag: "KimThanh Kids",
    date: "12/05/2026",
    title: "KimThanh Kids ra mắt module Nhật ký bé phiên bản 2026",
    excerpt:
      "Giáo viên KimThanh Kids chỉ cần 30 giây để gửi khoảnh khắc của bé tới phụ huynh — kèm gợi ý nội dung bằng AI tiếng Việt.",
  },
  {
    img: b2,
    tag: "Cộng đồng",
    date: "05/05/2026",
    title: "Hành trình 1.200 ngôi trường đồng hành cùng KimThanh Kids",
    excerpt:
      "Câu chuyện những hiệu trưởng đã chọn KimThanh Kids để thay đổi cách vận hành trường mầm non chỉ trong 30 ngày.",
  },
  {
    img: b3,
    tag: "Phụ huynh",
    date: "28/04/2026",
    title: "Phụ huynh KimThanh Kids chia sẻ: 'Mỗi tối là một thước phim của con'",
    excerpt:
      "Cách các gia đình sử dụng KimThanh Kids để biến 15 phút buổi tối thành khoảnh khắc kết nối cùng con yêu.",
  },
];

export function BlogPreview() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-narrow">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-block rounded-full bg-mint/40 text-foreground px-4 py-1.5 text-xs font-semibold">
                📚 Blog & Kiến thức
              </span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Đồng hành cùng bé bằng kiến thức đúng
              </h2>
            </div>
            <Link
              to="/tin-tuc"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition self-start"
            >
              Tất cả bài viết <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.title} delay={i * 100}>
              <article className="group rounded-3xl bg-card border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    width={900}
                    height={640}
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
                  <Link
                    to="/tin-tuc"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
                  >
                    Đọc tiếp <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
