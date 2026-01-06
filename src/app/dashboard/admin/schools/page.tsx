"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/types";
import {
  Loader2,
  Building2,
  Users,
  Shield,
  ShieldCheck,
  Search,
  ExternalLink,
  UserCog,
  Crown,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";

interface SchoolUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  stufe: string;
}

interface SchoolWithUsers {
  id: string;
  name: string;
  ort?: string;
  pictsBuchen?: string;
  users: SchoolUser[];
  pictsAdmins: { id: string; name: string; email: string }[];
  userCount: number;
}

interface Stats {
  totalSchools: number;
  totalUsers: number;
  totalPictsAdmins: number;
  totalSuperAdmins: number;
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Schüler:in",
  teacher: "Lehrperson",
  picts_admin: "PICTS-Admin",
  super_admin: "Super-Admin",
};

const ROLE_BADGES: Record<UserRole, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  student: { variant: "outline", icon: <Users className="h-3 w-3" /> },
  teacher: { variant: "secondary", icon: <Users className="h-3 w-3" /> },
  picts_admin: { variant: "default", icon: <Shield className="h-3 w-3" /> },
  super_admin: { variant: "destructive", icon: <Crown className="h-3 w-3" /> },
};

export default function SchoolsManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [schools, setSchools] = useState<SchoolWithUsers[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // User Role Dialog States
  const [editingUser, setEditingUser] = useState<SchoolUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("teacher");
  const [isSavingRole, setIsSavingRole] = useState(false);

  // School Dialog States
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolWithUsers | null>(null);
  const [schoolForm, setSchoolForm] = useState({ name: "", ort: "", pictsBuchen: "" });
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  // Delete Confirmation
  const [deleteSchoolId, setDeleteSchoolId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkSuperAdminAccess();
  }, [user]);

  const checkSuperAdminAccess = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/auth/check-admin", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await response.json();

      if (data.role !== "super_admin") {
        alert("Nur Super-Admins haben Zugriff auf die Schulverwaltung");
        router.push("/dashboard/admin");
        return;
      }

      setIsSuperAdmin(true);
      loadSchools();
    } catch (error) {
      console.error("Error checking admin access:", error);
      router.push("/dashboard");
    }
  };

  const loadSchools = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch("/api/admin/schools", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to load schools");

      const data = await response.json();
      setSchools(data.schools || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error("Error loading schools:", error);
      alert("Fehler beim Laden der Schulen");
    } finally {
      setLoading(false);
    }
  };

  // --- User Role Functions ---
  const handleEditRole = (userItem: SchoolUser) => {
    setEditingUser(userItem);
    setSelectedRole(userItem.role);
  };

  const handleSaveRole = async () => {
    if (!user || !editingUser) return;

    try {
      setIsSavingRole(true);
      const token = await user.getIdToken();

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Aktualisieren");
      }

      setEditingUser(null);
      loadSchools();
    } catch (err) {
      console.error("Error saving role:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSavingRole(false);
    }
  };

  // --- School Functions ---
  const handleNewSchool = () => {
    setEditingSchool(null);
    setSchoolForm({ name: "", ort: "", pictsBuchen: "" });
    setSchoolDialogOpen(true);
  };

  const handleEditSchool = (school: SchoolWithUsers) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name,
      ort: school.ort || "",
      pictsBuchen: school.pictsBuchen || "",
    });
    setSchoolDialogOpen(true);
  };

  const handleSaveSchool = async () => {
    if (!user || !schoolForm.name.trim()) return;

    try {
      setIsSavingSchool(true);
      const token = await user.getIdToken();

      if (editingSchool) {
        // Update existing school
        const response = await fetch(`/api/admin/schools/${editingSchool.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(schoolForm),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Fehler beim Aktualisieren");
        }
      } else {
        // Create new school
        const response = await fetch("/api/admin/schools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(schoolForm),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Fehler beim Erstellen");
        }
      }

      setSchoolDialogOpen(false);
      loadSchools();
    } catch (err) {
      console.error("Error saving school:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!user || !deleteSchoolId) return;

    try {
      setIsDeleting(true);
      const token = await user.getIdToken();

      const response = await fetch(`/api/admin/schools/${deleteSchoolId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fehler beim Löschen");
      }

      setDeleteSchoolId(null);
      loadSchools();
    } catch (err) {
      console.error("Error deleting school:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter schools
  const filteredSchools = schools.filter((school) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      school.name.toLowerCase().includes(query) ||
      (school.ort && school.ort.toLowerCase().includes(query)) ||
      school.users.some(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
    );
  });

  if (!isSuperAdmin) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Schulverwaltung
              </h1>
              <p className="text-muted-foreground">
                Verwalten Sie Schulen, PICTS-Admins und Benutzer
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleNewSchool}>
                <Plus className="h-4 w-4 mr-2" />
                Neue Schule
              </Button>
              <Button variant="outline" onClick={loadSchools}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
            </div>
          </div>

          {/* Statistiken */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalSchools}</p>
                      <p className="text-sm text-muted-foreground">Schulen</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalUsers}</p>
                      <p className="text-sm text-muted-foreground">Benutzer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPictsAdmins}</p>
                      <p className="text-sm text-muted-foreground">PICTS-Admins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalSuperAdmins}</p>
                      <p className="text-sm text-muted-foreground">Super-Admins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Schulen oder Benutzer suchen..."
              className="pl-9"
            />
          </div>

          {/* Loading */}
          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Lade Schulen...</p>
              </CardContent>
            </Card>
          )}

          {/* Schulen-Liste */}
          {!loading && (
            <Accordion type="multiple" className="space-y-4">
              {filteredSchools.map((school) => (
                <AccordionItem
                  key={school.id}
                  value={school.id}
                  className="border rounded-lg overflow-hidden bg-card"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{school.name}</p>
                        {school.ort && (
                          <p className="text-sm text-muted-foreground">{school.ort}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {school.userCount}
                        </Badge>
                        {school.pictsAdmins.length > 0 && (
                          <Badge variant="default">
                            <Shield className="h-3 w-3 mr-1" />
                            {school.pictsAdmins.length} PICTS
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {/* School Actions */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSchool(school)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                      {school.userCount === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteSchoolId(school.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Löschen
                        </Button>
                      )}
                    </div>

                    {/* PICTS-Link */}
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">PICTS-Buchungslink:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {school.pictsBuchen ? (
                            <>
                              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {school.pictsBuchen}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={school.pictsBuchen}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              Nicht konfiguriert
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSchool(school)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* PICTS-Admins */}
                    {school.pictsAdmins.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          PICTS-Admins
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {school.pictsAdmins.map((admin) => (
                            <Badge key={admin.id} variant="outline" className="py-1">
                              {admin.name || admin.email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benutzer-Tabelle */}
                    {school.users.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Name</th>
                              <th className="px-4 py-2 text-left font-medium">E-Mail</th>
                              <th className="px-4 py-2 text-left font-medium">Stufe</th>
                              <th className="px-4 py-2 text-left font-medium">Rolle</th>
                              <th className="px-4 py-2 text-right font-medium">Aktion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {school.users.map((userItem, idx) => (
                              <tr
                                key={userItem.id}
                                className={idx % 2 === 0 ? "bg-background" : "bg-muted/50"}
                              >
                                <td className="px-4 py-2">{userItem.name}</td>
                                <td className="px-4 py-2 text-muted-foreground">
                                  {userItem.email}
                                </td>
                                <td className="px-4 py-2">{userItem.stufe}</td>
                                <td className="px-4 py-2">
                                  <Badge variant={ROLE_BADGES[userItem.role].variant}>
                                    {ROLE_BADGES[userItem.role].icon}
                                    <span className="ml-1">{ROLE_LABELS[userItem.role]}</span>
                                  </Badge>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRole(userItem)}
                                  >
                                    <UserCog className="h-4 w-4 mr-1" />
                                    Rolle
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Keine Benutzer registriert
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          {/* Keine Ergebnisse */}
          {!loading && filteredSchools.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Schulen gefunden</p>
                {searchQuery && (
                  <p className="text-sm mt-2">
                    Versuchen Sie einen anderen Suchbegriff
                  </p>
                )}
                <Button className="mt-4" onClick={handleNewSchool}>
                  <Plus className="h-4 w-4 mr-2" />
                  Erste Schule erstellen
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* School Edit/Create Dialog */}
        <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSchool ? "Schule bearbeiten" : "Neue Schule erstellen"}
              </DialogTitle>
              <DialogDescription>
                {editingSchool
                  ? "Bearbeiten Sie die Daten der Schule."
                  : "Erfassen Sie eine neue Schule im System."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={schoolForm.name}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, name: e.target.value })
                  }
                  placeholder="Schule Musterstadt"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ort</label>
                <Input
                  value={schoolForm.ort}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, ort: e.target.value })
                  }
                  placeholder="Musterstadt"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">PICTS-Buchungslink</label>
                <Input
                  value={schoolForm.pictsBuchen}
                  onChange={(e) =>
                    setSchoolForm({ ...schoolForm, pictsBuchen: e.target.value })
                  }
                  placeholder="https://..."
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Link zur PICTS-Buchungsseite der Schule
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSchoolDialogOpen(false)}
                disabled={isSavingSchool}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveSchool}
                disabled={isSavingSchool || !schoolForm.name.trim()}
              >
                {isSavingSchool ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingSchool ? "Speichern" : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete School Confirmation Dialog */}
        <Dialog open={!!deleteSchoolId} onOpenChange={() => setDeleteSchoolId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schule löschen?</DialogTitle>
              <DialogDescription>
                Möchten Sie diese Schule wirklich löschen? Diese Aktion kann nicht
                rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteSchoolId(null)}
                disabled={isDeleting}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSchool}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Benutzerrolle ändern</DialogTitle>
              <DialogDescription>
                Ändern Sie die Rolle für {editingUser?.name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Aktuelle Rolle</label>
                <div>
                  {editingUser && (
                    <Badge variant={ROLE_BADGES[editingUser.role].variant}>
                      {ROLE_BADGES[editingUser.role].icon}
                      <span className="ml-1">{ROLE_LABELS[editingUser.role]}</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Neue Rolle</label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: UserRole) => setSelectedRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Lehrperson
                      </span>
                    </SelectItem>
                    <SelectItem value="picts_admin">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        PICTS-Admin
                      </span>
                    </SelectItem>
                    <SelectItem value="super_admin">
                      <span className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Super-Admin
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedRole === "picts_admin" && (
                <p className="text-sm text-muted-foreground">
                  PICTS-Admins können Themen ihrer Schule prüfen und freigeben.
                </p>
              )}
              {selectedRole === "super_admin" && (
                <p className="text-sm text-yellow-600">
                  Super-Admins haben vollen Zugriff auf alle Funktionen der App.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                disabled={isSavingRole}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={isSavingRole || selectedRole === editingUser?.role}
              >
                {isSavingRole ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
