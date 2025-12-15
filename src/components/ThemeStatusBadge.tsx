import { Badge } from "@/components/ui/badge";
import { ThemeStatus } from "@/types";

interface ThemeStatusBadgeProps {
  status: ThemeStatus;
}

export default function ThemeStatusBadge({ status }: ThemeStatusBadgeProps) {
  const variants: Record<
    ThemeStatus,
    { label: string; className: string }
  > = {
    draft: {
      label: "Entwurf",
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    },
    pending_review: {
      label: "In Prüfung",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    approved: {
      label: "Freigegeben",
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    rejected: {
      label: "Abgelehnt",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
  };

  const variant = variants[status];

  return <Badge className={variant.className}>{variant.label}</Badge>;
}
