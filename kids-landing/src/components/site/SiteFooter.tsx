import { Link } from "@tanstack/react-router";
import { Facebook, Youtube, Instagram, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo-kimthanh.png";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background mt-24">
      <div className="container-narrow py-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 bg-background/5 rounded-2xl p-3 w-fit">
            <img
              src={logo}
              alt="KimThanh Kids"
              width={147}
              height={56}
              className="h-14 w-auto"
              loading="lazy"
            />
          </div>
          <p className="mt-4 text-sm text-background/70 leading-relaxed">
            Nền tảng quản lý trường mầm non toàn diện, kết nối trọn vẹn hành trình của bé giữa gia
            đình và nhà trường.
          </p>
          <div className="mt-5 flex gap-3">
            {[Facebook, Youtube, Instagram].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="grid h-10 w-10 place-items-center rounded-full bg-background/10 hover:bg-accent transition-colors"
                aria-label="social"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold mb-4">Sản phẩm</h4>
          <ul className="space-y-3 text-sm text-background/70">
            {[
              ["/tinh-nang", "Tính năng"],
              ["/giai-phap", "Giải pháp"],
              ["/bang-gia", "Báo giá"],
              ["/tin-tuc", "Tin tức"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to as string} className="hover:text-accent transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold mb-4">Liên hệ</h4>
          <ul className="space-y-3 text-sm text-background/70">
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-accent flex-none" />
              <span>Tầng 12, Tòa nhà Diamond, Cầu Giấy, Hà Nội</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-accent flex-none" />
              <a href="tel:1900xxxx" className="hover:text-accent">
                1900 xxxx
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-accent flex-none" />
              <a href="mailto:hello@kimthanhkids.vn" className="hover:text-accent">
                hello@kimthanhkids.vn
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold mb-4">Nhận tin từ KimThanh Kids</h4>
          <p className="text-sm text-background/70 mb-4">
            Mẹo nuôi dạy, sự kiện và ưu đãi mới mỗi tháng.
          </p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Email của bạn"
              className="flex-1 rounded-full bg-background/10 border border-background/15 px-4 py-2.5 text-sm placeholder:text-background/50 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button className="rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition">
              Gửi
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-background/10">
        <div className="container-narrow py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-background/60">
          <p>© {new Date().getFullYear()} KimThanh Kids. Đồng hành cùng con yêu mỗi ngày.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-accent">
              Điều khoản
            </a>
            <a href="#" className="hover:text-accent">
              Bảo mật
            </a>
            <a href="#" className="hover:text-accent">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
