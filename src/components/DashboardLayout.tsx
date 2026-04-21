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
  CalendarDays,
  BookOpen,
  PlusCircle,
  FolderOpen,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  GraduationCap,
  Scale,
  FileArchive,
  HelpCircle,
  Building2,
  ArrowRightLeft,
  Users,
  Award,
  BarChart3,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import { Kanton } from "@/types";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean; // Nur für Super-Admins
  kantonOnly?: Kanton; // Nur für bestimmte Kantone anzeigen
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userKanton, setUserKanton] = useState<Kanton | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadUserKanton();
    // Sidebar-Status aus localStorage laden
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setSidebarCollapsed(savedState === "true");
    }
  }, [user]);

  const loadUserKanton = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/teachers?userId=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserKanton(data.kanton || null);
      }
    } catch (error) {
      console.error("Error loading user kanton:", error);
    }
  };

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
        setIsSuperAdmin(data.role === "super_admin");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navGroups: NavGroup[] = [
    {
      label: "Übersicht",
      icon: <LayoutDashboard className="h-4 w-4" />,
      items: [
        {
          label: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
          path: "/dashboard",
        },
        {
          label: "Jahresplan MIA",
          icon: <CalendarRange className="h-5 w-5" />,
          path: "/dashboard/jahresplan",
        },
        {
          label: "Jahresplanung",
          icon: <CalendarDays className="h-5 w-5" />,
          path: "/dashboard/jahresplanung",
        },
      ],
    },
    {
      label: "Unterricht",
      icon: <BookOpen className="h-4 w-4" />,
      items: [
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
          label: "Regelstandards",
          icon: <Scale className="h-5 w-5" />,
          path: "/dashboard/regelstandards",
          kantonOnly: "SO",
        },
      ],
    },
    {
      label: "Eigene Inhalte",
      icon: <PlusCircle className="h-4 w-4" />,
      items: [
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
          label: "Schul-Dateien",
          icon: <FileArchive className="h-5 w-5" />,
          path: "/dashboard/dateien",
        },
      ],
    },
    {
      label: "Kompetenzenpass",
      icon: <Award className="h-4 w-4" />,
      items: [
        {
          label: "Meine Klassen",
          icon: <Users className="h-5 w-5" />,
          path: "/dashboard/klassen",
        },
        {
          label: "Indikatoren",
          icon: <Lightbulb className="h-5 w-5" />,
          path: "/dashboard/indikatoren",
        },
        {
          label: "Badges",
          icon: <Award className="h-5 w-5" />,
          path: "/dashboard/badges",
        },
        {
          label: "Statistiken",
          icon: <BarChart3 className="h-5 w-5" />,
          path: "/dashboard/statistiken",
        },
      ],
    },
    {
      label: "Hilfe",
      icon: <HelpCircle className="h-4 w-4" />,
      items: [
        {
          label: "FAQ",
          icon: <HelpCircle className="h-5 w-5" />,
          path: "/dashboard/faq",
        },
      ],
    },
    {
      label: "Administration",
      icon: <Shield className="h-4 w-4" />,
      adminOnly: true,
      items: [
        {
          label: "Themen-Prüfung",
          icon: <Shield className="h-5 w-5" />,
          path: "/dashboard/admin",
          adminOnly: true,
        },
        {
          label: "Jahresplan-Pool",
          icon: <ListChecks className="h-5 w-5" />,
          path: "/dashboard/admin/jahresplan-pool",
          adminOnly: true,
        },
        {
          label: "Schulen",
          icon: <Building2 className="h-5 w-5" />,
          path: "/dashboard/admin/schools",
          superAdminOnly: true,
        },
        {
          label: "Schulanfragen",
          icon: <ArrowRightLeft className="h-5 w-5" />,
          path: "/dashboard/admin/school-requests",
          superAdminOnly: true,
        },
        {
          label: "Daten-Sync",
          icon: <RefreshCw className="h-5 w-5" />,
          path: "/dashboard/admin/sync",
          adminOnly: true,
        },
      ],
    },
  ];

  // Filter groups and items based on permissions
  const visibleNavGroups = navGroups
    .filter((group) => {
      if (group.superAdminOnly && !isSuperAdmin) return false;
      if (group.adminOnly && !isAdmin) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) return false;
        if (item.adminOnly && !isAdmin) return false;
        if (item.kantonOnly && item.kantonOnly !== userKanton) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

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
        <nav className="flex-1 p-2 overflow-y-auto">
          {visibleNavGroups.map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
              {/* Group Header */}
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.icon}
                  <span>{group.label}</span>
                </div>
              )}
              {sidebarCollapsed && groupIndex > 0 && (
                <div className="border-t my-2 mx-2" />
              )}
              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
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

                    <nav className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
                      {visibleNavGroups.map((group, groupIndex) => (
                        <div key={group.label}>
                          {/* Group Header */}
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                            groupIndex > 0 && "mt-3 pt-3 border-t"
                          )}>
                            {group.icon}
                            <span>{group.label}</span>
                          </div>
                          {/* Group Items */}
                          {group.items.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                              <Button
                                key={item.path}
                                variant={isActive ? "secondary" : "ghost"}
                                onClick={() => {
                                  router.push(item.path);
                                  setMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 justify-start w-full"
                              >
                                {item.icon}
                                {item.label}
                              </Button>
                            );
                          })}
                        </div>
                      ))}
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
