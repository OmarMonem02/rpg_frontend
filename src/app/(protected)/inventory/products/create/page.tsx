import { PageShell } from "@/components/ops-ui";
import { ProductForm } from "../ProductForm";

export default function CreateProductPage() {
  return (
    <PageShell>
      <ProductForm mode="create" />
    </PageShell>
  );
}
