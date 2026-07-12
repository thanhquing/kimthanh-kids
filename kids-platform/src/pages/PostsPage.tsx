import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Search, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { platform, type PlatformPost, type PlatformPostInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

const EMPTY: PlatformPostInput = {
  slug: "",
  title: "",
  excerpt: "",
  contentMarkdown: "",
  coverImageUrl: "",
  category: "",
  tags: [],
  status: "DRAFT",
  seoTitle: "",
  seoDescription: "",
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

function toForm(post: PlatformPost): PlatformPostInput {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    contentMarkdown: post.contentMarkdown,
    coverImageUrl: post.coverImageUrl ?? "",
    category: post.category ?? "",
    tags: post.tags ?? [],
    status: post.status,
    seoTitle: post.seoTitle ?? "",
    seoDescription: post.seoDescription ?? "",
    publishedAt: post.publishedAt ?? null,
  };
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function Preview({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).filter(Boolean);
  if (!blocks.length) return <p className="text-sm text-slate-400">Preview nội dung bài viết.</p>;
  return (
    <div className="prose prose-sm max-w-none text-slate-700">
      {blocks.map((block, index) => {
        if (block.startsWith("# ")) {
          return (
            <h1 key={index} className="text-xl font-bold text-slate-900">
              {block.replace(/^# /, "")}
            </h1>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={index} className="text-lg font-bold text-slate-900">
              {block.replace(/^## /, "")}
            </h2>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line leading-relaxed">
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function PostsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformPostInput>(EMPTY);
  const tagsText = useMemo(() => (form.tags ?? []).join(", "), [form.tags]);

  const posts = useQuery({
    queryKey: ["platform-posts", status, q],
    queryFn: () => platform.listPosts(1, status, q),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["platform-posts"] });

  const save = useMutation({
    mutationFn: () => {
      const payload: PlatformPostInput = {
        ...form,
        slug: form.slug || slugify(form.title),
        contentMarkdown:
          form.contentMarkdown || `# ${form.title}\n\n${form.excerpt ?? ""}`.trim(),
        tags: form.tags ?? [],
        publishedAt: form.status === "PUBLISHED" ? (form.publishedAt ?? new Date().toISOString()) : null,
      };
      return editingId ? platform.updatePost(editingId, payload) : platform.createPost(payload);
    },
    onSuccess: (post) => {
      toast("Đã lưu bài viết");
      setEditingId(post.id);
      setForm(toForm(post));
      invalidate();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const publish = useMutation({
    mutationFn: (id: string) => platform.publishPost(id),
    onSuccess: (post) => {
      toast("Đã xuất bản bài viết");
      if (editingId === post.id) setForm(toForm(post));
      invalidate();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const unpublish = useMutation({
    mutationFn: (id: string) => platform.unpublishPost(id),
    onSuccess: (post) => {
      toast("Đã chuyển về nháp");
      if (editingId === post.id) setForm(toForm(post));
      invalidate();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => platform.deletePost(id),
    onSuccess: () => {
      toast("Đã xóa bài viết");
      setEditingId(null);
      setForm(EMPTY);
      invalidate();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  function newPost() {
    setEditingId(null);
    setForm(EMPTY);
  }

  function edit(post: PlatformPost) {
    setEditingId(post.id);
    setForm(toForm(post));
  }

  return (
    <>
      <PageHeader title="Bài viết landing" section="Nội dung">
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={newPost}>
          <Plus className="h-4 w-4" />
          Bài mới
        </button>
      </PageHeader>

      <main className="grid gap-5 p-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="card p-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className="field pl-9"
                placeholder="Tìm title, slug..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select className="field w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            {posts.isLoading && <p className="text-sm text-slate-400">Đang tải...</p>}
            {(posts.data?.items ?? []).map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => edit(post)}
                className={cn(
                  "w-full rounded-xl border border-slate-100 p-3 text-left transition hover:border-orange-200 hover:bg-orange-50/40",
                  editingId === post.id && "border-orange-300 bg-orange-50",
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{post.title}</div>
                    <div className="truncate text-xs text-slate-400">/{post.slug}</div>
                  </div>
                  <span
                    className={cn(
                      "badge",
                      post.status === "PUBLISHED"
                        ? "b-green"
                        : post.status === "ARCHIVED"
                          ? "b-slate"
                          : "b-orange",
                    )}
                  >
                    {post.status}
                  </span>
                </div>
              </button>
            ))}
            {!posts.isLoading && !(posts.data?.items.length ?? 0) && (
              <p className="text-sm text-slate-400">Chưa có bài viết.</p>
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <form
            className="card space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <label className="label">Tiêu đề</label>
              <input
                className="field"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slug || slugify(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div>
              <label className="label">Slug</label>
              <input
                className="field"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="label">Excerpt</label>
              <textarea
                className="field min-h-20"
                value={form.excerpt ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Cover image URL</label>
                <input
                  className="field"
                  value={form.coverImageUrl ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                  placeholder="/blog/blog-1.jpg"
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  className="field"
                  value={form.category ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Tags (cách nhau bằng dấu phẩy)</label>
              <input
                className="field"
                value={tagsText}
                onChange={(e) => setForm((f) => ({ ...f, tags: splitTags(e.target.value) }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">SEO title</label>
                <input
                  className="field"
                  value={form.seoTitle ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">SEO description</label>
                <input
                  className="field"
                  value={form.seoDescription ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Markdown content</label>
              <textarea
                className="field min-h-56 font-mono text-sm"
                value={form.contentMarkdown}
                onChange={(e) => setForm((f) => ({ ...f, contentMarkdown: e.target.value }))}
                placeholder="# Tiêu đề&#10;&#10;Nội dung bài viết..."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-primary inline-flex items-center gap-2 text-sm" disabled={save.isPending}>
                <UploadCloud className="h-4 w-4" />
                {save.isPending ? "Đang lưu..." : "Lưu nháp"}
              </button>
              {editingId && form.status !== "PUBLISHED" && (
                <button
                  type="button"
                  className="btn-soft text-sm"
                  onClick={() => publish.mutate(editingId)}
                >
                  Xuất bản
                </button>
              )}
              {editingId && form.status === "PUBLISHED" && (
                <button
                  type="button"
                  className="btn-soft text-sm"
                  onClick={() => unpublish.mutate(editingId)}
                >
                  Hủy xuất bản
                </button>
              )}
              {editingId && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => remove.mutate(editingId)}
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </button>
              )}
            </div>
          </form>

          <aside className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Preview</h2>
              <span className="badge b-slate">{form.status ?? "DRAFT"}</span>
            </div>
            {form.coverImageUrl && (
              <img
                src={form.coverImageUrl}
                alt=""
                className="mb-4 aspect-[16/9] w-full rounded-xl object-cover"
              />
            )}
            <Preview markdown={form.contentMarkdown || `# ${form.title}\n\n${form.excerpt ?? ""}`} />
          </aside>
        </section>
      </main>
    </>
  );
}
