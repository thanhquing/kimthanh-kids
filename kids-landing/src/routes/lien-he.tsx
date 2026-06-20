import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, Phone, MapPin, MessageCircle, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/lien-he")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Liên hệ & Dùng thử miễn phí — KimThanh Kids" },
      {
        name: "description",
        content:
          "Để lại thông tin, đội ngũ KimThanh Kids sẽ liên hệ tư vấn miễn phí trong vòng 24 giờ.",
      },
      { property: "og:title", content: "Liên hệ — KimThanh Kids" },
      { property: "og:description", content: "Dùng thử miễn phí 30 ngày, không cần thẻ tín dụng." },
    ],
  }),
});

type FormValues = {
  name: string;
  email: string;
  phone: string;
  school?: string;
  message?: string;
};

function ContactPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();
  const [done, setDone] = useState(false);

  const onSubmit = handleSubmit(async (data) => {
    await new Promise((r) => setTimeout(r, 700));
    console.log("Contact form:", data);
    setDone(true);
    reset();
    setTimeout(() => setDone(false), 5000);
  });

  return (
    <>
      <section className="pt-32 md:pt-40 pb-12 gradient-hero-bg">
        <div className="container-narrow text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Liên hệ
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
            Hãy để chúng tôi{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              đồng hành cùng bạn
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Để lại thông tin — đội ngũ KimThanh Kids sẽ tư vấn miễn phí trong vòng 24 giờ.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-narrow grid gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div className="space-y-6">
              <div className="rounded-3xl bg-card border border-border shadow-card p-7">
                <h3 className="font-display text-xl font-bold text-foreground">
                  Thông tin liên hệ
                </h3>
                <ul className="mt-5 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary flex-none">
                      <Phone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-muted-foreground text-xs">Hotline 7 ngày/tuần</p>
                      <a
                        href="tel:1900xxxx"
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        1900 xxxx
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent flex-none">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-muted-foreground text-xs">Email tư vấn</p>
                      <a
                        href="mailto:hello@kimthanhkids.vn"
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        hello@kimthanhkids.vn
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-sun/40 text-foreground flex-none">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-muted-foreground text-xs">Văn phòng</p>
                      <p className="font-semibold text-foreground">
                        Tầng 12, Tòa Diamond, Cầu Giấy, Hà Nội
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl gradient-cta-bg text-primary-foreground p-7 shadow-glow">
                <MessageCircle className="h-8 w-8" />
                <h3 className="mt-3 font-display text-xl font-bold">Cần hỗ trợ nhanh?</h3>
                <p className="mt-2 text-sm text-primary-foreground/90">
                  Đội ngũ tư vấn KimThanh Kids luôn sẵn sàng trả lời câu hỏi của bạn trong vòng vài
                  phút.
                </p>
                <a
                  href="#"
                  className="mt-5 inline-flex rounded-full bg-card text-foreground px-5 py-2.5 text-sm font-bold hover:-translate-y-0.5 transition"
                >
                  Chat ngay với chuyên gia
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-3" delay={120}>
            <form
              onSubmit={onSubmit}
              className="rounded-3xl bg-card border border-border shadow-card p-7 sm:p-9"
            >
              <h3 className="font-display text-2xl font-bold text-foreground">
                Đăng ký tư vấn miễn phí
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Vui lòng cho chúng tôi biết một chút về bạn.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Họ và tên *" error={errors.name?.message}>
                  <input
                    type="text"
                    placeholder="Nguyễn Thị Mai"
                    className="form-input"
                    {...register("name", {
                      required: "Vui lòng nhập họ tên",
                      minLength: { value: 2, message: "Tên quá ngắn" },
                    })}
                  />
                </Field>
                <Field label="Email *" error={errors.email?.message}>
                  <input
                    type="email"
                    placeholder="mai@school.edu.vn"
                    className="form-input"
                    {...register("email", {
                      required: "Vui lòng nhập email",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email không hợp lệ",
                      },
                    })}
                  />
                </Field>
                <Field label="Số điện thoại *" error={errors.phone?.message}>
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    className="form-input"
                    {...register("phone", {
                      required: "Vui lòng nhập số điện thoại",
                      pattern: {
                        value: /^[0-9+\s()-]{8,15}$/,
                        message: "Số điện thoại không hợp lệ",
                      },
                    })}
                  />
                </Field>
                <Field label="Tên trường (nếu có)">
                  <input
                    type="text"
                    placeholder="Mầm non Hoa Sen"
                    className="form-input"
                    {...register("school")}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Lời nhắn">
                    <textarea
                      rows={4}
                      placeholder="Bạn đang quan tâm điều gì ở KimThanh Kids?"
                      className="form-input resize-none"
                      {...register("message")}
                    />
                  </Field>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-7 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-accent text-accent-foreground px-7 py-3.5 text-sm font-bold shadow-glow hover:brightness-110 hover:-translate-y-0.5 transition-all disabled:opacity-60"
              >
                {isSubmitting ? "Đang gửi..." : "Gửi đăng ký"}
              </button>

              {done && (
                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-mint/40 text-foreground px-4 py-3 text-sm font-medium animate-fade-in">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Cảm ơn bạn! Chúng tôi sẽ liên hệ trong vòng 24h.
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Bằng việc gửi, bạn đồng ý với Điều khoản & Chính sách bảo mật của KimThanh Kids.
              </p>
            </form>
          </Reveal>
        </div>
      </section>

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.7rem 0.95rem;
          font-size: 0.9rem;
          color: var(--color-foreground);
          transition: border-color .2s, box-shadow .2s;
        }
        .form-input::placeholder { color: var(--color-muted-foreground); opacity: .7; }
        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-primary) 15%, transparent);
        }
      `}</style>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-foreground mb-1.5">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
