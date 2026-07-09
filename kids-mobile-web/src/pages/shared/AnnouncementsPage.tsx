import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { announcementKeys, listAnnouncementsPage, type AnnouncementAudience } from "@/api/announcements";
import { TopBar } from "@/components/mobile/MobileShell";
import { LoadMore } from "@/components/ui/LoadMore";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT } from "@/i18n";
import { announcementAudienceLabel, announcementFilters } from "@/lib/announcementDisplay";
import { formatShortDate } from "@/lib/date";
import { useMobileState } from "@/lib/mobileState";
import { cn } from "@/lib/utils";

export function AnnouncementsPage() {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { role } = useMobileState();
  const appRole = role === "teacher" ? "teacher" : "parent";
  const [filter, setFilter] = useState<AnnouncementAudience | "ALL_VISIBLE">("ALL_VISIBLE");
  const audience = appRole === "teacher" && filter !== "ALL_VISIBLE" ? filter : undefined;
  const query = useLoadMore(
    appRole === "parent" ? announcementKeys.feed(appRole) : announcementKeys.list(audience),
    (params) => listAnnouncementsPage(appRole, audience, params),
  );
  const announcements =
    appRole === "parent" && filter !== "ALL_VISIBLE"
      ? query.items.filter((item) => item.audience === filter)
      : query.items;

  return (
    <>
      <TopBar
        title={t("announcements.title")}
        rightIcon={role === "teacher" ? Plus : undefined}
        onRight={() => navigate("/teacher/announcements/new")}
      />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {announcementFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn("chip whitespace-nowrap", filter === item && "active")}
          >
            {announcementAudienceLabel(item, t)}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {query.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
        {query.isError ? <div className="card p-4 text-sm text-red-600">{t("announcements.listError")}</div> : null}
        {!query.isLoading && !query.isError && announcements.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">{t("announcements.empty")}</div>
        ) : null}
        {announcements.map((announcement) => (
          <div key={announcement.id} className="card p-3">
            <div className="flex items-start gap-3">
              <span className={cn("badge", announcement.audience === "ALL" ? "b-blue" : "b-peach")}>
                {announcement.classroom?.name ?? announcementAudienceLabel(announcement.audience, t)}
              </span>
              <span className="ml-auto text-xs text-slate-400">{formatShortDate(announcement.publishedAt ?? announcement.createdAt, lang)}</span>
            </div>
            <div className="mt-1 text-sm font-semibold">{announcement.title}</div>
            <div className="mt-1 text-xs text-slate-500">{announcement.body}</div>
          </div>
        ))}
      </div>
      <LoadMore
        hasMore={!!query.hasNextPage}
        loading={query.isFetchingNextPage}
        onMore={() => void query.fetchNextPage()}
      />
    </>
  );
}
