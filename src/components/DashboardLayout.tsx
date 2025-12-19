"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import NotificationBell from "./NotificationBell";
import { cn } from "@/lib/utils";
import {
  LogOut,
  LayoutDashboard,
  CalendarRange,
  BookOpen,
  PlusCircle,
  FolderOpen,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  GraduationCap,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    // Sidebar-Status aus localStorage laden
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setSidebarCollapsed(savedState === "true");
    }
  }, [user]);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/auth/check-admin?userId=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.role === "super_admin" || data.role === "picts_admin");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/dashboard",
    },
    {
      label: "Jahresplan",
      icon: <CalendarRange className="h-5 w-5" />,
      path: "/dashboard/jahresplan",
    },
    {
      label: "Lehrmittel",
      icon: <BookOpen className="h-5 w-5" />,
      path: "/dashboard/lehrmittel",
    },
    {
      label: "Lehrplan",
      icon: <GraduationCap className="h-5 w-5" />,
      path: "/dashboard/lehrplan",
    },
    {
      label: "Thema erstellen",
      icon: <PlusCircle className="h-5 w-5" />,
      path: "/dashboard/thema-erstellen",
    },
    {
      label: "Meine Themen",
      icon: <FolderOpen className="h-5 w-5" />,
      path: "/dashboard/meine-themen",
    },
    {
      label: "Admin",
      icon: <Shield className="h-5 w-5" />,
      path: "/dashboard/admin",
      adminOnly: true,
    },
    {
      label: "Sync",
      icon: <RefreshCw className="h-5 w-5" />,
      path: "/dashboard/admin/sync",
      adminOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background flex">
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
            <Image
              src="/logo.png"
              alt="MIA-App"
              width={100}
              height={50}
              className="object-contain cursor-pointer"
              style={{ height: "auto" }}
              onClick={() => router.push("/dashboard")}
              priority
            />
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
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                onClick={() => router.push(item.path)}
                className={cn(
                  "w-full justify-start",
                  sidebarCollapsed ? "px-0 justify-center" : "gap-3"
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
            <div className="text-xs text-muted-foreground px-3 py-2 truncate">
              {user?.email}
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
            <Image
              src="/logo.png"
              alt="MIA-App"
              width={100}
              height={50}
              className="object-contain cursor-pointer"
              style={{ height: "auto" }}
              onClick={() => router.push("/dashboard")}
              priority
            />

            <div className="flex items-center gap-2">
              <NotificationBell />

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col gap-4 mt-6">
                    <div className="text-sm text-muted-foreground pb-4 border-b">
                      {user?.email}
                    </div>

                    <nav className="flex flex-col gap-1">
                      {visibleNavItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                          <Button
                            key={item.path}
                            variant={isActive ? "secondary" : "ghost"}
                            onClick={() => {
                              router.push(item.path);
                              setMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 justify-start"
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

        {/* Desktop Header (nur für Notifications) */}
        <header className="hidden lg:flex border-b bg-card sticky top-0 z-40 px-6 py-3 items-center justify-end gap-4">
          <NotificationBell />
          <span className="text-sm text-muted-foreground">
            {user?.email}
          </span>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
