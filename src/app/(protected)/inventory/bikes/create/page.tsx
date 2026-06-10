import { PageShell } from "@/components/ops-ui";
import { BikeForm } from "../BikeForm";

export default function CreateBikePage() {
  return (
    <PageShell>
      <BikeForm mode="create" />
    </PageShell>
  );
}
