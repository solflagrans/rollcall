import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LinkPendingIndicator } from "@/components/link-pending-indicator";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline">
      <Link href={href}>
        <ArrowLeft aria-hidden="true" />
        {label}
        <LinkPendingIndicator />
      </Link>
    </Button>
  );
}
