import { api } from "./http";

export type LegalDoc = {
  id: string;
  type: string;
  version: string;
  locale: string;
  title: string;
  summary?: string | null;
  body: string;
  effectiveFrom: string;
};

/** Văn bản pháp lý đang hiệu lực (kèm nội dung) — công khai. */
export function getLegal(): Promise<LegalDoc[]> {
  return api.get<LegalDoc[]>("/public/legal");
}

/** Ghi nhận user đồng ý các văn bản (server ghi kèm IP/UA). */
export function acceptConsent(documentIds: string[]): Promise<unknown> {
  return api.post("/consent/accept", { documentIds });
}
