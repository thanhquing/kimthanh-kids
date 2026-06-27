import { ChevronRight, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar } from "@/components/mobile/Primitives";
import { students } from "@/mockData";

export function ChildrenListPage() {
  return (
    <>
      <TopBar title="Con của tôi" rightIcon={Search} />
      <div className="mt-3 space-y-3">
        {students.slice(0, 3).map((student) => (
          <NavLink key={student.id} to={`/parent/student/${student.id}`} className="card flex items-center gap-3 p-3 text-left">
            <Avatar initials={student.initials} image={student.image} size="lg" />
            <div className="flex-1">
              <div className="font-semibold">{student.name}</div>
              <div className="text-xs text-slate-500">{student.className} · {student.age} tuổi</div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </NavLink>
        ))}
      </div>
    </>
  );
}

