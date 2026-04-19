import { PageShell, PageHero } from "@/components/ops-ui";
import { ProductForm } from "../ProductForm";

export default function CreateProductPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Hub"
        title="Add New Product"
        description="Expand your catalog by adding a new product with full inventory and pricing controls."
      />
      <ProductForm mode="create" />
    </PageShell>
  );
}
