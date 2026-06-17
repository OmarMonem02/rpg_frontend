"use client";

import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { updateSale, type SaleRecord } from "@/lib/crud-api";
import {
  DELIVERY_STATUS_OPTIONS,
  getDeliveryTone,
  humanizeDeliveryStatus,
  nextDeliveryStatus,
  type DeliveryStatus,
} from "@/lib/delivery-orders/utils";
import {
  ActionButton,
  ConfirmDialog,
  InputGroup,
  SearchableSelect,
  StatusBadge,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

type DeliveryStatusPanelProps = {
  sale: SaleRecord;
  canUpdate: boolean;
  onUpdated: (sale: SaleRecord) => void;
  onError: (message: string) => void;
};

export function DeliveryStatusPanel({
  sale,
  canUpdate,
  onUpdated,
  onError,
}: DeliveryStatusPanelProps) {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(
    (sale.delivery_status as DeliveryStatus) || "pending",
  );
  const [shippingFee, setShippingFee] = useState(String(sale.shipping_fee || 0));
  const [saving, setSaving] = useState(false);
  const [confirmDelivered, setConfirmDelivered] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DeliveryStatus | null>(
    null,
  );

  useEffect(() => {
    setDeliveryStatus((sale.delivery_status as DeliveryStatus) || "pending");
    setShippingFee(String(sale.shipping_fee || 0));
  }, [sale.delivery_status, sale.shipping_fee]);

  const quickNext = nextDeliveryStatus(sale.delivery_status);

  const saveUpdate = async (
    patch: { delivery_status?: DeliveryStatus; shipping_fee?: number },
  ) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const updated = await updateSale(token, sale.id, patch);
      onUpdated(updated);
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update delivery");
    } finally {
      setSaving(false);
      setConfirmDelivered(false);
      setPendingStatus(null);
    }
  };

  const handleSave = async () => {
    const fee = Number(shippingFee);
    if (!Number.isFinite(fee) || fee < 0) {
      onError("Shipping fee must be zero or greater.");
      return;
    }

    if (
      deliveryStatus === "delivered" &&
      sale.delivery_status?.toLowerCase() !== "delivered"
    ) {
      setPendingStatus(deliveryStatus);
      setConfirmDelivered(true);
      return;
    }

    await saveUpdate({
      delivery_status: deliveryStatus,
      shipping_fee: fee,
    });
  };

  const handleQuickAdvance = async () => {
    if (!quickNext) return;
    if (
      quickNext === "delivered" &&
      sale.delivery_status?.toLowerCase() !== "delivered"
    ) {
      setPendingStatus(quickNext);
      setConfirmDelivered(true);
      return;
    }
    await saveUpdate({ delivery_status: quickNext });
  };

  const handleConfirmDelivered = async () => {
    const fee = Number(shippingFee);
    await saveUpdate({
      delivery_status: pendingStatus ?? "delivered",
      shipping_fee: Number.isFinite(fee) && fee >= 0 ? fee : sale.shipping_fee,
    });
  };

  return (
    <>
      <SurfaceCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-outline-variant/15 pb-4">
          <div>
            <p className="label-caps flex items-center gap-2 text-primary">
              <TruckIcon className="h-4 w-4" />
              Fulfillment
            </p>
            <h2 className="mt-1 text-xl font-semibold text-on-surface">
              Delivery workflow
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Update shipping status and handling fee for this remote order.
            </p>
          </div>
          <StatusBadge tone={getDeliveryTone(sale.delivery_status)}>
            {humanizeDeliveryStatus(sale.delivery_status)}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <InputGroup label="Delivery status">
            {canUpdate ? (
              <SearchableSelect
                value={deliveryStatus}
                onChange={(value) =>
                  setDeliveryStatus(value as DeliveryStatus)
                }
                options={DELIVERY_STATUS_OPTIONS}
                className="form-input-base"
                disabled={saving}
              />
            ) : (
              <p className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                {humanizeDeliveryStatus(sale.delivery_status)}
              </p>
            )}
          </InputGroup>

          <InputGroup label="Shipping fee (EGP)">
            {canUpdate ? (
              <input
                type="number"
                min={0}
                step="0.01"
                value={shippingFee}
                onChange={(event) => setShippingFee(event.target.value)}
                className="form-input-base"
                disabled={saving}
              />
            ) : (
              <p className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                {sale.shipping_fee || 0}
              </p>
            )}
          </InputGroup>
        </div>

        {canUpdate ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {quickNext ? (
              <ActionButton
                variant="outline"
                onClick={() => void handleQuickAdvance()}
                disabled={saving}
                className="gap-2"
              >
                <TruckIcon className="h-4 w-4" />
                {quickNext === "in-transit"
                  ? "Mark in transit"
                  : "Mark delivered"}
              </ActionButton>
            ) : null}
            <ActionButton
              tone="primary"
              onClick={() => void handleSave()}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Save changes
            </ActionButton>
          </div>
        ) : null}
      </SurfaceCard>

      <ConfirmDialog
        isOpen={confirmDelivered}
        onClose={() => {
          setConfirmDelivered(false);
          setPendingStatus(null);
        }}
        title="Mark order as delivered?"
        confirmLabel="Mark delivered"
        confirmTone="primary"
        isLoading={saving}
        onConfirm={() => void handleConfirmDelivered()}
      >
        <p className="text-sm text-on-surface-variant">
          This will set the delivery status to delivered for order INV-
          {sale.id}. Confirm the package has reached the customer.
        </p>
      </ConfirmDialog>
    </>
  );
}
