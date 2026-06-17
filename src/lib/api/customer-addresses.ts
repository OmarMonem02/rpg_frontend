import {
  asRecord,
  pickArray,
  toText,
  toNumber,
  authorizedFetch,
} from "./core";

export type CustomerAddressRecord = {
  id: number;
  customer_id: number;
  label?: string;
  full_address: string;
  city: string;
  is_default: boolean;
  formatted?: string;
};

export function normalizeCustomerAddress(raw: unknown): CustomerAddressRecord {
  const record = asRecord(raw);
  const fullAddress = toText(record.full_address);
  const city = toText(record.city);
  const formatted = toText(record.formatted) || undefined;

  return {
    id: toNumber(record.id),
    customer_id: toNumber(record.customer_id),
    label: toText(record.label) || undefined,
    full_address: fullAddress,
    city,
    is_default: record.is_default === true || record.is_default === "true",
    formatted: formatted || (fullAddress && city ? `${fullAddress}, ${city}` : undefined),
  };
}

export function formatCustomerAddressLabel(address: CustomerAddressRecord): string {
  const prefix = address.label ? `${address.label} · ` : "";
  return `${prefix}${address.full_address}, ${address.city}`;
}

export async function listCustomerAddresses(
  token: string,
  customerId: number,
): Promise<CustomerAddressRecord[]> {
  const payload = await authorizedFetch<unknown>(
    `/customers/${customerId}/addresses`,
    token,
  );
  const rows = pickArray(payload, ["data", "addresses"]);
  return rows
    .map(normalizeCustomerAddress)
    .filter((item) => item.id > 0);
}

export type CreateCustomerAddressPayload = {
  label?: string;
  full_address: string;
  city: string;
  is_default?: boolean;
};

export async function createCustomerAddress(
  token: string,
  customerId: number,
  payload: CreateCustomerAddressPayload,
): Promise<CustomerAddressRecord> {
  const body: Record<string, string | boolean> = {
    full_address: payload.full_address.trim(),
    city: payload.city.trim(),
  };
  if (payload.label?.trim()) body.label = payload.label.trim();
  if (payload.is_default != null) body.is_default = payload.is_default;

  const data = await authorizedFetch<unknown>(
    `/customers/${customerId}/addresses`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const record = asRecord(data);
  return normalizeCustomerAddress(record.data ?? record);
}
