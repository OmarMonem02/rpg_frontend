import { PageShell, PageHero } from "@/components/ops-ui";
import { SparePartForm } from "../SparePartForm";

export default function CreateSparePartPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Inventory Control" title="Add Spare Part" />
      <SparePartForm mode="create" />
    </PageShell>
  );
}
