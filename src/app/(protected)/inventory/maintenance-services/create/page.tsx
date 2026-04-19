"use client";

import { ServiceForm } from "../ServiceForm";
import { PageShell } from "@/components/ops-ui";

export default function CreateServicePage() {
  return (
    <PageShell>
      <ServiceForm mode="create" />
    </PageShell>
  );
}
