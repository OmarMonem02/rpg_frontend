import { PageShell } from "@/components/ops-ui";
import { MaintenancePartForm } from "../MaintenancePartForm";

export default function CreateMaintenancePartPage() {
  return (
    <PageShell>
      <MaintenancePartForm mode="create" />
    </PageShell>
  );
}
