"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import { PageShell, SearchableSelect } from "@/components/ops-ui";
import { getAuthToken } from "@/lib/auth-session";
import {
  assignSparePartToBikeBlueprint,
  getBikeBlueprint,
  listBikeBlueprintSpareParts,
  listBrands,
  listSparePartCategories,
  listSpareParts,
  removeSparePartFromBikeBlueprint,
  type BikeBlueprintRecord,
  type BlueprintSparePartRowRecord,
  type BrandRecord,
  type CreateSparePartPayload,
  type SparePartCategoryRecord,
  type SparePartRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import { CURRENCY_SELECT_OPTIONS, toPricingCurrency } from "@/lib/currencies";

type ModalMode = "single" | "bulk" | "create" | null;

function BlueprintQuickAssignModal({
  title,
  description,
  isOpen,
  searchValue,
  onSearchChange,
  items,
  selectedIds,
  multiple = false,
  isLoading,
  onClose,
  onToggleItem,
  onSubmit,
}: {
  title: string;
  description: string;
  isOpen: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  items: SparePartRecord[];
  selectedIds: number[];
  multiple?: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onToggleItem: (id: number) => void;
  onSubmit: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="form-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4 py-5">
      <div className="form-modal-shell max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] p-4 md:p-6">
        <div className="mb-5 rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="form-chip">{multiple ? "Bulk Assign" : "Quick Assign"}</span>
            <span className="form-chip">{selectedIds.length} selected</span>
          </div>
          <h1 className="text-display-md font-semibold text-on-surface">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr]">
          <section className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low p-4">
            <div className="mb-4">
              <label className="label-caps">Find spare parts</label>
              <input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by name or SKU..."
                className="form-input-base mt-2"
              />
            </div>

            <div className="grid gap-3">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-outline-variant/10 bg-surface p-6 text-center text-sm text-on-surface-variant">
                  No spare parts match this search.
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggleItem(item.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary/30 bg-primary-container text-on-primary-container"
                          : "border-outline-variant/12 bg-surface hover:border-outline-variant/25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-medium">{item.name}</h2>
                          <p className="mt-1 text-xs opacity-80">{item.sku}</p>
                        </div>
                        <span className={`form-chip ${isSelected ? "border-primary/20 bg-surface-container-lowest text-on-primary-container" : ""}`}>
                          {isSelected ? "Selected" : multiple ? "Add" : "Choose"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="form-chip">
                          {item.sale_price} {item.currency_pricing}
                        </span>
                        <span className="form-chip">Stock {item.stock_quantity}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <aside className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Selection summary</p>
            <h2 className="mt-1 text-lg font-semibold text-on-surface">
              {selectedIds.length === 0 ? "No spare parts selected" : `${selectedIds.length} spare part${selectedIds.length === 1 ? "" : "s"} ready`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              {multiple
                ? "Use this flow to link several existing spare parts in one action."
                : "Choose one existing spare part to assign to this blueprint."}
            </p>

            <div className="mt-5 space-y-3">
              {selectedIds.slice(0, 5).map((id) => {
                const part = items.find((item) => item.id === id);
                if (!part) return null;

                return (
                  <div key={id} className="rounded-xl border border-outline-variant/10 bg-surface px-3 py-2">
                    <p className="text-sm font-medium text-on-surface">{part.name}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{part.sku}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onSubmit}
                disabled={selectedIds.length === 0 || isLoading}
                className="rounded-xl bg-primary px-5 py-3 font-medium text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Saving..." : multiple ? "Assign Selected" : "Assign Spare Part"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-xl border border-outline-variant/20 bg-surface px-5 py-3 font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function BikeBlueprintSparePartsPage() {
  const params = useParams<{ id: string }>();
  const blueprintId = Number(params.id);

  const [blueprint, setBlueprint] = useState<BikeBlueprintRecord | null>(null);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [categories, setCategories] = useState<SparePartCategoryRecord[]>([]);
  const [assignedRows, setAssignedRows] = useState<BlueprintSparePartRowRecord[]>([]);
  const [availableParts, setAvailableParts] = useState<SparePartRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [brandFilter, setBrandFilter] = useState<number | "">("");
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedPartIds, setSelectedPartIds] = useState<number[]>([]);
  const [createAssignError, setCreateAssignError] = useState<string | null>(null);

  const blueprintLabel = useMemo(() => {
    if (!blueprint) return "Blueprint";
    const brandName = brands.find((brand) => brand.id === blueprint.brand_id)?.name ?? "Unknown Brand";
    return `${brandName} ${blueprint.model} ${blueprint.year}`;
  }, [blueprint, brands]);

  const loadAssignedRows = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [blueprintResult, rowsResult] = await Promise.all([
        getBikeBlueprint(token, blueprintId),
        listBikeBlueprintSpareParts(token, blueprintId, page, {
          category_id: categoryFilter ? Number(categoryFilter) : undefined,
          brand_id: brandFilter ? Number(brandFilter) : undefined,
          search: searchFilter || undefined,
        }),
      ]);

      setBlueprint(blueprintResult);
      setAssignedRows(rowsResult.items);
      setTotalPages(rowsResult.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blueprint spare parts");
    } finally {
      setLoading(false);
    }
  }, [blueprintId, page, categoryFilter, brandFilter, searchFilter]);

  const loadSupportData = async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [brandsResult, categoriesResult] = await Promise.all([
        fetchAllPages((p) => listBrands(token, p, { type: "spare_parts" })),
        fetchAllPages((p) => listSparePartCategories(token, p)),
      ]);

      setBrands(brandsResult);
      setCategories(categoriesResult);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAvailableParts = async (search = "") => {
    try {
      setPickerLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSpareParts(token, 1, {
        search: search || undefined,
      });
      setAvailableParts(result.items);
    } catch (err) {
      console.error(err);
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    loadSupportData();
  }, []);

  useEffect(() => {
    if (!Number.isFinite(blueprintId)) return;
    loadAssignedRows();
  }, [blueprintId, loadAssignedRows]);

  useEffect(() => {
    if (!modalMode || modalMode === "create") return;
    loadAvailableParts(pickerSearch);
  }, [modalMode, pickerSearch]);

  const resetModalState = () => {
    setModalMode(null);
    setSelectedPartIds([]);
    setPickerSearch("");
    setCreateAssignError(null);
  };

  const openAssignModal = (mode: Exclude<ModalMode, "create" | null>) => {
    setSelectedPartIds([]);
    setPickerSearch("");
    setModalMode(mode);
  };

  const handleToggleSelectedPart = (id: number) => {
    setSelectedPartIds((current) => {
      if (modalMode === "single") {
        return current[0] === id ? [] : [id];
      }

      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const handleAssignExisting = async () => {
    try {
      setSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      if (modalMode === "single" && selectedPartIds[0]) {
        await assignSparePartToBikeBlueprint(token, blueprintId, { spare_part_id: selectedPartIds[0] });
      } else if (modalMode === "bulk" && selectedPartIds.length > 0) {
        await assignSparePartToBikeBlueprint(token, blueprintId, { spare_part_ids: selectedPartIds });
      }

      await loadAssignedRows();
      resetModalState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign spare part");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndAssign = async (formData: Record<string, unknown>) => {
    try {
      setSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateSparePartPayload = {
        name: String(formData.name),
        sku: String(formData.sku),
        image: formData.image ? String(formData.image) : undefined,
        image_public_id: formData.image_public_id
          ? String(formData.image_public_id)
          : undefined,
        part_number: formData.part_number ? String(formData.part_number) : undefined,
        stock_quantity: formData.stock_quantity ? Number(formData.stock_quantity) : 0,
        low_stock_alarm: formData.low_stock_alarm ? Number(formData.low_stock_alarm) : 0,
        spare_parts_category_id: Number(formData.spare_parts_category_id),
        brand_id: Number(formData.brand_id),
        currency_pricing: toPricingCurrency(String(formData.currency_pricing)),
        cost_currency: toPricingCurrency(String(formData.cost_currency)),
        sale_currency: toPricingCurrency(String(formData.sale_currency)),
          cost_price: Number(formData.cost_price),
        sale_price: Number(formData.sale_price),
        max_discount_type: String(formData.max_discount_type) as "fixed" | "percentage",
        max_discount_value: Number(formData.max_discount_value),
        universal: formData.universal === true,
        notes: formData.notes ? String(formData.notes) : undefined,
      };

      await assignSparePartToBikeBlueprint(token, blueprintId, {
        spare_part_data: payload,
      });

      await loadAssignedRows();
      resetModalState();
    } catch (err) {
      setCreateAssignError(err instanceof Error ? err.message : "Failed to create and assign spare part");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (sparePartId: number) => {
    if (!confirm("Remove this spare part assignment from the current blueprint?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await removeSparePartFromBikeBlueprint(token, blueprintId, sparePartId);
      await loadAssignedRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove spare part assignment");
    }
  };

  const createAssignFields: FieldConfig[] = [
    {
      name: "name",
      label: "Part Name",
      type: "text",
      required: true,
      section: "Basic Info",
      sectionDescription: "Start with the spare part identity your team will recognize immediately.",
      description: "Use the customer-facing or warehouse-recognized part name.",
      placeholder: "Enter part name",
      helperTone: "featured",
      summaryValue: ({ value }) => (value ? String(value) : undefined),
    },
    {
      name: "sku",
      label: "SKU",
      type: "text",
      required: true,
      section: "Basic Info",
      description: "Keep the SKU unique and easy to search later.",
      placeholder: "e.g., SP-001",
      summaryValue: ({ value }) => (value ? `SKU ${String(value)}` : undefined),
    },
    {
      name: "part_number",
      label: "Part Number",
      type: "text",
      section: "Basic Info",
      description: "Add the manufacturer number if your team uses it.",
      placeholder: "e.g., MPN-302",
    },
    {
      name: "image",
      label: "Spare Part Photo",
      type: "image",
      section: "Basic Info",
      description: "Upload a clear part photo before assigning it to this blueprint.",
      imagePublicIdField: "image_public_id",
      uploadFolder: "rpg-system/spare-parts",
      span: 2,
    },
    {
      name: "spare_parts_category_id",
      label: "Category",
      type: "select",
      required: true,
      section: "Classification",
      sectionDescription: "Place the part under the right category and source brand.",
      description: "Choose the main spare-parts category.",
      options: categories.map((category) => ({ value: category.id, label: category.name })),
    },
    {
      name: "brand_id",
      label: "Brand",
      type: "select",
      required: true,
      section: "Classification",
      description: "Pick the source brand used in purchasing and reporting.",
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
    {
      name: "stock_quantity",
      label: "Stock Quantity",
      type: "number",
      section: "Inventory",
      sectionDescription: "Define the opening stock levels and alert threshold.",
      description: "Add the opening stock count for this part.",
      placeholder: "0",
      min: 0,
      helperTone: "featured",
    },
    {
      name: "low_stock_alarm",
      label: "Low Stock Alarm",
      type: "number",
      section: "Inventory",
      description: "Set when the team should treat this part as low stock.",
      placeholder: "5",
      min: 0,
    },
    {
      name: "cost_price",
      label: "Cost Price",
      type: "number",
      required: true,
      section: "Pricing",
      sectionDescription: "Capture pricing and sales flexibility before the part goes live.",
      description: "Enter your landed or purchase cost per unit.",
      placeholder: "0.00",
      min: 0,
      step: "0.01",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}` : undefined,
    },
    {
      name: "sale_price",
      label: "Sale Price",
      type: "number",
      required: true,
      section: "Pricing",
      description: "Set the selling price your staff should use.",
      placeholder: "0.00",
      min: 0,
      step: "0.01",
      helperTone: "featured",
      summaryValue: ({ value, formData }) =>
        value !== "" && value !== undefined ? `${String(value)} ${String(formData.currency_pricing ?? "EGP")}` : undefined,
    },
    {
      name: "currency_pricing",
      label: "Currency",
      type: "select",
      required: true,
      section: "Pricing",
      description: "Choose the currency shown in inventory and sales.",
      options: CURRENCY_SELECT_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      value: "EGP",
    },
    {
      name: "max_discount_type",
      label: "Discount Type",
      type: "select",
      required: true,
      section: "Compatibility",
      sectionDescription: "Confirm how this part should behave inside the current blueprint context.",
      description: "Choose whether the discount cap is percentage-based or fixed.",
      options: [
        { value: "percentage", label: "Percentage (%)" },
        { value: "fixed", label: "Fixed Amount" },
      ],
      value: "percentage",
    },
    {
      name: "max_discount_value",
      label: "Max Discount Value",
      type: "number",
      section: "Compatibility",
      description: "Set the highest discount your team can apply.",
      placeholder: "0",
      min: 0,
      step: "0.01",
    },
    {
      name: "universal",
      label: "Universal Part",
      type: "toggle",
      section: "Compatibility",
      description: "Enable this when the part should work beyond the current blueprint-specific use case.",
      helperTone: "featured",
    },
    {
      name: "blueprint_context",
      label: "Assigned Blueprint",
      type: "text",
      section: "Compatibility",
      description: "This new spare part will be assigned to the current blueprint after creation.",
      value: blueprintLabel,
      disabled: true,
      span: 2,
      summaryValue: ({ value }) => (value ? String(value) : undefined),
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
      section: "Notes",
      sectionDescription: "Capture fitment notes, supplier remarks, or anything useful for the team later.",
      description: "Add compatibility details, supplier notes, or internal remarks.",
      placeholder: "e.g., Works with front disc setup only...",
      rows: 3,
    },
  ];

  return (
    <PageShell>
      <section className="overflow-hidden rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-low shadow-ambient">
        <div className="space-y-4 p-5 md:p-6">
          <Link
            href="/data/bike-blueprints"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <span aria-hidden="true">←</span>
            Back to Bike Blueprints
          </Link>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="form-chip">Blueprint Spare Parts</span>
                <span className="form-chip">{assignedRows.length} visible</span>
              </div>
              <h1 className="text-display-md font-semibold text-on-surface">{blueprintLabel}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Manage the spare parts that match this bike blueprint. You can assign existing items quickly, bulk link several parts, or create and assign a new spare part through the guided flow.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => openAssignModal("single")}
                className="rounded-2xl border border-outline-variant/15 bg-surface px-4 py-4 text-left transition-colors hover:border-outline-variant/30"
              >
                <p className="text-sm font-semibold text-on-surface">Assign Existing</p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">Link one existing spare part through a quick searchable picker.</p>
              </button>
              <button
                type="button"
                onClick={() => openAssignModal("bulk")}
                className="rounded-2xl border border-outline-variant/15 bg-surface px-4 py-4 text-left transition-colors hover:border-outline-variant/30"
              >
                <p className="text-sm font-semibold text-on-surface">Bulk Assign</p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant">Select several existing spare parts and assign them in one action.</p>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateAssignError(null);
                  setModalMode("create");
                }}
                className="rounded-2xl bg-primary px-4 py-4 text-left text-on-primary transition-opacity hover:opacity-90"
              >
                <p className="text-sm font-semibold">Create & Assign</p>
                <p className="mt-1 text-xs leading-5 text-on-primary/80">Create a new spare part with the guided premium flow and link it immediately.</p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <div className="grid gap-3 rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low p-4 md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchFilter}
          onChange={(event) => {
            setSearchFilter(event.target.value);
            setPage(1);
          }}
          className="form-input-base"
        />
        <SearchableSelect
          value={categoryFilter}
          onChange={(v) => {
            setCategoryFilter(v ? Number(v) : "");
            setPage(1);
          }}
          placeholder="All Categories"
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          className="form-input-base"
        />
        <SearchableSelect
          value={brandFilter}
          onChange={(v) => {
            setBrandFilter(v ? Number(v) : "");
            setPage(1);
          }}
          placeholder="All Brands"
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
          className="form-input-base"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : assignedRows.length === 0 ? (
        <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container p-10 text-center">
          <h2 className="text-xl font-semibold text-on-surface">No spare parts assigned yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
            Start by assigning an existing spare part or create a new one directly for this blueprint.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">SKU</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Brand</th>
                <th className="px-4 py-3 text-center font-semibold text-on-surface">Stock</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Price</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignedRows.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{row.spare_part?.name ?? `Spare Part #${row.spare_part_id}`}</td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.spare_part?.sku ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{row.spare_part?.category?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{row.spare_part?.brand?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-center text-on-surface">{row.spare_part?.stock_quantity ?? 0}</td>
                  <td className="px-4 py-3 text-on-surface">
                    {row.spare_part?.sale_price ?? 0} {row.spare_part?.currency_pricing ?? "EGP"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(row.spare_part_id)}
                      className="text-error hover:underline text-xs font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-on-surface-variant">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            className="rounded px-3 py-2 text-sm hover:bg-surface-container disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <BlueprintQuickAssignModal
        title={modalMode === "bulk" ? "Bulk Assign Spare Parts" : "Assign Existing Spare Part"}
        description={
          modalMode === "bulk"
            ? "Choose multiple existing spare parts to attach to the current blueprint in one pass."
            : "Choose one existing spare part and link it directly to the current blueprint."
        }
        isOpen={modalMode === "single" || modalMode === "bulk"}
        searchValue={pickerSearch}
        onSearchChange={setPickerSearch}
        items={availableParts}
        selectedIds={selectedPartIds}
        multiple={modalMode === "bulk"}
        isLoading={pickerLoading || submitting}
        onClose={resetModalState}
        onToggleItem={handleToggleSelectedPart}
        onSubmit={handleAssignExisting}
      />

      <EntityFormModal
        title="Create & Assign Spare Part"
        description={`Create a new spare part with the guided flow, then assign it directly to ${blueprintLabel}.`}
        heroLabel="Blueprint Assignment"
        fields={createAssignFields}
        isOpen={modalMode === "create"}
        isLoading={submitting}
        error={createAssignError || undefined}
        onClose={resetModalState}
        onSubmit={handleCreateAndAssign}
        submitLabel="Create & Assign"
      />
    </PageShell>
  );
}
