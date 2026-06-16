"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import { usePermissions } from "@/components/permission-provider";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useGlobalDataRefresh } from "@/hooks/useGlobalDataRefresh";
import { formatCatalogPriceInEGP } from "@/lib/currencies";
import {
  QuickEditActions,
  QuickEditInput,
  combineValidators,
  useQuickEditRow,
  validateNonEmptyName,
  validateNonNegativeNumbers,
  type QuickEditDraft,
} from "@/components/inventory/quick-edit";
import {
  InventoryListTable,
  InventoryListTableBody,
  InventoryListTableElement,
  InventoryListTableError,
  InventoryListTableHead,
  InventoryListTableRow,
  InventoryListTableScroll,
  InventoryListTableTd,
  InventoryListTableTh,
  InventoryListTableToolbar,
  InventoryTableActionDivider,
  InventoryTableActionLink,
  InventoryTableSecondaryActions,
} from "@/components/inventory/list-table";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
  SearchableSelect,
} from "@/components/ops-ui";
import { useTableColumns, type TableColumnDef } from "@/hooks/useTableColumns";
import { ColumnPicker } from "@/components/inventory/ColumnPicker";
import { useTablePageSize } from "@/hooks/useTablePageSize";
import { PageSizeSelect } from "@/components/inventory/PageSizeSelect";

type ServicesColumnId = "name" | "sector" | "price" | "discount" | "created" | "actions";

const SERVICES_COLUMNS: readonly TableColumnDef<ServicesColumnId>[] = [
  { id: "name", label: "Name" },
  { id: "sector", label: "Sector" },
  { id: "price", label: "Price" },
  { id: "discount", label: "Discount" },
  { id: "created", label: "Created" },
  { id: "actions", label: "Actions", required: true },
];
import Link from "next/link";
import { TabsWrapper } from "@/components/tabs-wrapper";
import { AdvancedFilters } from "@/components/advanced-filters";
import { getAuthToken } from "@/lib/auth-session";
import {
  createMaintenanceServiceSector,
  deleteMaintenanceService,
  deleteMaintenanceServiceSector,
  listMaintenanceServices,
  listMaintenanceServiceSectors,
  patchMaintenanceService,
  updateMaintenanceServiceSector,
  type CreateMaintenanceServiceSectorPayload,
  type MaintenanceServiceRecord,
  type MaintenanceServiceSectorRecord,
  type MaintenanceServiceQuickEditFields,
  fetchAllPages,
} from "@/lib/crud-api";

type SectorFilter = "all" | number;

const SERVICE_QUICK_EDIT_KEYS = ["name", "service_price"] as const;

function parseServiceQuickEditChanges(
  changes: QuickEditDraft,
): MaintenanceServiceQuickEditFields {
  const payload: MaintenanceServiceQuickEditFields = {};
  if ("name" in changes) payload.name = changes.name.trim();
  if ("service_price" in changes) {
    payload.service_price = Number(changes.service_price);
  }
  return payload;
}

export default function MaintenanceServicesPage() {
  const permissions = usePermissions();
  const canUpdateServices = permissions.canUpdate("maintenance-services");
  const canDeleteServices = permissions.canDelete("maintenance-services");
  const { rates } = useExchangeRates();
  const [services, setServices] = useState<MaintenanceServiceRecord[]>([]);
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [allSectors, setAllSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [sectorsPage, setSectorsPage] = useState(1);
  const [sectorsTotalPages, setSectorsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setSector, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<MaintenanceServiceSectorRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isVisible, toggle: toggleColumn, reset: resetColumns, visible: visibleColumns } = useTableColumns(
    "table-cols:services-catalog",
    SERVICES_COLUMNS,
  );

  const { pageSize, setPageSize, apiPerPage, isShowAll } = useTablePageSize(
    "table-page-size:services-catalog",
  );

  const quickEdit = useQuickEditRow();
  const validateServiceQuickEdit = combineValidators(
    validateNonEmptyName,
    (draft) => validateNonNegativeNumbers(draft, ["service_price"]),
  );

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      console.log("[MaintenanceServices] Applying filters:", filters, "Page:", page);
      logFilters();

      const cleanFilters = getCleanFilters();
      const result = await listMaintenanceServices(token, page, { ...(cleanFilters as Parameters<typeof listMaintenanceServices>[2]), per_page: apiPerPage });
      setServices(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load maintenance services");
    } finally {
      setLoading(false);
    }
  }, [page, filters, logFilters, apiPerPage]);

  const loadDropdowns = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const sectorsRes = await fetchAllPages((p) => listMaintenanceServiceSectors(token, p));
      setAllSectors(sectorsRes);
    } catch (err) {
      console.error("Failed to load all sectors:", err);
    }
  }, []);

  const loadSectors = useCallback(async () => {
    try {
      setSectorsLoading(true);
      const token = getAuthToken();
      if (!token) return;
      const result = await listMaintenanceServiceSectors(token, sectorsPage);
      setSectors(result.items);
      setSectorsTotalPages(result.lastPage);
    } catch (err) {
      console.error("Failed to load maintenance service sectors:", err);
    } finally {
      setSectorsLoading(false);
    }
  }, [sectorsPage]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    loadSectors();
  }, [loadSectors]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useGlobalDataRefresh(async () => {
    await Promise.all([loadDropdowns(), loadSectors(), loadServices()]);
  });

  useEffect(() => {
    if (!filters.sector_id) return;
    const exists = allSectors.some((sector) => sector.id === filters.sector_id);
    if (!exists) {
      setSector("");
    }
  }, [allSectors, filters.sector_id, setSector]);


  const handleSaveServiceQuickEdit = async (service: MaintenanceServiceRecord) => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication required");

    await quickEdit.saveEdit(
      [...SERVICE_QUICK_EDIT_KEYS],
      validateServiceQuickEdit,
      async (changes) => {
        const updated = await patchMaintenanceService(
          token,
          service.id,
          parseServiceQuickEditChanges(changes),
        );
        setServices((prev) =>
          prev.map((row) => (row.id === service.id ? updated : row)),
        );
      },
    );
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm("Are you sure you want to delete this maintenance service?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteMaintenanceService(token, id);
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete maintenance service");
    }
  };

  const handleOpenSectorModal = (sector?: MaintenanceServiceSectorRecord) => {
    setEditingSector(sector || null);
    setSubmitError(null);
    setSectorModalOpen(true);
  };

  const handleCloseSectorModal = () => {
    setSectorModalOpen(false);
    setEditingSector(null);
  };

  const handleSubmitSector = async (formData: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateMaintenanceServiceSectorPayload = {
        name: String(formData.name),
      };

      if (editingSector) {
        await updateMaintenanceServiceSector(token, editingSector.id, payload);
      } else {
        await createMaintenanceServiceSector(token, payload);
      }

      await loadSectors();
      await loadDropdowns();
      await loadServices();
      handleCloseSectorModal();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save sector");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSector = async (id: number) => {
    if (!confirm("Are you sure you want to delete this maintenance service sector?")) return;
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await deleteMaintenanceServiceSector(token, id);
      await loadSectors();
      await loadDropdowns();
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete maintenance service sector");
    }
  };

  const sectorModalFields: FieldConfig[] = [
    {
      name: "name",
      label: "Sector Name",
      type: "text",
      required: true,
      section: "Basic Information",
      description: "e.g., Engine Maintenance, Electrical, Suspension",
      placeholder: "Enter sector name",
      value: editingSector?.name,
      helperTone: "featured",
    },
  ];

  const servicesTabContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">Maintenance Services</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Filter services by sector tabs and manage pricing rules from one place.
          </p>
        </div>
        <Link href="/inventory/maintenance-services/create">
          <ActionButton tone="primary">Add Service</ActionButton>
        </Link>
      </div>

      {error && <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <div className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest p-3 md:p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSector("");
            }}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              !filters.sector_id
                ? "bg-primary text-on-primary"
                : "bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            All Sectors
          </button>
          {allSectors.map((sector) => (
            <button
              key={sector.id}
              type="button"
              onClick={() => {
                setSector(sector.id);
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                filters.sector_id === sector.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              {sector.name}
            </button>
          ))}
        </div>
      </div>

      <FilterBar>
        <InputGroup label="Search" className="md:col-span-8">
          <input
            type="text"
            placeholder="Search by service name..."
            value={filters.search || ""}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input-base"
          />
        </InputGroup>
        <InputGroup label="Sector" className="md:col-span-4">
          <SearchableSelect
            value={filters.sector_id || ""}
            onChange={(v) => setSector(v ? parseInt(v) : "")}
            placeholder="All Sectors"
            options={allSectors.map((s) => ({ value: s.id, label: s.name }))}
            className="form-input-base"
          />
        </InputGroup>
      </FilterBar>

      <AdvancedFilters
        priceMin={filters.price_min}
        setPriceMin={setPriceMin}
        priceMax={filters.price_max}
        setPriceMax={setPriceMax}
        currency={filters.currency || "all"}
        setCurrency={setCurrency}
        showPriceFilters={true}
        showCurrencyFilter={true}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary"></div>
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          title="No maintenance services found"
          description="Adjust the sector tab or search, or create a service to populate this module."
        />
      ) : (
        <InventoryListTable>
          <InventoryListTableToolbar label="Services" count={services.length}>
            <PageSizeSelect
              value={pageSize}
              onChange={(size) => { setPageSize(size); setPage(1); }}
            />
            <ColumnPicker
              columns={SERVICES_COLUMNS}
              visible={visibleColumns}
              onToggle={toggleColumn}
              onReset={resetColumns}
            />
          </InventoryListTableToolbar>
          <InventoryListTableScroll>
            <InventoryListTableElement minWidth="880px">
              <InventoryListTableHead>
                <tr>
                  {isVisible("name") && <InventoryListTableTh>Name</InventoryListTableTh>}
                  {isVisible("sector") && <InventoryListTableTh>Sector</InventoryListTableTh>}
                  {isVisible("price") && <InventoryListTableTh>Price</InventoryListTableTh>}
                  {isVisible("discount") && <InventoryListTableTh>Discount</InventoryListTableTh>}
                  {isVisible("created") && <InventoryListTableTh>Created</InventoryListTableTh>}
                  <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                </tr>
              </InventoryListTableHead>
              <InventoryListTableBody>
              {services.map((service) => {
                const editing = quickEdit.isEditing(service.id);
                return (
                  <InventoryListTableRow key={service.id} editing={editing}>
                    {isVisible("name") && (
                      <InventoryListTableTd variant="name">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.name ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("name", value)
                            }
                            aria-label="Service name"
                          />
                        ) : (
                          service.name
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("sector") && (
                      <InventoryListTableTd variant="muted">
                        {allSectors.find(
                          (sector) =>
                            sector.id === service.maintenance_service_sector_id,
                        )?.name ?? "-"}
                      </InventoryListTableTd>
                    )}
                    {isVisible("price") && (
                      <InventoryListTableTd variant="primary">
                        {editing ? (
                          <QuickEditInput
                            value={quickEdit.draft.service_price ?? ""}
                            onChange={(value) =>
                              quickEdit.updateField("service_price", value)
                            }
                            type="number"
                            min={0}
                            step="any"
                            aria-label="Service price"
                          />
                        ) : (
                          formatCatalogPriceInEGP(
                            service.service_price,
                            service.currency_pricing,
                            rates,
                          )
                        )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("discount") && (
                      <InventoryListTableTd variant="muted">
                        {service.max_discount_type === "percentage"
                          ? `${service.max_discount_value}%`
                          : formatCatalogPriceInEGP(
                              service.max_discount_value,
                              service.currency_pricing,
                              rates,
                            )}
                      </InventoryListTableTd>
                    )}
                    {isVisible("created") && (
                      <InventoryListTableTd variant="muted">
                        {service.created_at
                          ? new Date(service.created_at).toLocaleDateString()
                          : "-"}
                      </InventoryListTableTd>
                    )}
                    <InventoryListTableTd align="right" className="whitespace-nowrap">
                      <QuickEditActions
                        isEditing={editing}
                        saving={quickEdit.saving}
                        canSave={quickEdit.hasChanges([
                          ...SERVICE_QUICK_EDIT_KEYS,
                        ])}
                        showQuickEdit={canUpdateServices}
                        onStartEdit={() =>
                          quickEdit.startEdit(service.id, {
                            name: service.name,
                            service_price: service.service_price,
                          })
                        }
                        onSave={() => handleSaveServiceQuickEdit(service)}
                        onCancel={quickEdit.cancelEdit}
                      >
                        <InventoryTableSecondaryActions>
                          <InventoryTableActionLink
                            href={`/inventory/maintenance-services/edit/${service.id}`}
                            hidden={!canUpdateServices}
                          >
                            Edit
                          </InventoryTableActionLink>
                          <InventoryTableActionDivider />
                          <InventoryTableActionLink
                            tone="danger"
                            onClick={() => handleDeleteService(service.id)}
                            hidden={!canDeleteServices}
                          >
                            Delete
                          </InventoryTableActionLink>
                        </InventoryTableSecondaryActions>
                      </QuickEditActions>
                      {editing && quickEdit.rowError ? (
                        <InventoryListTableError message={quickEdit.rowError} />
                      ) : null}
                    </InventoryListTableTd>
                  </InventoryListTableRow>
                );
              })}
              </InventoryListTableBody>
            </InventoryListTableElement>
          </InventoryListTableScroll>
        </InventoryListTable>
      )}

      {!isShowAll && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onPrevious={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
        />
      )}
    </div>
  );

  const sectorsTabContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">Service Sectors</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            These sectors become the filter tabs shown on the maintenance services screen.
          </p>
        </div>
        <ActionButton tone="primary" onClick={() => handleOpenSectorModal()}>
          Add Sector
        </ActionButton>
      </div>

      {sectors.length === 0 ? (
        <EmptyState title="No sectors found" description="Create a sector first so services can be grouped by tabs." />
      ) : (
        <InventoryListTable>
          <InventoryListTableToolbar label="Sectors" count={sectors.length} />
          <InventoryListTableScroll>
            <InventoryListTableElement minWidth="560px">
              <InventoryListTableHead>
                <tr>
                  <InventoryListTableTh>Name</InventoryListTableTh>
                  <InventoryListTableTh>Created</InventoryListTableTh>
                  <InventoryListTableTh align="center">Actions</InventoryListTableTh>
                </tr>
              </InventoryListTableHead>
              <InventoryListTableBody>
              {sectors.map((sector) => (
                <InventoryListTableRow key={sector.id}>
                  <InventoryListTableTd variant="name">{sector.name}</InventoryListTableTd>
                  <InventoryListTableTd variant="muted">
                    {sector.created_at
                      ? new Date(sector.created_at).toLocaleDateString()
                      : "-"}
                  </InventoryListTableTd>
                  <InventoryListTableTd align="right" className="whitespace-nowrap">
                    <InventoryTableSecondaryActions>
                      <InventoryTableActionLink
                        onClick={() => handleOpenSectorModal(sector)}
                      >
                        Edit
                      </InventoryTableActionLink>
                      <InventoryTableActionDivider />
                      <InventoryTableActionLink
                        tone="danger"
                        onClick={() => handleDeleteSector(sector.id)}
                      >
                        Delete
                      </InventoryTableActionLink>
                    </InventoryTableSecondaryActions>
                  </InventoryListTableTd>
                </InventoryListTableRow>
              ))}
              </InventoryListTableBody>
            </InventoryListTableElement>
          </InventoryListTableScroll>
        </InventoryListTable>
      )}

      <PaginationControls
        page={sectorsPage}
        totalPages={sectorsTotalPages}
        onPageChange={setSectorsPage}
        onPrevious={() => setSectorsPage((current) => Math.max(1, current - 1))}
        onNext={() => setSectorsPage((current) => Math.min(sectorsTotalPages, current + 1))}
      />
    </div>
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Service Operations"
        title="Maintenance Services"
      />

      <TabsWrapper
        tabs={[
          { id: "services", label: "All Services", content: servicesTabContent },
          { id: "sectors", label: "Sectors", content: sectorsTabContent },
        ]}
        defaultTabId="services"
      />


      <EntityFormModal
        title={editingSector ? "Edit Service Sector" : "Create Service Sector"}
        description={
          editingSector
            ? "Update the sector details used to organize maintenance services."
            : "Create a sector that will show as a filter tab on the services view."
        }
        fields={sectorModalFields}
        isOpen={sectorModalOpen}
        isLoading={isSubmitting}
        error={submitError || undefined}
        onClose={handleCloseSectorModal}
        onSubmit={handleSubmitSector}
        submitLabel={editingSector ? "Save Sector" : "Create Sector"}
        heroLabel="Sector Setup"
      />
    </PageShell>
  );
}
