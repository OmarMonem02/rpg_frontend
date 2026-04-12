"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  listSpareParts,
  listBikeBlueprints,
  listBikeBlueprintSpareParts,
  assignSparePartToBikeBlueprint,
  removeSparePartFromBikeBlueprint,
  type SparePartRecord,
  type BikeBlueprintRecord,
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
  spareParts: number[];
  blueprints: number[];
};

export default function SparePartsManageLinkingPage() {
  const [spareParts, setSpareParts] = useState<SparePartRecord[]>([]);
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);

  const [selected, setSelected] = useState<SelectedItems>({ spareParts: [], blueprints: [] });
  const [searchSpareParts, setSearchSpareParts] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load spare parts
  const loadSpareParts = async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listSpareParts(token, 1, {
        search: searchSpareParts || undefined,
      });
      setSpareParts(result.items);
    } catch (err) {
      console.error("Failed to load spare parts:", err);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load spare parts",
      });
    }
  };

  // Load bike blueprints
  const loadBlueprints = async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const result = await listBikeBlueprints(token, 1);
      setBlueprints(result.items);
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
    loadSpareParts();
  }, [searchSpareParts]);

  const toggleSparePart = (id: number) => {
    setSelected((prev) => ({
      ...prev,
      spareParts: prev.spareParts.includes(id)
        ? prev.spareParts.filter((spId) => spId !== id)
        : [...prev.spareParts, id],
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
    if (selected.spareParts.length === 0 || selected.blueprints.length === 0) {
      setMessage({ type: "error", text: "Please select both spare parts and blueprints" });
      return;
    }

    try {
      setActionInProgress(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      let successCount = 0;

      // Link each selected spare part to each selected blueprint
      for (const blueprintId of selected.blueprints) {
        await assignSparePartToBikeBlueprint(token, blueprintId, {
          spare_part_ids: selected.spareParts,
        });
        successCount += selected.spareParts.length;
      }

      setMessage({
        type: "success",
        text: `Successfully linked ${successCount} spare part(s) to ${selected.blueprints.length} blueprint(s)`,
      });

      // Reset selection
      setSelected({ spareParts: [], blueprints: [] });

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
    if (selected.spareParts.length === 0 || selected.blueprints.length === 0) {
      setMessage({ type: "error", text: "Please select both spare parts and blueprints" });
      return;
    }

    try {
      setActionInProgress(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      let successCount = 0;

      // Remove link for each blueprint-spare part combination
      for (const blueprintId of selected.blueprints) {
        for (const sparePartId of selected.spareParts) {
          await removeSparePartFromBikeBlueprint(token, blueprintId, sparePartId);
          successCount++;
        }
      }

      setMessage({
        type: "success",
        text: `Successfully unlinked ${successCount} link(s)`,
      });

      // Reset selection
      setSelected({ spareParts: [], blueprints: [] });

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
    if (selected.spareParts.length === 0) {
      setMessage({ type: "error", text: "Please select a spare part to view its links" });
      return;
    }

    try {
      setActionInProgress(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const linkedDetails: string[] = [];

      for (const sparePartId of selected.spareParts) {
        const sparePart = spareParts.find((sp) => sp.id === sparePartId);
        if (!sparePart) continue;

        const linkedBlueprintModels: string[] = [];

        for (const blueprint of blueprints) {
          const result = await listBikeBlueprintSpareParts(token, blueprint.id, 1, { per_page: 1000 });
          if (result.items.some((item) => item.spare_part_id === sparePartId)) {
            linkedBlueprintModels.push(`${blueprint.model} ${blueprint.year}`);
          }
        }

        linkedDetails.push(
          `${sparePart.name} (SKU: ${sparePart.sku}): ${linkedBlueprintModels.length > 0 ? linkedBlueprintModels.join(", ") : "No linked blueprints"}`
        );
      }

      setMessage({
        type: "success",
        text: `Current Links:\n${linkedDetails.join("\n")}`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to fetch current links",
      });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading spare parts and blueprints...</p>
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Relationship Management"
        title="Manage Spare Parts and Blueprint Links"
        description="Link or unlink spare parts against bike blueprints from a single coordination surface."
      />

      {message && (
        <InlineMessage tone={message.type === "success" ? "success" : "danger"}>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </InlineMessage>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Spare Parts List */}
        <SurfaceCard className="lg:col-span-1">
          <SectionHeading title="Spare Parts" description="Choose one or more parts to inspect or link." />

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search spare parts..."
              value={searchSpareParts}
              onChange={(e) => setSearchSpareParts(e.target.value)}
              className="form-input-base"
            />
          </div>

          {/* Spare Parts Checkboxes */}
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {spareParts.length > 0 ? (
              spareParts.map((part) => (
                <label key={part.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.spareParts.includes(part.id)}
                    onChange={() => toggleSparePart(part.id)}
                    className="accent-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{part.name}</div>
                    <div className="text-sm text-gray-500">SKU: {part.sku}</div>
                  </div>
                </label>
              ))
            ) : (
              <p className="text-center text-gray-500">No spare parts found</p>
            )}
          </div>

            <div className="mt-4 text-sm text-on-surface-variant">
              Selected: {selected.spareParts.length} part(s)
            </div>
        </SurfaceCard>

        {/* Right Column - Blueprints Multi-select and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Blueprints Multi-select */}
          <SurfaceCard>
            <SectionHeading title="Blueprints" description="Choose the blueprints to link or unlink against the selected parts." />

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {blueprints.length > 0 ? (
                blueprints.map((blueprint) => (
                  <label key={blueprint.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selected.blueprints.includes(blueprint.id)}
                      onChange={() => toggleBlueprint(blueprint.id)}
                      className="accent-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {blueprint.model} {blueprint.year}
                      </div>
                    </div>
                  </label>
                ))
              ) : (
                <p className="col-span-2 text-center text-gray-500">No blueprints available</p>
              )}
            </div>

            <div className="mt-4 text-sm text-on-surface-variant">
              Selected: {selected.blueprints.length} blueprint(s)
            </div>
          </SurfaceCard>

          {/* Current Status */}
          <InlineMessage tone="primary">
            <p className="text-sm">
              {selected.spareParts.length === 0
                ? "Select a spare part to view current links"
                : selected.spareParts.length === 1
                  ? `Showing links for ${spareParts.find((sp) => sp.id === selected.spareParts[0])?.name || "Unknown"}`
                  : `${selected.spareParts.length} spare parts selected`}
            </p>
          </InlineMessage>

          {/* Action Buttons */}
          <SurfaceCard>
            <SectionHeading title="Actions" description="Apply the selected relationships in bulk." />
            <div className="flex flex-col gap-3">
              <ActionButton
                onClick={handleLinkSelected}
                disabled={actionInProgress || selected.spareParts.length === 0 || selected.blueprints.length === 0}
              >
                {actionInProgress ? "Processing..." : "Link Selected"}
              </ActionButton>
              <ActionButton
                onClick={handleUnlinkSelected}
                disabled={actionInProgress || selected.spareParts.length === 0 || selected.blueprints.length === 0}
                tone="danger"
              >
                {actionInProgress ? "Processing..." : "Unlink Selected"}
              </ActionButton>
              <ActionButton
                onClick={handleViewCurrentLinks}
                disabled={actionInProgress || selected.spareParts.length === 0}
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
