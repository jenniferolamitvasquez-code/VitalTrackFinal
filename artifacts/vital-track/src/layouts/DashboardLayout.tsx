import { useState } from "react";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { TopNavbar } from "@/components/navigation/TopNavbar";

type DashboardLayoutProps = {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  userInitial?: string;
  onSignOut?: () => void;
  showAccountDetails?: boolean;
};

export default function DashboardLayout({
  children,
  userName = "Local User",
  userEmail = "",
  userInitial = "L",
  onSignOut,
}: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        onSignOut={onSignOut}
        className="fixed inset-y-0 left-0 z-50 hidden lg:flex"
      />

      <div className="lg:pl-64">
        <TopNavbar
          userName={userName}
          userEmail={userEmail}
          userInitial={userInitial}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onSignOut={onSignOut}
        />

        {mobileSidebarOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <AppSidebar
              onNavigate={() => setMobileSidebarOpen(false)}
              onSignOut={onSignOut}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            />
          </>
        )}

        <main className="min-w-0">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

