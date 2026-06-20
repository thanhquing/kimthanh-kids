// Render lucide icons after DOM ready
window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
});
function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1F2937;color:#fff;padding:.7rem 1.1rem;border-radius:.7rem;font-size:.88rem;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2)";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
