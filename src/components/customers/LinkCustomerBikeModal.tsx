"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { createCustomerBike } from "@/lib/api/customers";
import { listBikeBlueprints, type BikeBlueprintRecord } from "@/lib/api/bikes";
import { ActionButton, InputGroup } from "@/components/ops-ui";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ModalShell } from "@/components/tickets/ticket-workflow-modals";

export function LinkCustomerBikeModal({
  customerId,
  customerName,
  onClose,
  onSuccess,
}: {
  customerId: number;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [blueprintSearch, setBlueprintSearch] = useState({
    brand: "",
    model: "",
    year: "",
  });
  const [blueprints, setBlueprints] = useState<BikeBlueprintRecord[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<BikeBlueprintRecord | null>(null);
  const [details, setDetails] = useState({
    vin: "",
    mileage: "",
    image: "",
    image_public_id: "",
    notes: "",
  });

  const searchBlueprints = async () => {
    const brand = blueprintSearch.brand.trim();
    const model = blueprintSearch.model.trim();
    const yearText = blueprintSearch.year.trim();
    if (!brand && !model && !yearText) return;

    const parsedYear = yearText ? Number(yearText) : undefined;
    if (
      yearText &&
      (parsedYear === undefined ||
        !Number.isInteger(parsedYear) ||
        parsedYear < 1900)
    ) {
      setError("Enter a valid year (e.g. 2024).");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const res = await listBikeBlueprints(token, 1, {
        brand: brand || undefined,
        model: model || undefined,
        year: parsedYear,
      });
      setBlueprints(res.items);
      setSelectedBlueprint(null);
      if (res.items.length === 0) setError("No bike models found.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to search bike models",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBlueprint) return;
    try {
      setLoading(true);
      setError("");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await createCustomerBike(token, customerId, {
        bike_blueprint_id: selectedBlueprint.id,
        vin: details.vin || undefined,
        mileage: Number(details.mileage) || undefined,
        image: details.image || undefined,
        image_public_id: details.image_public_id || undefined,
        notes: details.notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to link bike");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Link a bike"
      description={`Register another vehicle for ${customerName}. Customers can have multiple bikes.`}
      size="full"
      align="top"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ActionButton
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </ActionButton>
          <ActionButton
            type="button"
            tone="primary"
            className="w-full sm:w-auto"
            onClick={() => void handleSubmit()}
            disabled={loading || !selectedBlueprint}
          >
            {loading ? "Saving…" : "Link bike"}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error ? (
          <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        <InputGroup label="Find model (blueprint)">
          <p className="mb-3 text-xs text-on-surface-variant">
            Search by brand, model, or year — use one field or combine them.
          </p>
          <div className="flex grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              type="text"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Brand"
              value={blueprintSearch.brand}
              onChange={(e) =>
                setBlueprintSearch((current) => ({
                  ...current,
                  brand: e.target.value,
                }))
              }
              onKeyDown={(e) => e.key === "Enter" && void searchBlueprints()}
            />
            <input
              type="text"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Model"
              value={blueprintSearch.model}
              onChange={(e) =>
                setBlueprintSearch((current) => ({
                  ...current,
                  model: e.target.value,
                }))
              }
              onKeyDown={(e) => e.key === "Enter" && void searchBlueprints()}
            />
            <input
              type="number"
              min={1970}
              step="1"
              onWheel={(event) => {
                event.currentTarget.blur();
              }}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Year"
              value={blueprintSearch.year}
              onChange={(e) =>
                setBlueprintSearch((current) => ({
                  ...current,
                  year: e.target.value,
                }))
              }
              onKeyDown={(e) => e.key === "Enter" && void searchBlueprints()}
            />
          <div className="mt-3 flex justify-end">
            <ActionButton
              type="button"
              onClick={() => void searchBlueprints()}
              disabled={
                loading ||
                (!blueprintSearch.brand.trim() &&
                  !blueprintSearch.model.trim() &&
                  !blueprintSearch.year.trim())
              }
            >
              Find
            </ActionButton>
          </div>
          </div>
          {blueprints.length > 0 ? (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-outline-variant/10 bg-surface-container-lowest">
              {blueprints.map((bp) => (
                <button
                  key={bp.id}
                  type="button"
                  className={`block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-primary/5 ${
                    selectedBlueprint?.id === bp.id
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-on-surface"
                  }`}
                  onClick={() => setSelectedBlueprint(bp)}
                >
                  {bp.brand?.name ? `${bp.brand.name} ` : ""}
                  {bp.model} ({bp.year})
                </button>
              ))}
            </div>
          ) : null}
        </InputGroup>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputGroup label="VIN (optional)">
            <input
              type="text"
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary"
              value={details.vin}
              onChange={(e) =>
                setDetails((d) => ({ ...d, vin: e.target.value }))
              }
            />
          </InputGroup>
          <InputGroup label="Mileage (km)">
            <input
              type="number"
              min={0}
              step="1"
              onWheel={(event) => {
                event.currentTarget.blur();
              }}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none"
              value={details.mileage}
              onChange={(e) =>
                setDetails((d) => ({ ...d, mileage: e.target.value }))
              }
            />
          </InputGroup>
        </div>

        <ImageUpload
          value={details.image || undefined}
          folder="Customer Bike Photo"
          uploadFolder="rpg-system/Customer-Bike"
          onChange={(url, publicId) =>
            setDetails((d) => ({
              ...d,
              image: url,
              image_public_id: publicId,
            }))
          }
          onError={setError}
        />

        <InputGroup label="Notes (optional)">
          <textarea
            rows={2}
            className="w-full resize-y rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 outline-none focus:border-primary"
            value={details.notes}
            onChange={(e) =>
              setDetails((d) => ({ ...d, notes: e.target.value }))
            }
          />
        </InputGroup>
      </div>
    </ModalShell>
  );
}
