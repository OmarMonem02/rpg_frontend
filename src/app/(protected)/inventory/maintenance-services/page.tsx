"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityFormModal, type FieldConfig } from "@/components/entity-form-modal";
import { useEntityFilters } from "@/hooks/useEntityFilters";
import {
  ActionButton,
  EmptyState,
  FilterBar,
  InputGroup,
  PageHero,
  PageShell,
  PaginationControls,
} from "@/components/ops-ui";
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
  updateMaintenanceServiceSector,
  type CreateMaintenanceServiceSectorPayload,
  type MaintenanceServiceRecord,
  type MaintenanceServiceSectorRecord,
} from "@/lib/crud-api";

type SectorFilter = "all" | number;

export default function MaintenanceServicesPage() {
  const [services, setServices] = useState<MaintenanceServiceRecord[]>([]);
  const [sectors, setSectors] = useState<MaintenanceServiceSectorRecord[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use custom filter hook
  const { filters, page, setPage, getCleanFilters, setSearch, setSector, setPriceMin, setPriceMax, setCurrency, logFilters } = useEntityFilters();

  const [sectorModalOpen, setSectorModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<MaintenanceServiceSectorRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      console.log("[MaintenanceServices] Applying filters:", filters, "Page:", page);
      logFilters();

      const cleanFilters = getCleanFilters();
      const result = await listMaintenanceServices(token, page, cleanFilters as any);
      setServices(result.items);
      setTotalPages(result.lastPage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load maintenance services");
    } finally {
      setLoading(false);
    }
  }, [page, filters, logFilters]);

  const loadSectors = useCallback(async () => {
    try {
      setSectorsLoading(true);
      const token = getAuthToken();
      if (!token) return;
      const result = await listMaintenanceServiceSectors(token, 1);
      setSectors(result.items);
    } catch (err) {
      console.error("Failed to load maintenance service sectors:", err);
    } finally {
      setSectorsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSectors();
  }, [loadSectors]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (!filters.sector_id) return;
    const exists = sectors.some((sector) => sector.id === filters.sector_id);
    if (!exists) {
      setSector("");
    }
  }, [sectors, filters.sector_id, setSector]);


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
          {sectors.map((sector) => (
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
          <select
            value={filters.sector_id || ""}
            onChange={(e) => setSector(e.target.value ? parseInt(e.target.value) : "")}
            className="form-input-base"
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
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
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Sector</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Discount</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{service.name}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    {sectors.find((sector) => sector.id === service.maintenance_service_sector_id)?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-on-surface">
                    {service.service_price} {service.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {service.max_discount_value} {service.max_discount_type === "percentage" ? "%" : service.currency_pricing}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    {service.created_at ? new Date(service.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/inventory/maintenance-services/edit/${service.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
      />
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
        <div className="overflow-x-auto rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-lowest">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-on-surface">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => (
                <tr key={sector.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                  <td className="px-4 py-3 text-on-surface">{sector.name}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    {sector.created_at ? new Date(sector.created_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenSectorModal(sector)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-on-surface-variant">•</span>
                    <button
                      onClick={() => handleDeleteSector(sector.id)}
                      className="text-xs font-medium text-error hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Service Operations"
        title="Maintenance Services"
        description="Run maintenance services and their sectors with the same operational flow as products, while filtering services directly by sector tabs."
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
