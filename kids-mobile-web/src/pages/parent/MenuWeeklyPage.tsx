import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine } from "@/components/mobile/Primitives";
import { menuWeek } from "@/mockData";

export function MenuWeeklyPage() {
  return (
    <>
      <TopBar title="Thực đơn tuần" backTo="/parent" />
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="text-xs opacity-80">Tuần 26/05 - 30/05</div>
        <div className="mt-1 text-xl font-bold">Thực đơn lớp Mầm A</div>
      </div>
      <div className="mt-3 space-y-2">
        {menuWeek.map(([day, breakfast, lunch, snack]) => (
          <div key={day} className="card p-3">
            <div className="mb-2 text-sm font-semibold">{day}</div>
            <InfoLine label="Sáng" value={breakfast} />
            <InfoLine label="Trưa" value={lunch} />
            <InfoLine label="Xế" value={snack} />
          </div>
        ))}
      </div>
    </>
  );
}

