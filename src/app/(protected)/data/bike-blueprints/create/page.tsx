import { PageShell, PageHero } from "@/components/ops-ui";
import { BlueprintForm } from "../BlueprintForm";

export default function CreateBlueprintPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Add Bike Blueprint"
        description="Establish a new golden record for a motorcycle model, which will act as the anchor for all future inventory and parts."
      />
      <BlueprintForm mode="create" />
    </PageShell>
  );
}
