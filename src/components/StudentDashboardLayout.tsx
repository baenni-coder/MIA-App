"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { cn } from "@/lib/utils";
import { Student } from "@/types";
import NotificationBell from "./NotificationBell";
import {
  LogOut,
  LayoutDashboard,
  Star,
  BookOpen,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  Trophy,
  FileDown,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Schüler-Profil typisieren
  const studentProfile = userProfile as Student | null;

  useEffect(() => {
    // Sidebar-Status aus localStorage laden
    const savedState = localStorage.getItem("studentSidebarCollapsed");
    if (savedState) {
      setSidebarCollapsed(savedState === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("studentSidebarCollapsed", String(newState));
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/schueler/dashboard",
    },
    {
      label: "Kompetenzen",
      icon: <Star className="h-5 w-5" />,
      path: "/schueler/kompetenzen",
    },
    {
      label: "Meine Themen",
      icon: <BookOpen className="h-5 w-5" />,
      path: "/schueler/themen",
    },
    {
      label: "Badges",
      icon: <Trophy className="h-5 w-5" />,
      path: "/schueler/badges",
    },
    {
      label: "Export",
      icon: <FileDown className="h-5 w-5" />,
      path: "/schueler/export",
    },
    {
      label: "Profil",
      icon: <User className="h-5 w-5" />,
      path: "/schueler/profil",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300 sticky top-0 h-screen",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="MIA-App"
                width={80}
                height={40}
                className="object-contain cursor-pointer"
                style={{ height: "auto" }}
                onClick={() => router.push("/schueler/dashboard")}
                priority
              />
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                Schüler
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(sidebarCollapsed && "mx-auto")}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                onClick={() => router.push(item.path)}
                className={cn(
                  "w-full justify-start",
                  sidebarCollapsed ? "px-0 justify-center" : "gap-3",
                  isActive && "bg-blue-100 text-blue-700 hover:bg-blue-200"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-2 border-t">
          {!sidebarCollapsed && (
            <div className="px-3 py-2">
              <div className="text-sm font-medium truncate">
                {studentProfile?.name || user?.email}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {studentProfile?.className || "Klasse wird geladen..."}
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-red-600 hover:text-red-700 hover:bg-red-50",
              sidebarCollapsed ? "justify-center px-0" : "justify-start gap-3"
            )}
            title={sidebarCollapsed ? "Abmelden" : undefined}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span>Abmelden</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile/Tablet Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden border-b bg-card sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="MIA-App"
                width={80}
                height={40}
                className="object-contain cursor-pointer"
                style={{ height: "auto" }}
                onClick={() => router.push("/schueler/dashboard")}
                priority
              />
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                Schüler
              </span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-blue-200">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-6">
                  <div className="pb-4 border-b">
                    <div className="font-medium">
                      {studentProfile?.name || user?.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {studentProfile?.className || "Klasse wird geladen..."}
                    </div>
                  </div>

                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                      const isActive = pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "secondary" : "ghost"}
                          onClick={() => {
                            router.push(item.path);
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 justify-start",
                            isActive && "bg-blue-100 text-blue-700"
                          )}
                        >
                          {item.icon}
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      Abmelden
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex border-b bg-card sticky top-0 z-40 px-6 py-3 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-blue-700">
              Kompetenzenpass
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-muted-foreground">
              {studentProfile?.name || user?.email}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
