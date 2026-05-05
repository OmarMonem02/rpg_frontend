import { PageShell, PageHero } from "@/components/ops-ui";
import { ProductForm } from "../ProductForm";

export default function CreateProductPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Inventory Hub" title="Add New Product" />
      <ProductForm mode="create" />
    </PageShell>
  );
}
