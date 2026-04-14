import { PageShell, PageHero } from "@/components/ops-ui";
import { SparePartForm } from "../SparePartForm";

export default function CreateSparePartPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Control"
        title="Add Spare Part"
        description="Register a new part in the system with full specifications, stock tracking, and bike compatibility."
      />
      <SparePartForm mode="create" />
    </PageShell>
  );
}
