import { PageShell, PageHero } from "@/components/ops-ui";
import { BikeForm } from "../BikeForm";

export default function CreateBikePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Showroom Inventory"
        title="Add Showroom Bike"
        description="Launch a new showroom listing by defining the bike identity, pricing strategy, and initial operational status."
      />
      <BikeForm mode="create" />
    </PageShell>
  );
}
