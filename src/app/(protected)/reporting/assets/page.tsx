"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AssetListSkeleton,
  AssetMachineCard,
  summarizePageAssetValue,
} from "@/components/assets/AssetMachineCard";
import { DocumentUploadList } from "@/components/assets/DocumentUploadList";
import { usePermissions } from "@/components/permission-provider";
import {
  FinanceHero,
  FinanceSectionTitle,
} from "@/components/reporting/finance-utils";
import { getApiErrorDetails } from "@/lib/api/core";
import { getAuthToken } from "@/lib/auth-session";
import {
  MACHINE_CATEGORY_OPTIONS,
  MACHINE_STATUS_OPTIONS,
  createMachine,
  deleteMachine,
  listMachines,
  updateMachine,
  type MachineCategory,
  type MachineDocumentRecord,
  type MachineRecord,
  type MachineStatus,
} from "@/lib/api/machines";
import { REPORTING_CURRENCY, formatEgp } from "@/lib/currencies";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InlineMessage,
  InputGroup,
  PageShell,
  PaginationControls,
  SearchableSelect,
  SurfaceCard,
} from "@/components/ops-ui";

type MachineFormState = {
  name: string;
  category: MachineCategory;
  serial_number: string;
  location: string;
  purchase_date: string;
  purchase_cost: string;
  status: MachineStatus;
  notes: string;
};

const initialFormState: MachineFormState = {
  name: "",
  category: "machine",
  serial_number: "",
  location: "",
  purchase_date: "",
  purchase_cost: "",
  status: "active",
  notes: "",
};

export default function AssetsPage() {
  const permissions = usePermissions();
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MachineCategory | "">("");
  const [status, setStatus] = useState<MachineStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineRecord | null>(null);
  const [form, setForm] = useState<MachineFormState>(initialFormState);
  const [documents, setDocuments] = useState<MachineDocumentRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [removeDocumentIds, setRemoveDocumentIds] = useState<number[]>([]);

  const canCreate = permissions.canCreate("machines");
  const canUpdate = permissions.canUpdate("machines");
  const canDelete = permissions.canDelete("machines");

  const loadMachines = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listMachines(token, {
        page,
        search: search || undefined,
        category,
        status,
      });

      setMachines(result.data);
      setTotalPages(result.last_page || 1);
      setTotalAssets(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status]);

  useEffect(() => {
    void loadMachines();
  }, [loadMachines]);

  function resetEditor() {
    setEditingMachine(null);
    setForm(initialFormState);
    setDocuments([]);
    setRemoveDocumentIds([]);
    setFormError(null);
    setShowForm(false);
  }

  function openEditor(machine?: MachineRecord) {
    if (machine && !canUpdate) return;
    if (!machine && !canCreate) return;

    setShowForm(true);

    if (machine) {
      setEditingMachine(machine);
      setForm({
        name: machine.name,
        category: machine.category,
        serial_number: machine.serial_number ?? "",
        location: machine.location ?? "",
        purchase_date: machine.purchase_date?.slice(0, 10) ?? "",
        purchase_cost:
          machine.purchase_cost != null ? String(machine.purchase_cost) : "",
        status: machine.status,
        notes: machine.notes ?? "",
      });
      setDocuments(machine.documents ?? []);
    } else {
      setEditingMachine(null);
      setForm(initialFormState);
      setDocuments([]);
    }

    setRemoveDocumentIds([]);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError(null);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      if (!form.name.trim()) throw new Error("Asset name is required.");

      const newDocuments = documents.filter((document) => !document.id);
      const payload = {
        name: form.name.trim(),
        category: form.category,
        serial_number: form.serial_number.trim() || undefined,
        location: form.location.trim() || undefined,
        purchase_date: form.purchase_date || undefined,
        purchase_cost: form.purchase_cost ? Number(form.purchase_cost) : null,
        status: form.status,
        notes: form.notes.trim() || undefined,
        documents: newDocuments.map(({ type, url, public_id, filename, mime_type }) => ({
          type,
          url,
          public_id,
          filename,
          mime_type,
        })),
        remove_document_ids: removeDocumentIds,
      };

      if (editingMachine) {
        await updateMachine(token, editingMachine.id, payload);
      } else {
        await createMachine(token, payload);
      }

      resetEditor();
      await loadMachines();
    } catch (err) {
      const { message } = getApiErrorDetails(err, "Failed to save asset.");
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!canDelete) {
      setError("You do not have permission to delete assets.");
      return;
    }

    if (!confirm("Delete this asset and all attached documents?")) return;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteMachine(token, id);
      if (editingMachine?.id === id) resetEditor();
      await loadMachines();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset.");
    }
  }

  const invoiceDocuments = documents.filter((document) => document.type === "invoice");
  const contractDocuments = documents.filter((document) => document.type === "contract");

  return (
    <PageShell>
      <FinanceHero
        title="Assets"
        description=""
        active="assets"
        actions={
          canCreate ? (
            <ActionButton tone="primary" onClick={() => openEditor()}>
              Add Asset
            </ActionButton>
          ) : null
        }
      />

      {error ? <InlineMessage tone="danger">{error}</InlineMessage> : null}

      <SurfaceCard>
        <FilterBar>
          <InputGroup label="Search" className="md:col-span-4">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Name, serial, location..."
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Category" className="md:col-span-4">
            <SearchableSelect
              value={category}
              onChange={(value) => {
                setPage(1);
                setCategory(value as MachineCategory | "");
              }}
              options={[
                { value: "", label: "All categories" },
                ...MACHINE_CATEGORY_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
              className="form-input-base"
            />
          </InputGroup>
          <InputGroup label="Status" className="md:col-span-4">
            <SearchableSelect
              value={status}
              onChange={(value) => {
                setPage(1);
                setStatus(value as MachineStatus | "");
              }}
              options={[
                { value: "", label: "All statuses" },
                ...MACHINE_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
              className="form-input-base"
            />
          </InputGroup>
        </FilterBar>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard>
          {loading && machines.length === 0 ? (
            <AssetListSkeleton />
          ) : machines.length === 0 ? (
            <EmptyState
              title="No assets yet"
              description="Add machines, equipment, or vehicles and attach their invoices and contracts."
              action={
                canCreate ? (
                  <ActionButton tone="primary" onClick={() => openEditor()}>
                    Add Asset
                  </ActionButton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <FinanceSectionTitle
                title="Registered assets"
                description="Track purchase cost, location, and supporting documents for each asset."
                actions={
                  <span className="form-chip">
                    {totalAssets} total · {formatEgp(summarizePageAssetValue(machines))}{" "}
                    on this page
                  </span>
                }
              />

              <div className="space-y-3">
                {machines.map((machine) => (
                  <AssetMachineCard
                    key={machine.id}
                    machine={machine}
                    isActive={editingMachine?.id === machine.id}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={() => openEditor(machine)}
                    onDelete={() => void handleDelete(machine.id)}
                  />
                ))}
              </div>

              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                onPageChange={setPage}
              />
            </div>
          )}
        </SurfaceCard>

        {(canCreate || canUpdate) && showForm ? (
          <SurfaceCard className="xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-on-surface">
                {editingMachine ? "Edit asset" : "Add asset"}
              </h2>
              <ActionButton variant="outline" onClick={resetEditor}>
                Cancel
              </ActionButton>
            </div>

            {formError ? (
              <InlineMessage tone="danger">{formError}</InlineMessage>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
              <InputGroup label="Name" className="md:col-span-2">
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="form-input-base"
                  placeholder="CNC machine, lift, delivery van..."
                />
              </InputGroup>

              <InputGroup label="Category">
                <SearchableSelect
                  value={form.category}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      category: value as MachineCategory,
                    }))
                  }
                  options={[...MACHINE_CATEGORY_OPTIONS]}
                  className="form-input-base"
                />
              </InputGroup>

              <InputGroup label="Status">
                <SearchableSelect
                  value={form.status}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as MachineStatus,
                    }))
                  }
                  options={[...MACHINE_STATUS_OPTIONS]}
                  className="form-input-base"
                />
              </InputGroup>

              <InputGroup label="Serial Number">
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serial_number: event.target.value,
                    }))
                  }
                  className="form-input-base"
                />
              </InputGroup>

              <InputGroup label="Location">
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className="form-input-base"
                />
              </InputGroup>

              <InputGroup label="Purchase Date">
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      purchase_date: event.target.value,
                    }))
                  }
                  className="form-input-base"
                />
              </InputGroup>

              <InputGroup label={`Purchase Cost (${REPORTING_CURRENCY})`}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.purchase_cost}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      purchase_cost: event.target.value,
                    }))
                  }
                  className="form-input-base"
                />
              </InputGroup>

              <InputGroup label="Notes" className="md:col-span-2">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="form-input-base min-h-24"
                />
              </InputGroup>

              <div className="md:col-span-2 space-y-4">
                <DocumentUploadList
                  type="invoice"
                  label="Invoices"
                  documents={invoiceDocuments}
                  disabled={saving}
                  onError={setFormError}
                  onChange={(next, removedId) => {
                    setDocuments((current) => [
                      ...next,
                      ...current.filter((document) => document.type === "contract"),
                    ]);
                    if (removedId) {
                      setRemoveDocumentIds((current) => [...current, removedId]);
                    }
                  }}
                />
                <DocumentUploadList
                  type="contract"
                  label="Contracts"
                  documents={contractDocuments}
                  disabled={saving}
                  onError={setFormError}
                  onChange={(next, removedId) => {
                    setDocuments((current) => [
                      ...current.filter((document) => document.type === "invoice"),
                      ...next,
                    ]);
                    if (removedId) {
                      setRemoveDocumentIds((current) => [...current, removedId]);
                    }
                  }}
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <ActionButton type="submit" tone="primary" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingMachine
                      ? "Update Asset"
                      : "Create Asset"}
                </ActionButton>
              </div>
            </form>
          </SurfaceCard>
        ) : canCreate ? (
          <SurfaceCard className="xl:sticky xl:top-24 xl:self-start">
            <EmptyState
              title="Create a new asset"
              description={`Register a machine or piece of equipment with invoices and contracts. Costs are stored in ${REPORTING_CURRENCY}.`}
              action={
                <ActionButton tone="primary" onClick={() => openEditor()}>
                  Add Asset
                </ActionButton>
              }
            />
          </SurfaceCard>
        ) : null}
      </div>
    </PageShell>
  );
}
