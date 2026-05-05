import { PageShell, PageHero } from "@/components/ops-ui";
import { BlueprintForm } from "../BlueprintForm";

export default function CreateBlueprintPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title="Add Bike Blueprint"
      />
      <BlueprintForm mode="create" />
    </PageShell>
  );
}
