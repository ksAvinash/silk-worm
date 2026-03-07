import DashboardShell from "@/components/DashboardShell";
import RequireAuth from "@/components/RequireAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Keep all dashboard routes behind the shared auth/session guard.
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
