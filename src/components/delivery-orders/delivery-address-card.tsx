"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  formatCustomerAddressLabel,
  listCustomerAddresses,
  type CustomerAddressRecord,
} from "@/lib/api/customer-addresses";
import { updateSale, resolveSaleAddress, type SaleRecord } from "@/lib/crud-api";
import {
  ActionButton,
  InputGroup,
  SearchableSelect,
  SurfaceCard,
} from "@/components/ops-ui";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

type DeliveryAddressCardProps = {
  sale: SaleRecord;
  canUpdate: boolean;
  onUpdated: (sale: SaleRecord) => void;
  onError: (message: string) => void;
};

export function DeliveryAddressCard({
  sale,
  canUpdate,
  onUpdated,
  onError,
}: DeliveryAddressCardProps) {
  const [addresses, setAddresses] = useState<CustomerAddressRecord[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState(
    String(sale.customer_address_id || ""),
  );
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayAddress = resolveSaleAddress(sale);
  const city = sale.customer_address?.city;
  const label = sale.customer_address?.label;

  const loadAddresses = useCallback(async () => {
    if (!canUpdate || !sale.customer_id) return;
    try {
      setLoadingAddresses(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      setAddresses(await listCustomerAddresses(token, sale.customer_id));
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to load customer addresses",
      );
    } finally {
      setLoadingAddresses(false);
    }
  }, [canUpdate, onError, sale.customer_id]);

  useEffect(() => {
    setSelectedAddressId(String(sale.customer_address_id || ""));
  }, [sale.customer_address_id]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const addressOptions = useMemo(
    () =>
      addresses.map((address) => ({
        value: String(address.id),
        label: formatCustomerAddressLabel(address),
      })),
    [addresses],
  );

  const handleSaveAddress = async () => {
    const addressId = Number(selectedAddressId);
    if (!addressId) {
      onError("Select a shipping address.");
      return;
    }

    try {
      setSaving(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      const updated = await updateSale(token, sale.id, {
        customer_address_id: addressId,
      });
      onUpdated(updated);
      onError("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SurfaceCard className="p-5">
      <div className="border-b border-outline-variant/15 pb-4">
        <p className="label-caps flex items-center gap-2 text-primary">
          <MapPinIcon className="h-4 w-4" />
          Shipping address
        </p>
        <h2 className="mt-1 text-xl font-semibold text-on-surface">
          Delivery destination
        </h2>
      </div>

      <div className="mt-4 space-y-3">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {label}
          </p>
        ) : null}
        <p className="text-sm text-on-surface">
          {displayAddress || "No shipping address on file"}
        </p>
        {city ? (
          <p className="text-sm text-on-surface-variant">{city}</p>
        ) : null}
      </div>

      {canUpdate && sale.customer_id > 0 ? (
        <div className="mt-5 space-y-4 border-t border-outline-variant/15 pt-5">
          <InputGroup label="Change address">
            <SearchableSelect
              value={selectedAddressId}
              onChange={setSelectedAddressId}
              options={addressOptions}
              placeholder={
                loadingAddresses ? "Loading addresses..." : "Select address"
              }
              className="form-input-base"
              disabled={loadingAddresses || saving || addressOptions.length === 0}
            />
          </InputGroup>
          {addressOptions.length === 0 && !loadingAddresses ? (
            <p className="text-sm text-on-surface-variant">
              No saved addresses for this customer. Add one from the sale
              creation flow.
            </p>
          ) : null}
          <ActionButton
            variant="outline"
            onClick={() => void handleSaveAddress()}
            disabled={saving || loadingAddresses || !selectedAddressId}
            className="gap-2"
          >
            {saving ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
            Save address
          </ActionButton>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
