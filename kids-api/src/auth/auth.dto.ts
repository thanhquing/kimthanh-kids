import { z } from "zod";

// Đăng nhập bằng email HOẶC số điện thoại. `email` giữ lại cho tương thích;
// `identifier` là trường mới (email hoặc phone). Cần ít nhất 1.
export const loginSchema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((d) => Boolean(d.identifier || d.email), {
    message: "Cần email hoặc số điện thoại",
    path: ["identifier"],
  });
export type LoginDto = z.infer<typeof loginSchema>;

// refreshToken có thể tới từ cookie HttpOnly (web) → optional trong body.
// Fallback body giữ cho client không dùng cookie (native sau này) + giai đoạn chuyển tiếp.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshDto = z.infer<typeof refreshSchema>;
