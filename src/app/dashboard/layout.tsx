import DashboardNav from "@/components/DashboardNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ep-dashboard-root">
      <DashboardNav />
      <main className="ep-dashboard-main">
        {children}
      </main>
    </div>
  );
}
