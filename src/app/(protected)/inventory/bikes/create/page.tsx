import { PageShell, PageHero } from "@/components/ops-ui";
import { BikeForm } from "../BikeForm";

export default function CreateBikePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Showroom Inventory"
        title="Add Showroom Bike"
      />
      <BikeForm mode="create" />
    </PageShell>
  );
}
