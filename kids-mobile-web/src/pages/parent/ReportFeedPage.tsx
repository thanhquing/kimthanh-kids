import { TopBar } from "@/components/mobile/MobileShell";
import { ReportLine } from "@/components/mobile/Primitives";
import { reports } from "@/mockData";
import { useMobileState } from "@/lib/mobileState";

export function ReportFeedPage() {
  const { selectedStudent } = useMobileState();
  return (
    <>
      <TopBar title={`Báo cáo · ${selectedStudent.name.replace("Nguyễn ", "Bé ")}`} backTo={`/parent/student/${selectedStudent.id}`} />
      <div className="mt-3 space-y-3">
        {reports.map((report) => (
          <div key={report.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold">{report.date}</div>
              <span className="text-xl">{report.mood}</span>
            </div>
            <div className="mb-3 text-xs text-slate-500">{report.teacher}</div>
            <div className="space-y-1 text-sm">
              <ReportLine label="Bữa ăn" value={report.meals} />
              <ReportLine label="Ngủ trưa" value={report.nap} />
              <ReportLine label="Hoạt động" value={report.activities} />
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-amber-200 to-pink-200" />
              <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-blue-200 to-emerald-200" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

