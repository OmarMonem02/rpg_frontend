"use client";

import { useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { createCustomerBike } from "@/lib/api/customers";
import { type BikeBlueprintRecord } from "@/lib/api/bikes";
import { ActionButton, InputGroup } from "@/components/ops-ui";
import { CustomerBikeBlueprintPicker } from "@/components/customers/CustomerBikeBlueprintPicker";
import { ImageUpload, type ImageUploadHandle } from "@/components/ui/ImageUpload";
import { resolvePendingImageUpload } from "@/lib/uploadImage";
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
  const imageUploadRef = useRef<ImageUploadHandle>(null);
  const [selectedBlueprint, setSelectedBlueprint] =
    useState<BikeBlueprintRecord | null>(null);
  const [details, setDetails] = useState({
    vin: "",
    mileage: "",
    image: "",
    image_public_id: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!selectedBlueprint) return;
    try {
      setLoading(true);
      setError("");
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const uploadedImage = await resolvePendingImageUpload(imageUploadRef.current, {
        url: details.image || undefined,
        public_id: details.image_public_id || undefined,
      });
      await createCustomerBike(token, customerId, {
        bike_blueprint_id: selectedBlueprint.id,
        vin: details.vin || undefined,
        mileage: Number(details.mileage) || undefined,
        image: uploadedImage.url || undefined,
        image_public_id: uploadedImage.public_id || undefined,
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

        <CustomerBikeBlueprintPicker
          selectedBlueprint={selectedBlueprint}
          onSelectBlueprint={setSelectedBlueprint}
          onError={setError}
          loading={loading}
        />

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
          ref={imageUploadRef}
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
