"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "./ui/button";
import { LogOut, LayoutDashboard, CalendarRange } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Image
              src="/logo.png"
              alt="MIA-App"
              width={120}
              height={60}
              className="object-contain cursor-pointer"
              onClick={() => router.push("/dashboard")}
              priority
            />
            <nav className="hidden md:flex gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard/jahresplan")}
                className="flex items-center gap-2"
              >
                <CalendarRange className="h-4 w-4" />
                Jahresplan
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
