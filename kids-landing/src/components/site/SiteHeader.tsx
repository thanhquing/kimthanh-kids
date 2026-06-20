import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-kimthanh.png";

const navItems = [
  { to: "/tinh-nang", label: "Tính năng" },
  { to: "/giai-phap", label: "Giải pháp" },
  { to: "/bang-gia", label: "Báo giá" },
  { to: "/tin-tuc", label: "Tin tức" },
  { to: "/lien-he", label: "Liên hệ" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container-narrow flex h-16 md:h-20 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 group"
          aria-label="KimThanh Kids — Trang chủ"
        >
          <img
            src={logo}
            alt="KimThanh Kids"
            width={126}
            height={48}
            className="h-11 md:h-12 w-auto transition-transform group-hover:scale-105"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="px-4 py-2 rounded-full text-sm font-medium text-foreground/75 hover:text-primary hover:bg-primary-soft transition-colors"
              activeProps={{ className: "text-primary bg-primary-soft" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/lien-he"
            className="text-sm font-medium text-foreground/75 hover:text-primary transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            to="/lien-he"
            className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-glow hover:brightness-110 hover:-translate-y-0.5 transition-all"
          >
            Dùng thử miễn phí
          </Link>
        </div>

        <button
          aria-label="Mở menu"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden grid h-10 w-10 place-items-center rounded-full bg-card border border-border"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-background border-b border-border animate-fade-in">
          <div className="container-narrow py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl text-base font-medium text-foreground hover:bg-primary-soft hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/lien-he"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground px-5 py-3 text-sm font-semibold shadow-glow"
            >
              Dùng thử miễn phí
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
