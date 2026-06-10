import { PageShell } from "@/components/ops-ui";
import { SparePartForm } from "../SparePartForm";

export default function CreateSparePartPage() {
  return (
    <PageShell>
      <SparePartForm mode="create" />
    </PageShell>
  );
}
