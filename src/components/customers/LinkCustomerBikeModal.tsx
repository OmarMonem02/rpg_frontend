"use client";

import { useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { createCustomerBike } from "@/lib/api/customers";
import { listBikeBlueprints, type BikeBlueprintRecord } from "@/lib/api/bikes";
import { ActionButton, InputGroup } from "@/components/ops-ui";
import { ImageUpload } from "@/components/ui/ImageUpload";

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
  const [blueprintSearchQuery, setBlueprintSearchQuery] = useState("");
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
    if (!blueprintSearchQuery.trim()) return;
    try {
      setLoading(true);
      setError("");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const res = await listBikeBlueprints(token, 1, {
        search: blueprintSearchQuery.trim(),
      });
      setBlueprints(res.items);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-outline-variant/20 bg-surface p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Link a bike</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Register another vehicle for {customerName}. Customers can have
              multiple bikes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          <InputGroup label="Find model (blueprint)">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Search brand or model…"
                value={blueprintSearchQuery}
                onChange={(e) => setBlueprintSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void searchBlueprints()}
              />
              <ActionButton
                type="button"
                onClick={() => void searchBlueprints()}
                disabled={loading}
              >
                Find
              </ActionButton>
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
                    {bp.model} ({bp.year})
                  </button>
                ))}
              </div>
            ) : null}
          </InputGroup>

          <div className="grid grid-cols-2 gap-4">
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
                onWheel={(event) => {
                  event.preventDefault();
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

        <div className="mt-6 flex justify-end gap-2 border-t border-outline-variant/10 pt-6">
          <ActionButton type="button" variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            type="button"
            tone="primary"
            onClick={() => void handleSubmit()}
            disabled={loading || !selectedBlueprint}
          >
            {loading ? "Saving…" : "Link bike"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
