"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listMaintenanceParts,
  listBikeBlueprints,
  listBikeBlueprintMaintenanceParts,
  assignMaintenancePartToBikeBlueprint,
  removeMaintenancePartFromBikeBlueprint,
  type MaintenancePartRecord,
  type BikeBlueprintRecord,
  fetchAllPages,
} from "@/lib/crud-api";
import {
  ActionButton,
  InlineMessage,
  PageHero,
  PageShell,
  SectionHeading,
  SurfaceCard,
} from "@/components/ops-ui";

type SelectedItems = {
  maintenanceParts: number[];
  blueprints: number[];
};

export default function MaintenancePartsManageLinkingPage() {
  const [maintenanceParts, setMaintenanceParts] = useState<MaintenancePartRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);

  const [selected, setSelected] = useState<SelectedItems>({
    maintenanceParts: [],
    blueprints: [],
  });
  const [searchMaintenanceParts, setSearchMaintenanceParts] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load maintenance parts
  const loadMaintenanceParts = async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listMaintenanceParts(token, 1, {
        search: searchMaintenanceParts || undefined,
      });
      setMaintenanceParts(result.items);
    } catch (err) {
      console.error("Failed to load maintenance parts:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load maintenance parts",
      });
    }
  };

  // Load bike blueprints
  const loadBlueprints = async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await fetchAllPages((p) => listBikeBlueprints(token, p));
      setBlueprints(result);
    } catch (err) {
      console.error("Failed to load blueprints:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load blueprints",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlueprints();
  }, []);

  useEffect(() => {
    loadMaintenanceParts();
  }, [searchMaintenanceParts]);

  const toggleMaintenancePart = (id: number) => {
    setSelected((prev) => ({
      ...prev,
      maintenanceParts: prev.maintenanceParts.includes(id)
        ? prev.maintenanceParts.filter((spId) => spId !== id)
        : [...prev.maintenanceParts, id],
    }));
  };

  const toggleBlueprint = (id: number) => {
    setSelected((prev) => ({
      ...prev,
      blueprints: prev.blueprints.includes(id)
        ? prev.blueprints.filter((bId) => bId !== id)
        : [...prev.blueprints, id],
    }));
  };

  const handleLinkSelected = async () => {
    if (selected.maintenanceParts.length === 0 || selected.blueprints.length === 0) {
      setMessage({
        type: "error",
        text: "Please select both maintenance parts and blueprints",
      });
      return;
    }

    try {
      setActionInProgress(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      let successCount = 0;

      // Link each selected maintenance part to each selected blueprint
      for (const blueprintId of selected.blueprints) {
        await assignMaintenancePartToBikeBlueprint(token, blueprintId, {
          maintenance_part_ids: selected.maintenanceParts,
        });
        successCount += selected.maintenanceParts.length;
      }

      setMessage({
        type: "success",
        text: `Successfully linked ${successCount} maintenance part(s) to ${selected.blueprints.length} blueprint(s)`,
      });

      // Reset selection
      setSelected({ maintenanceParts: [], blueprints: [] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to create links",
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUnlinkSelected = async () => {
    if (selected.maintenanceParts.length === 0 || selected.blueprints.length === 0) {
      setMessage({
        type: "error",
        text: "Please select both maintenance parts and blueprints",
      });
      return;
    }

    try {
      setActionInProgress(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      let successCount = 0;

      // Remove link for each blueprint-maintenance part combination
      for (const blueprintId of selected.blueprints) {
        for (const maintenancePartId of selected.maintenanceParts) {
          await removeMaintenancePartFromBikeBlueprint(
            token,
            blueprintId,
            maintenancePartId,
          );
          successCount++;
        }
      }

      setMessage({
        type: "success",
        text: `Successfully unlinked ${successCount} link(s)`,
      });

      // Reset selection
      setSelected({ maintenanceParts: [], blueprints: [] });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to remove links",
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleViewCurrentLinks = async () => {
    if (selected.maintenanceParts.length === 0) {
      setMessage({
        type: "error",
        text: "Please select a maintenance part to view its links",
      });
      return;
    }

    try {
      setActionInProgress(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const linkedDetails: string[] = [];

      for (const maintenancePartId of selected.maintenanceParts) {
        const maintenancePart = maintenanceParts.find((sp) => sp.id === maintenancePartId);
        if (!maintenancePart) continue;

        const linkedBlueprintModels: string[] = [];

        for (const blueprint of blueprints) {
          const result = await listBikeBlueprintMaintenanceParts(
            token,
            blueprint.id,
            1,
            { per_page: 1000 },
          );
          if (result.items.some((item) => item.maintenance_part_id === maintenancePartId)) {
            linkedBlueprintModels.push(`${blueprint.model} ${blueprint.year}`);
          }
        }

        linkedDetails.push(
          `${maintenancePart.name} (SKU: ${maintenancePart.sku}): ${linkedBlueprintModels.length > 0 ? linkedBlueprintModels.join(", ") : "No linked blueprints"}`,
        );
      }

      setMessage({
        type: "success",
        text: `Current Links:\n${linkedDetails.join("\n")}`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error ? err.message : "Failed to fetch current links",
      });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
            <p className="text-on-surface-variant">Loading maintenance parts and blueprints...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Management"
        title="Maintenance Parts and Blueprint Links"
      />

      {message && (
        <InlineMessage tone={message.type === "success" ? "success" : "danger"}>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </InlineMessage>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Maintenance Parts List */}
        <SurfaceCard className="lg:col-span-1">
          <SectionHeading
            title="Maintenance Parts"
            description="Choose one or more parts to inspect or link."
          />

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search maintenance parts..."
              value={searchMaintenanceParts}
              onChange={(e) => setSearchMaintenanceParts(e.target.value)}
              className="form-input-base"
            />
          </div>

          {/* Maintenance Parts Checkboxes */}
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {maintenanceParts.length > 0 ? (
              maintenanceParts.map((part) => (
                <label
                  key={part.id}
                  className="flex items-center space-x-3 p-2 hover:bg-surface-container-low"
                >
                  <input
                    type="checkbox"
                    checked={selected.maintenanceParts.includes(part.id)}
                    onChange={() => toggleMaintenancePart(part.id)}
                    className="accent-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-on-surface">{part.name}</div>
                    <div className="text-sm text-on-surface-variant">SKU: {part.sku}</div>
                  </div>
                </label>
              ))
            ) : (
              <p className="text-center text-on-surface-variant">No maintenance parts found</p>
            )}
          </div>

          <div className="mt-4 text-sm text-on-surface-variant">
            Selected: {selected.maintenanceParts.length} part(s)
          </div>
        </SurfaceCard>

        {/* Right Column - Blueprints Multi-select and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Blueprints Multi-select */}
          <SurfaceCard>
            <SectionHeading
              title="Blueprints"
              description="Choose the blueprints to link or unlink against the selected parts."
            />

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {blueprints.length > 0 ? (
                blueprints.map((blueprint) => (
                  <label
                    key={blueprint.id}
                    className="flex items-center space-x-3 p-2 hover:bg-surface-container-low"
                  >
                    <input
                      type="checkbox"
                      checked={selected.blueprints.includes(blueprint.id)}
                      onChange={() => toggleBlueprint(blueprint.id)}
                      className="accent-primary"
                    />
                    <div>
                      <div className="font-medium text-on-surface">
                        {blueprint.model} {blueprint.year}
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <p className="col-span-2 text-center text-on-surface-variant">
                  No blueprints available
                </p>
              )}
            </div>

            <div className="mt-4 text-sm text-on-surface-variant">
              Selected: {selected.blueprints.length} blueprint(s)
            </div>
          </SurfaceCard>

          {/* Current Status */}
          <InlineMessage tone="primary">
            <p className="text-sm">
              {selected.maintenanceParts.length === 0
                ? "Select a maintenance part to view current links"
                : selected.maintenanceParts.length === 1
                  ? `Showing links for ${maintenanceParts.find((sp) => sp.id === selected.maintenanceParts[0])?.name || "Unknown"}`
                  : `${selected.maintenanceParts.length} maintenance parts selected`}
            </p>
          </InlineMessage>

          {/* Action Buttons */}
          <SurfaceCard>
            <SectionHeading
              title="Actions"
              description="Apply the selected relationships in bulk."
            />
            <div className="flex flex-col gap-3">
              <ActionButton
                onClick={handleLinkSelected}
                disabled={
                  actionInProgress ||
                  selected.maintenanceParts.length === 0 ||
                  selected.blueprints.length === 0
                }
              >
                {actionInProgress ? "Processing..." : "Link Selected"}
              </ActionButton>
              <ActionButton
                onClick={handleUnlinkSelected}
                disabled={
                  actionInProgress ||
                  selected.maintenanceParts.length === 0 ||
                  selected.blueprints.length === 0
                }
                tone="danger"
              >
                {actionInProgress ? "Processing..." : "Unlink Selected"}
              </ActionButton>
              <ActionButton
                onClick={handleViewCurrentLinks}
                disabled={actionInProgress || selected.maintenanceParts.length === 0}
              >
                {actionInProgress ? "Processing..." : "View Current Links"}
              </ActionButton>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageShell>
  );
}
