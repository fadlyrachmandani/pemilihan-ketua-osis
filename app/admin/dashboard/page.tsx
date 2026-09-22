import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }
  return <DashboardClient />;
}
