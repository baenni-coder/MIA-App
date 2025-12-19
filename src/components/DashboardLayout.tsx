"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import NotificationBell from "./NotificationBell";
import {
  LogOut,
  LayoutDashboard,
  CalendarRange,
  BookOpen,
  PlusCircle,
  FolderOpen,
  Shield,
  Menu,
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

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

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
      icon: <LayoutDashboard className="h-4 w-4" />,
      path: "/dashboard",
    },
    {
      label: "Jahresplan",
      icon: <CalendarRange className="h-4 w-4" />,
      path: "/dashboard/jahresplan",
    },
    {
      label: "Lehrmittel",
      icon: <BookOpen className="h-4 w-4" />,
      path: "/dashboard/lehrmittel",
    },
    {
      label: "Thema erstellen",
      icon: <PlusCircle className="h-4 w-4" />,
      path: "/dashboard/thema-erstellen",
    },
    {
      label: "Meine Themen",
      icon: <FolderOpen className="h-4 w-4" />,
      path: "/dashboard/meine-themen",
    },
    {
      label: "Admin",
      icon: <Shield className="h-4 w-4" />,
      path: "/dashboard/admin",
      adminOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Image
              src="/logo.png"
              alt="MIA-App"
              width={120}
              height={60}
              className="object-contain cursor-pointer"
              style={{ height: "auto" }}
              onClick={() => router.push("/dashboard")}
              priority
            />
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex gap-2">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    onClick={() => router.push(item.path)}
                    className="flex items-center gap-2"
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-muted-foreground hidden md:inline">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </Button>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="outline" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="text-sm text-muted-foreground pb-4 border-b">
                    {user?.email}
                  </div>

                  <nav className="flex flex-col gap-2">
                    {visibleNavItems.map((item) => {
                      const isActive = pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "default" : "ghost"}
                          onClick={() => {
                            router.push(item.path);
                            setMobileMenuOpen(false);
                          }}
                          className="flex items-center gap-2 justify-start"
                        >
                          {item.icon}
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      Abmelden
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
