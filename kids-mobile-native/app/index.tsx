import { Redirect } from "expo-router";
import { isAuthed } from "@/api/auth";
import { roleStore } from "@/api/http";

export default function IndexRoute() {
  if (!isAuthed()) return <Redirect href="/login" />;
  const role = roleStore.get();
  return <Redirect href={role === "teacher" ? "/teacher" : "/parent"} />;
}
