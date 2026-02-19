"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  ImagePlus,
  X,
} from "lucide-react";
import { FAQItem, FAQCategory, FAQMedia } from "@/types";

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
    media: [] as FAQMedia[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Media Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_MEDIA_SIZE_MB = 10;

  const handleMediaUpload = async (file: File) => {
    if (!user) return;

    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      alert("Nur JPEG, PNG, WEBP und GIF Dateien sind erlaubt.");
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      alert(`Datei ist zu gross. Maximum: ${MAX_MEDIA_SIZE_MB}MB`);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
      const storagePath = `faq-media/${user.uid}/${timestamp}_${safeName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            const mediaType = file.type === "image/gif" ? "gif" : "image";

            setFormData((prev) => ({
              ...prev,
              media: [
                ...prev.media,
                { url, storagePath, type: mediaType as "image" | "gif", altText: "" },
              ],
            }));
            resolve();
          }
        );
      });
    } catch (err) {
      console.error("Error uploading media:", err);
      alert("Fehler beim Hochladen der Datei.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }));
  };

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
      media: [],
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
      media: item.media || [],
    });
    setIsDialogOpen(true);
  };

  // Speichern
  const handleSave = async () => {
    if (!user || !formData.question || !formData.answer) return;

    try {
      setIsSaving(true);
      const token = await user.getIdToken();

      const payload = {
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        media: formData.media.length > 0 ? formData.media : undefined,
      };

      if (editingItem) {
        // Update
        const response = await fetch(`/api/faq/${editingItem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
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
          body: JSON.stringify(payload),
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

  // Fehlende FAQ-Einträge ergänzen (für Admins)
  const handleUpdateWithDefaults = async () => {
    if (!user) return;

    try {
      setIsUpdating(true);
      const token = await user.getIdToken();

      const response = await fetch("/api/faq", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Fehler beim Aktualisieren");
      }

      const data = await response.json();
      if (data.count > 0) {
        alert(`${data.count} neue FAQ-Einträge wurden hinzugefügt.`);
      } else {
        alert("Alle Standard-FAQ-Einträge sind bereits vorhanden.");
      }

      loadFAQItems();
    } catch (err) {
      console.error("Error updating FAQ:", err);
      alert(err instanceof Error ? err.message : "Fehler beim Aktualisieren");
    } finally {
      setIsUpdating(false);
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
                  {faqItems.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={handleUpdateWithDefaults}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Fehlende Einträge ergänzen
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
                                {item.media && item.media.length > 0 && (
                                  <div className="mt-4 space-y-3">
                                    {item.media.map((media, idx) => (
                                      <div key={idx} className="rounded-lg overflow-hidden border bg-muted/30">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={media.url}
                                          alt={media.altText || `Screenshot ${idx + 1}`}
                                          className="max-w-full h-auto rounded-lg"
                                          loading="lazy"
                                        />
                                        {media.altText && (
                                          <p className="text-xs text-muted-foreground px-3 py-1.5 italic">
                                            {media.altText}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
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

              {/* Medien-Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bilder / GIFs (optional)</label>
                <p className="text-xs text-muted-foreground">
                  Screenshots oder GIFs zur Veranschaulichung. JPEG, PNG, WEBP, GIF (max. {MAX_MEDIA_SIZE_MB}MB).
                </p>

                {/* Vorhandene Medien */}
                {formData.media.length > 0 && (
                  <div className="space-y-3">
                    {formData.media.map((media, index) => (
                      <div
                        key={index}
                        className="relative border rounded-lg p-2 group"
                      >
                        <div className="flex items-start gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={media.url}
                            alt={media.altText || `Bild ${index + 1}`}
                            className="w-24 h-24 object-cover rounded border"
                          />
                          <div className="flex-1 space-y-2">
                            <Badge variant="secondary" className="text-xs">
                              {media.type === "gif" ? "GIF" : "Bild"}
                            </Badge>
                            <Input
                              value={media.altText || ""}
                              onChange={(e) => {
                                const updated = [...formData.media];
                                updated[index] = { ...updated[index], altText: e.target.value };
                                setFormData({ ...formData, media: updated });
                              }}
                              placeholder="Alt-Text (Beschreibung)..."
                              className="text-xs h-8"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => handleRemoveMedia(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Wird hochgeladen... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleMediaUpload(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4 mr-2" />
                    )}
                    Bild / GIF hinzufügen
                  </Button>
                </div>
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
                disabled={isSaving || isUploading || !formData.question || !formData.answer}
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
