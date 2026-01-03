"use client";

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Search,
  HelpCircle,
  BookOpen,
  Calendar,
  FolderOpen,
  Settings,
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { FAQItem, FAQCategory } from "@/types";

const CATEGORY_LABELS: Record<FAQCategory, string> = {
  allgemein: "Allgemein",
  jahresplan: "Jahresplan",
  themen: "Themen & Lektionen",
  dateien: "Schul-Dateien",
  admin: "Administration",
};

const CATEGORY_ICONS: Record<FAQCategory, React.ReactNode> = {
  allgemein: <HelpCircle className="h-4 w-4" />,
  jahresplan: <Calendar className="h-4 w-4" />,
  themen: <BookOpen className="h-4 w-4" />,
  dateien: <FolderOpen className="h-4 w-4" />,
  admin: <Settings className="h-4 w-4" />,
};

export default function FAQPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | "all">(
    "all"
  );
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "allgemein" as FAQCategory,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Admin-Status prüfen
  useEffect(() => {
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
    checkAdminStatus();
  }, [user]);

  // FAQ-Einträge laden
  const loadFAQItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {};
      let url = "/api/faq";

      if (showAdminView && user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
        url += "?includeInactive=true";
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error("Fehler beim Laden der FAQ-Einträge");
      }

      const data = await response.json();
      setFaqItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFAQItems();
  }, [showAdminView, user]);

  // Filter FAQ items
  const filteredItems = useMemo(() => {
    return faqItems.filter((item) => {
      // In Admin-View alle zeigen, sonst nur aktive
      if (!showAdminView && !item.isActive) return false;

      const matchesSearch =
        searchQuery === "" ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [faqItems, searchQuery, selectedCategory, showAdminView]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<FAQCategory, FAQItem[]> = {
      allgemein: [],
      jahresplan: [],
      themen: [],
      dateien: [],
      admin: [],
    };

    filteredItems.forEach((item) => {
      groups[item.category].push(item);
    });

    // Sortiere nach order innerhalb jeder Kategorie
    Object.keys(groups).forEach((key) => {
      groups[key as FAQCategory].sort((a, b) => a.order - b.order);
    });

    return groups;
  }, [filteredItems]);

  const categories: (FAQCategory | "all")[] = [
    "all",
    "allgemein",
    "jahresplan",
    "themen",
    "dateien",
    "admin",
  ];

  // Dialog öffnen für neuen Eintrag
  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      question: "",
      answer: "",
      category: "allgemein",
    });
    setIsDialogOpen(true);
  };

  // Dialog öffnen für Bearbeitung
  const handleEdit = (item: FAQItem) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      category: item.category,
    });
    setIsDialogOpen(true);
  };

  // Speichern
  const handleSave = async () => {
    if (!user || !formData.question || !formData.answer) return;

    try {
      setIsSaving(true);
      const token = await user.getIdToken();

      if (editingItem) {
        // Update
        const response = await fetch(`/api/faq/${editingItem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Aktualisieren");
        }
      } else {
        // Create
        const response = await fetch("/api/faq", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Erstellen");
        }
      }

      setIsDialogOpen(false);
      loadFAQItems();
    } catch (err) {
      console.error("Error saving FAQ:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  // Löschen
  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      setIsDeleting(true);
      const token = await user.getIdToken();

      const response = await fetch(`/api/faq/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Löschen");
      }

      setDeleteConfirmId(null);
      loadFAQItems();
    } catch (err) {
      console.error("Error deleting FAQ:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Löschen");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle aktiv/inaktiv
  const handleToggleActive = async (item: FAQItem) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/faq/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Ändern des Status");
      }

      loadFAQItems();
    } catch (err) {
      console.error("Error toggling FAQ status:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Ändern des Status");
    }
  };

  // FAQ initialisieren (nur für Super-Admin)
  const handleInitialize = async () => {
    if (!user) return;

    try {
      setIsInitializing(true);
      const token = await user.getIdToken();

      const response = await fetch("/api/faq", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Initialisieren");
      }

      const data = await response.json();
      if (data.count > 0) {
        alert(`${data.count} FAQ-Einträge wurden erstellt.`);
      } else {
        alert("FAQ bereits initialisiert.");
      }

      loadFAQItems();
    } catch (err) {
      console.error("Error initializing FAQ:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Initialisieren");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HelpCircle className="h-6 w-6" />
                Häufig gestellte Fragen
              </h1>
              <p className="text-muted-foreground">
                Antworten auf die wichtigsten Fragen zur MIA-App
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={showAdminView ? "default" : "outline"}
                  onClick={() => setShowAdminView(!showAdminView)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdminView ? "Admin-Ansicht aktiv" : "Verwalten"}
                </Button>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          {showAdminView && isAdmin && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Button onClick={handleNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Neue Frage
                  </Button>
                  <Button variant="outline" onClick={loadFAQItems}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aktualisieren
                  </Button>
                  {faqItems.length === 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleInitialize}
                      disabled={isInitializing}
                    >
                      {isInitializing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Standard-FAQ laden
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {filteredItems.length} Einträge
                    {faqItems.filter((i) => !i.isActive).length > 0 && (
                      <span className="text-yellow-600 ml-2">
                        ({faqItems.filter((i) => !i.isActive).length} inaktiv)
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suche und Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fragen durchsuchen..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "all" ? (
                    "Alle"
                  ) : (
                    <span className="flex items-center gap-1">
                      {CATEGORY_ICONS[category]}
                      {CATEGORY_LABELS[category]}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Lade FAQ...</p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-500/50">
              <CardContent className="py-6 text-center text-red-600">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{error}</p>
                <Button
                  variant="outline"
                  onClick={loadFAQItems}
                  className="mt-4"
                >
                  Erneut versuchen
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Keine Ergebnisse */}
          {!loading && !error && filteredItems.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Fragen gefunden</p>
                <p className="text-sm mt-2">
                  {faqItems.length === 0
                    ? "Die FAQ-Sammlung ist leer."
                    : "Versuchen Sie einen anderen Suchbegriff oder wählen Sie eine andere Kategorie"}
                </p>
                {showAdminView && faqItems.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={handleInitialize}
                    className="mt-4"
                    disabled={isInitializing}
                  >
                    {isInitializing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Standard-FAQ laden
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* FAQ Accordion */}
          {!loading && !error && filteredItems.length > 0 && (
            <>
              {selectedCategory === "all" ? (
                // Gruppiert nach Kategorie
                Object.entries(groupedItems).map(([category, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <Card key={category}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {CATEGORY_ICONS[category as FAQCategory]}
                          {CATEGORY_LABELS[category as FAQCategory]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {items.map((item) => (
                            <AccordionItem key={item.id} value={item.id}>
                              <AccordionTrigger className="text-left">
                                <div className="flex items-center gap-2 flex-1 pr-4">
                                  {!item.isActive && showAdminView && (
                                    <Badge variant="secondary" className="text-xs">
                                      Inaktiv
                                    </Badge>
                                  )}
                                  <span className={!item.isActive ? "text-muted-foreground" : ""}>
                                    {item.question}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="text-muted-foreground whitespace-pre-wrap">
                                  {item.answer}
                                </div>
                                {showAdminView && isAdmin && (
                                  <div className="flex gap-2 mt-4 pt-4 border-t">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Pencil className="h-4 w-4 mr-1" />
                                      Bearbeiten
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleToggleActive(item)}
                                    >
                                      {item.isActive ? (
                                        <>
                                          <EyeOff className="h-4 w-4 mr-1" />
                                          Deaktivieren
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="h-4 w-4 mr-1" />
                                          Aktivieren
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setDeleteConfirmId(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Löschen
                                    </Button>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                // Einzelne Kategorie
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {CATEGORY_ICONS[selectedCategory]}
                      {CATEGORY_LABELS[selectedCategory]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {filteredItems.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger className="text-left">
                            <div className="flex items-center gap-2 flex-1 pr-4">
                              {!item.isActive && showAdminView && (
                                <Badge variant="secondary" className="text-xs">
                                  Inaktiv
                                </Badge>
                              )}
                              <span className={!item.isActive ? "text-muted-foreground" : ""}>
                                {item.question}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="text-muted-foreground whitespace-pre-wrap">
                              {item.answer}
                            </div>
                            {showAdminView && isAdmin && (
                              <div className="flex gap-2 mt-4 pt-4 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleActive(item)}
                                >
                                  {item.isActive ? (
                                    <>
                                      <EyeOff className="h-4 w-4 mr-1" />
                                      Deaktivieren
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-4 w-4 mr-1" />
                                      Aktivieren
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDeleteConfirmId(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Löschen
                                </Button>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Kontakt */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <Users className="h-8 w-8 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Noch Fragen?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wenn Sie eine Frage haben, die hier nicht beantwortet wird,
                    wenden Sie sich an Ihren PICTS-Admin oder den
                    System-Administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Frage bearbeiten" : "Neue Frage erstellen"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Bearbeiten Sie die FAQ-Frage und -Antwort."
                  : "Erstellen Sie eine neue FAQ-Frage und -Antwort."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategorie</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: FAQCategory) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {CATEGORY_ICONS[key as FAQCategory]}
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Frage</label>
                <Input
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="Wie kann ich...?"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Antwort</label>
                <Textarea
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                  placeholder="Die Antwort auf die Frage..."
                  rows={6}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.question || !formData.answer}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingItem ? "Speichern" : "Erstellen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deleteConfirmId}
          onOpenChange={() => setDeleteConfirmId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>FAQ-Eintrag löschen?</DialogTitle>
              <DialogDescription>
                Möchten Sie diesen FAQ-Eintrag wirklich dauerhaft löschen? Diese
                Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
