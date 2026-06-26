import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/http";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => {
        // Không retry lỗi quyền/không tìm thấy; chỉ retry lỗi mạng/5xx tối đa 1 lần.
        if (err instanceof ApiError && err.status < 500) return false;
        return count < 1;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
