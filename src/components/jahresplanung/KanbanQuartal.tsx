"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Plus, Circle, Diamond, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { JahresplanEinheit, JahresplanStatus } from "@/types";

// Status-Labels
const STATUS_LABELS: Record<JahresplanStatus, string> = {
  geplant: "Geplant",
  durchgefuehrt: "Durchgeführt",
  reflektiert: "Reflektiert",
};

const STATUS_COLORS: Record<JahresplanStatus, string> = {
  geplant: "bg-blue-100 text-blue-700 border-blue-200",
  durchgefuehrt: "bg-yellow-100 text-yellow-700 border-yellow-200",
  reflektiert: "bg-green-100 text-green-700 border-green-200",
};

interface KanbanQuartalProps {
  einheiten: JahresplanEinheit[];
  schuljahr: string;
  quartal: number;
  teamId?: string;
  onEinheitUpdate?: (id: string, data: Record<string, unknown>) => Promise<void>;
}

// Sortable Einheit Card
function SortableEinheitCard({
  einheit,
  schuljahr,
  farbe,
}: {
  einheit: JahresplanEinheit;
  schuljahr: string;
  farbe: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: einheit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const kwSpan = einheit.zeitraumEnde - einheit.zeitraumStart + 1;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="rounded-lg border p-2.5 cursor-pointer hover:shadow-md transition-shadow group"
        style={{
          backgroundColor: `${farbe}08`,
          borderColor: `${farbe}30`,
        }}
      >
        <div className="flex items-start gap-1.5">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Content */}
          <Link
            href={`/dashboard/jahresplanung/einheit/${einheit.id}?schuljahr=${schuljahr}`}
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-medium truncate">{einheit.titel}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              KW {einheit.zeitraumStart}–{einheit.zeitraumEnde}
              <span className="ml-1 text-gray-400">
                ({kwSpan} {kwSpan === 1 ? "Wo" : "Wo"})
              </span>
            </p>

            {/* Lernziele Preview */}
            {einheit.lernziele && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                {einheit.lernziele}
              </p>
            )}

            {/* Status + Beurteilungen */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[einheit.status]}`}
              >
                {STATUS_LABELS[einheit.status]}
              </Badge>

              {einheit.beurteilungen?.map((b, i) =>
                b.typ === "formativ" ? (
                  <Circle
                    key={i}
                    className="h-3 w-3 fill-blue-500 text-blue-500"
                  />
                ) : (
                  <Diamond
                    key={i}
                    className="h-3 w-3 fill-orange-500 text-orange-500"
                  />
                )
              )}

              {einheit.istPufferwoche && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600">
                  Puffer
                </Badge>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Static card for drag overlay
function EinheitCardOverlay({
  einheit,
  farbe,
}: {
  einheit: JahresplanEinheit;
  farbe: string;
}) {
  return (
    <div
      className="rounded-lg border p-2.5 shadow-lg"
      style={{
        backgroundColor: `${farbe}15`,
        borderColor: `${farbe}50`,
        width: 220,
      }}
    >
      <p className="text-sm font-medium truncate">{einheit.titel}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        KW {einheit.zeitraumStart}–{einheit.zeitraumEnde}
      </p>
    </div>
  );
}

export default function KanbanQuartal({
  einheiten,
  schuljahr,
  quartal,
  teamId,
  onEinheitUpdate,
}: KanbanQuartalProps) {
  const teamParam = teamId ? `&teamId=${teamId}` : "";
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group einheiten by fachbereichId
  const columns = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        farbe: string;
        einheiten: JahresplanEinheit[];
      }
    >();

    einheiten.forEach((e) => {
      if (!map.has(e.fachbereichId)) {
        map.set(e.fachbereichId, {
          id: e.fachbereichId,
          name: e.fachbereichName || e.fachbereichId,
          farbe: e.fachbereichFarbe || "#6b7280",
          einheiten: [],
        });
      }
      map.get(e.fachbereichId)!.einheiten.push(e);
    });

    // Sort einheiten within each column by zeitraumStart
    map.forEach((col) => {
      col.einheiten.sort((a, b) => a.zeitraumStart - b.zeitraumStart);
    });

    // Sort columns alphabetically by name
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );
  }, [einheiten]);

  // Find active einheit for drag overlay
  const activeEinheit = useMemo(() => {
    if (!activeId) return null;
    return einheiten.find((e) => e.id === activeId) || null;
  }, [activeId, einheiten]);

  const activeColumn = useMemo(() => {
    if (!activeEinheit) return null;
    return columns.find((c) => c.id === activeEinheit.fachbereichId) || null;
  }, [activeEinheit, columns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      // Find which column these items belong to
      const activeItem = einheiten.find((e) => e.id === active.id);
      const overItem = einheiten.find((e) => e.id === over.id);

      if (!activeItem || !overItem) return;
      if (activeItem.fachbereichId !== overItem.fachbereichId) return;

      // Reorder within the same column: swap sortOrder or KW positions
      if (onEinheitUpdate) {
        // Swap zeitraumStart values to reorder visually
        // This effectively moves the unit to the other unit's time position
        await onEinheitUpdate(activeItem.id, {
          sortOrder: overItem.sortOrder || 0,
        });
      }
    },
    [einheiten, onEinheitUpdate]
  );

  // Summarize stats
  const totalWochen = useMemo(() => {
    const kwSet = new Set<number>();
    einheiten.forEach((e) => {
      for (let kw = e.zeitraumStart; kw <= e.zeitraumEnde; kw++) {
        kwSet.add(kw);
      }
    });
    return kwSet.size;
  }, [einheiten]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns.length + 1}, minmax(200px, 1fr))`,
            minWidth: `${(columns.length + 1) * 220}px`,
          }}
        >
          {/* Fachbereich Columns */}
          {columns.map((col) => (
            <div key={col.id} className="min-w-[200px]">
              {/* Column Header */}
              <div
                className="flex items-center gap-2 mb-3 pb-2 border-b-2"
                style={{ borderColor: col.farbe }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: col.farbe }}
                />
                <span className="font-medium text-sm truncate">
                  {col.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  ({col.einheiten.length})
                </span>
              </div>

              {/* Sortable Cards */}
              <SortableContext
                items={col.einheiten.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {col.einheiten.map((einheit) => (
                    <SortableEinheitCard
                      key={einheit.id}
                      einheit={einheit}
                      schuljahr={schuljahr}
                      farbe={col.farbe}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Add Einheit Button */}
              <Link
                href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&quartal=${quartal}&fachbereichId=${col.id}${teamParam}`}
              >
                <div className="border border-dashed rounded-lg p-2 text-center hover:bg-gray-50 cursor-pointer mt-2 transition-colors">
                  <Plus className="h-4 w-4 mx-auto text-gray-400" />
                </div>
              </Link>
            </div>
          ))}

          {/* "New Fach" Column */}
          <div className="min-w-[200px]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-dashed border-gray-300">
              <span className="font-medium text-sm text-gray-400">
                + Fachbereich
              </span>
            </div>
            <Link
              href={`/dashboard/jahresplanung/einheit/neu?schuljahr=${schuljahr}&quartal=${quartal}${teamParam}`}
            >
              <div className="border border-dashed rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer transition-colors">
                <Plus className="h-6 w-6 mx-auto text-gray-300" />
                <p className="text-xs text-gray-400 mt-1">Neue Einheit</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeEinheit && activeColumn ? (
          <EinheitCardOverlay
            einheit={activeEinheit}
            farbe={activeColumn.farbe}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
