"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { createSaleDiscountApprovalRequest } from "@/lib/api/approval-requests";
import { getSettings } from "@/lib/api/settings";
import { egpMultiplierForPricingCurrency, toPricingCurrency } from "@/lib/currencies";
import { REFRESH_ALL_DATA_EVENT } from "@/components/refetch-all-data-button";
import {
  createSale,
  listCustomers,
  listSellers,
  listPaymentMethods,
  listProducts,
  listSpareParts,
  createCustomer,
  type CreateCustomerPayload,
  type CustomerRecord,
  type SellerRecord,
  type PaymentMethodRecord,
  type ProductRecord,
  type SparePartRecord,
  type BikeRecord,
  type MaintenanceServiceRecord,
  type CreateSalePayload,
  type CreateSaleLineItemPayload,
} from "@/lib/crud-api";
import { findExactSkuOrPartNumberMatch } from "@/lib/item-lookup";
import { CatalogPickerModal } from "@/components/catalog-picker-modal";
import {
  CartLineItemsPanel,
  type SaleLineItem,
} from "@/components/cart-line-items-panel";
import { EntityDrawer, type FieldConfig } from "@/components/entity-drawer";
import {
  computeCartTotalsBreakdown,
  computeDiscountBaseSubtotal,
  hasMaintenanceCartItems,
  SaleTotalsSummary,
} from "@/components/sale-totals-summary";
import { OverallDiscountPanel } from "@/components/overall-discount-panel";
import {
  getPresentSaleCategories,
  resolveScopeFromApprovalContext,
  scopeToPayload,
  type DiscountScope,
} from "@/lib/discount-scope";
import { useOverallDiscount } from "@/hooks/use-overall-discount";
import {
  PageShell,
  ActionButton,
  PageHero,
  SearchableSelect,
  SurfaceCard,
  type SearchableSelectOption,
} from "@/components/ops-ui";
import {
  CubeIcon,
  WrenchIcon,
  BanknotesIcon,
  CogIcon,
  ArrowLeftIcon,
  PlusIcon,
  UserIcon,
  UserCircleIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  ShieldCheckIcon,
  TruckIcon,
  CurrencyDollarIcon,
  TagIcon,
  CheckIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import type { DiscountInputType } from "@/lib/discount-input";
import { formatDiscountAmount } from "@/components/form-discount-input";

function formatEgp(amount: number) {
  return formatDiscountAmount(amount);
}

function FormSectionDivider({ title }: { title: string }) {
  return (
    <div className="col-span-full pt-1">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-outline-variant/15" />
        <span className="whitespace-nowrap label-caps text-on-surface-variant">
          {title}
        </span>
        <div className="h-px flex-1 bg-outline-variant/15" />
      </div>
    </div>
  );
}

function ReadyChip({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 label-caps transition-colors ${done
        ? "border-success/25 bg-success/10 text-on-success-container"
        : "border-outline-variant/20 bg-surface-container-high text-on-surface-variant"
        }`}
    >
      {done ? (
        <CheckIcon className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-outline-variant" />
      )}
      {label}
    </span>
  );
}

function FormSelect({
  id,
  label,
  icon: Icon,
  searchable = true,
  required,
  value,
  onChange,
  disabled,
  hint,
  headerAction,
  options,
  placeholder,
  placeholderSelectable = true,
}: {
  id: string;
  label: string;
  searchable?: boolean;
  icon: ComponentType<{ className?: string }>;
  required?: boolean;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  headerAction?: ReactNode;
  options: SearchableSelectOption[];
  placeholder?: string;
  placeholderSelectable?: boolean;
}) {
  return (
    <div className={`space-y-2 ${disabled ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 label-caps"
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
          {required ? <span className="text-error">*</span> : null}
        </label>
        {headerAction}
      </div>
      <SearchableSelect
        id={id}
        searchable={searchable}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        placeholderSelectable={placeholderSelectable}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-2xl border border-outline-variant/30 bg-surface py-3.5 pl-4 pr-4 text-sm font-medium text-on-surface shadow-sm transition-shadow hover:shadow-md focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-container/50"
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-on-surface-variant/90">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FormMoneyInput({
  id,
  label,
  icon: Icon,
  prefix,
  suffix = "EGP",
  value,
  onChange,
  onBlur,
  disabled,
  hint,
  tone = "default",
}: {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  prefix: string;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  hint?: string;
  tone?: "default" | "discount";
}) {
  const isDiscount = tone === "discount";
  return (
    <div className={`space-y-2 ${disabled ? "opacity-70" : ""}`}>
      <label
        htmlFor={id}
        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDiscount ? "text-on-surface-variant" : "text-on-surface-variant"
          }`}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </label>
      <div
        className={`relative rounded-2xl border border-outline-variant/30 bg-surface shadow-sm transition-shadow focus-within:ring-2 ${isDiscount
          ? "focus-within:border-error/50 focus-within:ring-error/20"
          : "focus-within:border-primary/50 focus-within:ring-primary/20"
          } ${disabled ? "cursor-not-allowed bg-surface-container/50" : "hover:shadow-md"}`}
      >
        <span
          className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 font-bold ${isDiscount ? "text-error" : "text-on-surface-variant"
            }`}
        >
          {prefix}
        </span>
        <input
          id={id}
          type="number"
          step="1"
          min="0"
          disabled={disabled}
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onWheel={(event) => {
            event.currentTarget.blur();
          }}
          onBlur={onBlur}
          placeholder="0.00"
          className="w-full appearance-none bg-transparent py-3.5 pl-10 pr-14 text-sm font-medium text-on-surface outline-none disabled:cursor-not-allowed"
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-xs text-on-surface-variant">
          {suffix}
        </span>
      </div>
      {hint ? (
        <p className="text-xs text-on-surface-variant/90">{hint}</p>
      ) : null}
    </div>
  );
}

const SALE_TYPE_OPTIONS = [
  {
    value: "site" as const,
    label: "In-store",
    description: "Completed at the shop",
    icon: ShoppingCartIcon,
  },
  {
    value: "online" as const,
    label: "Online",
    description: "Web or phone order",
    icon: GlobeAltIcon,
  },
  {
    value: "delivery" as const,
    label: "Delivery",
    description: "Ship to customer",
    icon: TruckIcon,
  },
];

type CatalogType =
  | "products"
  | "spare_parts"
  | "bikes"
  | "maintenance_services";

export function CreateSaleForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [exchangeRateEur, setExchangeRateEur] = useState<number>(0);

  // Form header state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [saleType, setSaleType] = useState<"site" | "online" | "delivery">(
    "site",
  );
  const [saleStatus, setSaleStatus] = useState<
    "pending" | "partial" | "completed"
  >("completed");
  const [deliveryStatus, setDeliveryStatus] = useState("pending");
  const [shippingFee, setShippingFee] = useState(0);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState<SaleLineItem[]>([]);
  const [tempItemCounter, setTempItemCounter] = useState(0);

  // Barcode / SKU quick add
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeBusy, setBarcodeBusy] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Quick Customer state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const customerFields: FieldConfig[] = [
    {
      name: "name",
      label: "Full Name",
      type: "text",
      required: true,
      span: 2,
      placeholder: "e.g. John Doe",
    },
    {
      name: "phone",
      label: "Phone Number",
      type: "text",
      required: true,
      placeholder: "e.g. +20 123 456 7890",
    },
    {
      name: "address",
      label: "Physical Address",
      type: "textarea",
      span: 2,
      placeholder: "Street, area, city (optional)",
    },
    {
      name: "how_did_you_know_us",
      label: "How did they find us?",
      type: "text",
      span: 2,
      placeholder: "e.g. Instagram, walk-in, referral…",
    },
    {
      name: "notes",
      label: "Internal notes",
      type: "textarea",
      span: 2,
      placeholder: "Optional notes for your team only",
    },
  ];

  // Catalog picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<CatalogType | null>(null);

  // Load dependencies
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const [customersRes, sellersRes, paymentRes, settingsRes] =
          await Promise.all([
            listCustomers(token, 1),
            listSellers(token, 1),
            listPaymentMethods(token, 1),
            getSettings(token),
          ]);

        setCustomers(customersRes.items);
        setSellers(sellersRes.items);
        setPaymentMethods(paymentRes.items);
        setExchangeRate(settingsRes.exchange_rate ?? 0);
        setExchangeRateEur(settingsRes.exchange_rate_eur ?? 0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dependencies",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDependencies();
  }, []);

  useEffect(() => {
    if (saleType === "site") {
      setDeliveryStatus("delivered");
      setSaleStatus("completed");
      setShippingFee(0);
      return;
    }

    setDeliveryStatus((current) =>
      current === "delivered" ? "pending" : current,
    );
    setSaleStatus((current) => (current === "completed" ? "pending" : current));
  }, [saleType]);

  const handleOpenCatalog = (catalogType: CatalogType) => {
    setActiveCatalog(catalogType);
    setPickerOpen(true);
  };

  const handleCloseCatalog = () => {
    setPickerOpen(false);
    setActiveCatalog(null);
  };

  const handleAddItems = useCallback(
    (
      items: (
        | ProductRecord
        | SparePartRecord
        | BikeRecord
        | MaintenanceServiceRecord
      )[],
    ) => {
      const newItems: SaleLineItem[] = items.map((item) => {
        // Determine sellable_type and get pricing
        let sellableType:
          | "products"
          | "spare_parts"
          | "bikes"
          | "maintenance_services";
        let price = 0;

        if ("sale_price" in item && "sku" in item) {
          // Could be product or spare_part
          if ("stock_quantity" in item && "products_category_id" in item) {
            sellableType = "products";
          } else {
            sellableType = "spare_parts";
          }
          price = item.sale_price;
        } else if ("service_price" in item) {
          sellableType = "maintenance_services";
          price = item.service_price;
        } else {
          // bikes
          sellableType = "bikes";
          price = "sale_price" in item ? item.sale_price : 0;
        }

        return {
          id: `temp_${tempItemCounter}_${item.id}`,
          sellable_id: item.id,
          sellable_type: sellableType,
          item_name: "name" in item ? item.name : `Item ${item.id}`,
          selling_price: price,
          discount_amount: 0,
          quantity: 1,
          currency: toPricingCurrency(
            "currency_pricing" in item ? item.currency_pricing : "EGP",
          ),
          catalogItem: item,
        };
      });

      setCartItems((prev) => [...prev, ...newItems]);
      setTempItemCounter((prev) => prev + items.length);
    },
    [tempItemCounter],
  );

  const addOrIncrementCatalogItem = useCallback(
    (item: ProductRecord | SparePartRecord) => {
      const sellableType: "products" | "spare_parts" =
        "stock_quantity" in item && "products_category_id" in item
          ? "products"
          : "spare_parts";

      setCartItems((prev) => {
        const existingIdx = prev.findIndex(
          (x) => x.sellable_type === sellableType && x.sellable_id === item.id,
        );
        if (existingIdx >= 0) {
          const next = [...prev];
          const existing = next[existingIdx];
          next[existingIdx] = {
            ...existing,
            quantity: (Number(existing.quantity) || 0) + 1,
          };
          return next;
        }
        return prev;
      });

      // If it wasn't found, append via existing mapper (keeps currency/pricing rules consistent)
      setCartItems((prev) => {
        const exists = prev.some(
          (x) => x.sellable_type === sellableType && x.sellable_id === item.id,
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: `temp_${tempItemCounter}_${item.id}`,
            sellable_id: item.id,
            sellable_type: sellableType,
            item_name: item.name,
            selling_price: item.sale_price,
            discount_amount: 0,
            quantity: 1,
            currency: toPricingCurrency(item.currency_pricing),
            catalogItem: item,
          },
        ];
      });
      setTempItemCounter((prev) => prev + 1);
    },
    [tempItemCounter],
  );

  const handleBarcodeSubmit = useCallback(async () => {
    const code = barcodeValue.trim();
    if (!code || barcodeBusy) return;

    try {
      setBarcodeBusy(true);
      setBarcodeError(null);

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const [productsRes, spareRes] = await Promise.all([
        listProducts(token, 1, { search: code }),
        listSpareParts(token, 1, { search: code }),
      ]);

      const match = findExactSkuOrPartNumberMatch(
        code,
        productsRes.items,
        spareRes.items,
      );
      if (!match) {
        throw new Error(`No product/spare part found for "${code}"`);
      }

      addOrIncrementCatalogItem(match.record);
      setBarcodeValue("");
    } catch (err) {
      setBarcodeError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBarcodeBusy(false);
    }
  }, [barcodeBusy, barcodeValue, addOrIncrementCatalogItem]);

  const handleUpdateItem = (
    itemId: string | number,
    updates: Partial<SaleLineItem>,
  ) => {
    setCartItems((prev) =>
      prev.map((item) =>
        (item.id || item.sellable_id) === itemId
          ? { ...item, ...updates }
          : item,
      ),
    );
  };

  const handleDeleteItem = (itemId: string | number) => {
    setCartItems((prev) =>
      prev.filter((item) => (item.id || item.sellable_id) !== itemId),
    );
  };

  const cartTotalsBreakdown = useMemo(
    () => computeCartTotalsBreakdown(cartItems, exchangeRate, exchangeRateEur),
    [cartItems, exchangeRate, exchangeRateEur],
  );

  const cartSubtotal = cartTotalsBreakdown.netSubtotal;

  const hasMaintenanceItems = useMemo(
    () => hasMaintenanceCartItems(cartItems),
    [cartItems],
  );

  const presentCategories = useMemo(
    () => getPresentSaleCategories(cartItems),
    [cartItems],
  );

  useEffect(() => {
    if (hasMaintenanceItems) {
      setIsMaintenance(true);
    }
  }, [hasMaintenanceItems]);

  const computeSaleDiscountBase = useCallback(
    (scope: DiscountScope) =>
      computeDiscountBaseSubtotal(
        cartItems,
        exchangeRate,
        exchangeRateEur,
        scope,
      ),
    [cartItems, exchangeRate, exchangeRateEur],
  );

  const getCartSignature = useCallback(
    () =>
      JSON.stringify(
        cartItems.map((item) => ({
          sellable_id: item.sellable_id,
          sellable_type: item.sellable_type,
          quantity: item.quantity,
          selling_price: item.selling_price,
          discount_amount: item.discount_amount,
        })),
      ),
    [cartItems],
  );

  const discount = useOverallDiscount({
    presentCategories,
    computeDiscountBase: computeSaleDiscountBase,
    getItemsSignature: getCartSignature,
    buildApprovalPayload: ({
      amount,
      discountDraft,
      discountDraftType,
      discountScope,
      discountBaseSubtotal,
    }) => {
      const customerName =
        customers.find((customer) => customer.id === customerId)?.name ?? null;

      return {
        type: "sale_discount" as const,
        requested_discount_amount: amount,
        discount_input_type: discountDraftType,
        discount_input_value: discountDraft,
        cart_subtotal: discountBaseSubtotal,
        payload: {
          cart_items: cartItems.map((item) => {
            const rate = egpMultiplierForPricingCurrency(item.currency, {
              usdToEgp: exchangeRate,
              eurToEgp: exchangeRateEur,
            });
            const normalizedPrice =
              Math.round(Number(item.selling_price) * rate * 100) / 100;
            const normalizedDiscount =
              Math.round(Number(item.discount_amount) * rate * 100) / 100;
            const qty = Number(item.quantity) || 1;
            const lineTotal =
              Math.round(
                Math.max(0, normalizedPrice - normalizedDiscount) * qty * 100,
              ) / 100;

            return {
              sellable_type: item.sellable_type,
              sellable_id: item.sellable_id,
              item_name: item.item_name,
              selling_price: normalizedPrice,
              discount_amount: normalizedDiscount,
              quantity: qty,
              currency: "EGP",
              line_total: lineTotal,
            };
          }),
          sale_context: {
            customer_id: customerId,
            customer_name: customerName,
            seller_id: sellerId,
            sale_type: saleType,
            shipping_fee: shippingFee,
            is_maintenance: isMaintenance,
            discount_scope: scopeToPayload(discountScope, presentCategories),
            full_cart_subtotal: cartSubtotal,
          },
        },
      };
    },
    createApprovalRequest: async (token, payload) => {
      const record = await createSaleDiscountApprovalRequest(
        token,
        payload as Parameters<typeof createSaleDiscountApprovalRequest>[1],
      );
      return { id: record.id };
    },
    resolveScopeFromRecord: (record) =>
      resolveScopeFromApprovalContext(
        record.payload.sale_context?.discount_scope,
        record.payload.sale_context?.discount_includes_maintenance,
        presentCategories,
      ),
    persistMode: "local",
    itemsChangedNotice:
      "Discount request cancelled because the cart changed.",
    emptyItemsError: "Add items to the cart before applying a discount.",
  });

  const {
    isAdmin,
    approvedDiscount,
    discountApproval,
    activeDiscountRequestId,
    discountRequestStatus,
    discountBaseSubtotal,
    resolvedDiscountDraft,
    discountDraft,
    discountDraftType,
    discountScope,
    submitDiscountAction,
    setDiscountApproval,
    normalizeDiscountAmount,
  } = discount;

  const saleTotal = useMemo(
    () =>
      Math.round((cartSubtotal + shippingFee - approvedDiscount) * 100) / 100,
    [cartSubtotal, shippingFee, approvedDiscount],
  );

  const hasPendingItemApprovals = useMemo(
    () =>
      cartItems.some(
        (line) => line.discount_approval_request_pending === true,
      ),
    [cartItems],
  );

  const saleItemDiscountContext = useMemo(
    () => ({
      customer_id: customerId,
      customer_name:
        customers.find((customer) => customer.id === customerId)?.name ?? null,
      seller_id: sellerId,
      sale_type: saleType,
    }),
    [customerId, customers, sellerId, saleType],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // Validation
      if (!customerId) throw new Error("Please select a customer");
      if (!sellerId) throw new Error("Please select a seller");
      if (!paymentMethodId) throw new Error("Please select a payment method");
      if (cartItems.length === 0)
        throw new Error("Please add at least one item");
      if (hasPendingItemApprovals) {
        throw new Error(
          "Wait for admin approval of item discounts before finalizing.",
        );
      }
      if (shippingFee < 0) throw new Error("Shipping fee cannot be negative");
      const draftAmount = normalizeDiscountAmount(resolvedDiscountDraft);
      let saleDiscount = approvedDiscount;

      if (
        !isAdmin &&
        draftAmount > 0 &&
        discountRequestStatus === "pending" &&
        activeDiscountRequestId
      ) {
        throw new Error(
          "Wait for admin approval of the overall discount before finalizing.",
        );
      }

      if (draftAmount !== approvedDiscount) {
        if (draftAmount > 0) {
          if (!isAdmin) {
            await submitDiscountAction();
            throw new Error(
              "Submit the discount for admin approval and refresh the status before finalizing.",
            );
          }
          if (discountBaseSubtotal <= 0) {
            throw new Error(
              "Add items to the cart before applying a discount.",
            );
          }
          if (draftAmount > discountBaseSubtotal) {
            throw new Error(
              `Discount cannot exceed the discount base (${formatEgp(discountBaseSubtotal)} EGP).`,
            );
          }
          saleDiscount = draftAmount;
          setDiscountApproval({
            amount: draftAmount,
            inputType: discountDraftType,
            inputValue: discountDraft,
            scope: discountScope,
          });
        } else {
          saleDiscount = 0;
          setDiscountApproval(null);
        }
      }

      if (saleDiscount < 0) throw new Error("Overall discount cannot be negative");

      if (!isAdmin && saleDiscount > 0) {
        if (
          discountRequestStatus !== "approved" ||
          !activeDiscountRequestId ||
          !discountApproval?.requestId
        ) {
          throw new Error(
            "Wait for admin approval of the overall discount before finalizing.",
          );
        }
      }

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      // Create sale payload
      const payload: CreateSalePayload = {
        customer_id: customerId,
        seller_id: sellerId,
        payment_method_id: paymentMethodId,
        type: saleType,
        status: saleStatus,
        delivery_status: deliveryStatus as
          | "pending"
          | "in-transit"
          | "delivered",
        shipping_fee: Number(shippingFee) || 0,
        sale_discount: saleDiscount,
        ...(!isAdmin && saleDiscount > 0 && activeDiscountRequestId
          ? { discount_approval_request_id: activeDiscountRequestId }
          : {}),
        is_maintenance: isMaintenance,
        items: cartItems.map((item) => {
          // ── Currency Normalization ──────────────────────────────────────────
          const rate = egpMultiplierForPricingCurrency(item.currency, {
            usdToEgp: exchangeRate,
            eurToEgp: exchangeRateEur,
          });
          const qty = Number(item.quantity) || 1;
          const normalizedPrice =
            Math.round(Number(item.selling_price) * rate * 100) / 100;
          const normalizedLineDiscount =
            Math.round(Number(item.discount_amount) * rate * 100) / 100;
          const normalizedDiscount =
            Math.round((normalizedLineDiscount / qty) * 100) / 100;

          const lineItem: CreateSaleLineItemPayload = {
            selling_price: normalizedPrice,
            discount: normalizedDiscount,
            qty,
          };

          if (
            !isAdmin &&
            item.discount_approval_request_id &&
            normalizedDiscount > 0
          ) {
            lineItem.discount_approval_request_id =
              item.discount_approval_request_id;
          }

          // Map sellable_type to specific ID field
          if (item.sellable_type === "products") {
            lineItem.product_id = item.sellable_id;
          } else if (item.sellable_type === "spare_parts") {
            lineItem.spare_part_id = item.sellable_id;
          } else if (item.sellable_type === "bikes") {
            lineItem.bike_for_sale_id = item.sellable_id;
          } else if (item.sellable_type === "maintenance_services") {
            lineItem.maintenance_service_id = item.sellable_id;
          }

          return lineItem;
        }),
      };

      const sale = await createSale(token, payload);

      window.dispatchEvent(new Event(REFRESH_ALL_DATA_EVENT));
      router.refresh();
      router.push(`/inventory/sales/${sale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sale");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustomer = async (data: Record<string, unknown>) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      const payload: CreateCustomerPayload = {
        name: String(data.name ?? "").trim(),
        phone: String(data.phone ?? "").trim(),
        address: data.address ? String(data.address).trim() : undefined,
        how_did_you_know_us: data.how_did_you_know_us
          ? String(data.how_did_you_know_us).trim()
          : undefined,
        notes: data.notes ? String(data.notes).trim() : undefined,
      };

      if (!payload.name) throw new Error("Name is required");
      if (!payload.phone) throw new Error("Phone is required");

      const newCustomer = await createCustomer(token, payload);

      // Update customer list and select the new one
      setCustomers((prev) => [...prev, newCustomer]);
      setCustomerId(newCustomer.id);
      setCustomerModalOpen(false);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create customer",
      );
      throw err;
    }
  };

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const isRemoteSale = saleType === "online" || saleType === "delivery";
  const cartItemCount = cartItems.reduce(
    (n, item) => n + (Number(item.quantity) || 0),
    0,
  );

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-on-surface-variant font-medium uppercase tracking-widest text-xs">
            Preparing Workspace...
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        title="Create New Sale"
        actions={
          <ActionButton
            variant="outline"
            onClick={() => router.back()}
            className="gap-2 bg-surface hover:bg-surface-container"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Sales
          </ActionButton>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-error/30 bg-error-container p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm mb-6">
          <svg
            className="w-7 h-7 text-on-error-container flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex flex-col">
            <h4 className="text-on-error-container font-bold text-sm">
              Action Failed
            </h4>
            <p className="text-on-error-container/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-12">
        {/* Workspace: Cart + Catalogs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 xl:gap-8 items-start animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Quick-add Catalogs Sidebar */}
          <div className="lg:col-span-1 bg-surface-container-low border border-outline-variant/15 rounded-[1.5rem] p-5 shadow-sm top-6">
            <h3 className="text-center font-display text-lg font-bold text-on-surface mb-2">
              Add Items
            </h3>
            <div className="text-center flex flex-col gap-5">
              <button
                type="button"
                onClick={() => handleOpenCatalog("products")}
                className="group relative flex items-center gap-4 w-full p-2 rounded-xl border-2 border-transparent bg-primary/5 hover:bg-primary/10 hover:border-primary/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <CubeIcon className="w-7 h-7" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-m">Products</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCatalog("spare_parts")}
                className="group relative flex items-center gap-4 w-full p-2 rounded-xl border-2 border-transparent bg-primary/5 hover:bg-primary/10 hover:border-primary/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <CogIcon className="w-7 h-7" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-m">Spare Parts</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCatalog("bikes")}
                className="group relative flex items-center gap-4 w-full p-2 rounded-xl border-2 border-transparent bg-info/5 hover:bg-info/10 hover:border-info/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-on-info-container group-hover:scale-110 transition-transform">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-m">Bikes</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCatalog("maintenance_services")}
                className="group relative flex items-center gap-4 w-full p-2 rounded-xl border-2 border-transparent bg-warning/5 hover:bg-warning/10 hover:border-warning/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-on-warning-container group-hover:scale-110 transition-transform">
                  <WrenchIcon className="w-7 h-7" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-m">Services</span>
                </div>
              </button>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="lg:col-span-3 xl:col-span-4 self-stretch">
            <div className="text-left mb-4">
              <label className="label-capsr text-on-surface-variant flex items-center gap-2 mb-2">
                <TagIcon className="w-4 h-4" />
                Scan barcode / SKU
              </label>
              <div className="relative rounded-2xl border border-outline-variant/30 bg-surface shadow-sm hover:shadow-md transition-shadow focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                <input
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeSubmit();
                    }
                  }}
                  placeholder="Scan then press Enter"
                  className="w-full appearance-none bg-transparent py-3 pl-4 pr-4 text-sm font-medium text-on-surface outline-none"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              {barcodeError && (
                <p className="mt-2 text-xs font-medium text-error">
                  {barcodeError}
                </p>
              )}
              {barcodeBusy && (
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  Looking up item…
                </p>
              )}
            </div>
            <CartLineItemsPanel
              items={cartItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              shippingFee={shippingFee}
              saleDiscount={approvedDiscount}
              isAdmin={isAdmin}
              saleContext={saleItemDiscountContext}
              exchangeRate={exchangeRate}
              exchangeRateEur={exchangeRateEur}
            />
          </div>
        </div>
        {/* Transaction Details */}
        <SurfaceCard className="relative overflow-hidden border-outline-variant/20 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative space-y-8">
            <div className="flex flex-col gap-5 border-b border-outline-variant/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <BanknotesIcon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-on-surface">
                    Transaction Details
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-on-surface-variant">
                    Customer, payment, fulfillment, and pricing for this sale.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ReadyChip done={!!customerId} label="Customer" />
                <ReadyChip done={!!sellerId} label="Seller" />
                <ReadyChip done={!!paymentMethodId} label="Payment" />
                <ReadyChip done={cartItems.length > 0} label={`${cartItemCount} items`} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
              <FormSelect
                id="sale-customer"
                label="Customer"
                icon={UserIcon}
                required
                value={customerId || ""}
                onChange={(v) => setCustomerId(Number(v) || null)}
                placeholder="Select a customer…"
                placeholderSelectable={false}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.phone
                    ? `${customer.name} · ${customer.phone}`
                    : customer.name,
                }))}
                headerAction={
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(true)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 label-capsr text-primary transition-colors hover:bg-primary/10 hover:text-primary/80"
                  >
                    <PlusIcon className="h-3 w-3" aria-hidden />
                    New
                  </button>
                }
              />

              <FormSelect
                searchable={false}
                id="sale-seller"
                label="Seller"
                icon={UserCircleIcon}
                required
                value={sellerId || ""}
                onChange={(v) => setSellerId(Number(v) || null)}
                placeholder="Assign a seller…"
                placeholderSelectable={false}
                options={sellers.map((seller) => ({
                  value: seller.id,
                  label: seller.name,
                }))}
              />

              <FormSelect
                searchable={false}
                id="sale-payment"
                label="Payment method"
                icon={CreditCardIcon}
                required
                value={paymentMethodId || ""}
                onChange={(v) => setPaymentMethodId(Number(v) || null)}
                placeholder="Choose payment type…"
                placeholderSelectable={false}
                options={paymentMethods.map((method) => ({
                  value: method.id,
                  label: method.name,
                }))}
              />

              {selectedCustomer ? (
                <div className="col-span-full flex flex-col gap-1 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserIcon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">
                        {selectedCustomer.name}
                      </p>
                      {selectedCustomer.phone ? (
                        <p className="text-xs text-on-surface-variant">
                          {selectedCustomer.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {selectedCustomer.address ? (
                    <p className="text-xs text-on-surface-variant sm:max-w-[45%] sm:text-right truncate">
                      {selectedCustomer.address}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <FormSectionDivider title="Fulfillment" />

              <div className="col-span-full space-y-3">
                <span className="flex items-center gap-2 label-caps">
                  <ShoppingCartIcon className="h-4 w-4 shrink-0" aria-hidden />
                  Sale channel
                </span>
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-4"
                  role="radiogroup"
                  aria-label="Sale channel"
                >
                  {SALE_TYPE_OPTIONS.map((option) => {
                    const active = saleType === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setSaleType(option.value)}
                        className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${active
                          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                          : "border-outline-variant/30 bg-surface hover:border-primary/30 hover:bg-primary/5"
                          }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active
                            ? "bg-primary text-on-primary"
                            : "bg-surface-container-high text-on-surface-variant"
                            }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface">
                            {option.label}
                          </p>
                          <p className="mt-0.5 text-caption leading-snug text-on-surface-variant">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  <label className="group/check flex items-start gap-2 rounded-2xl border p-3.5 text-left transition-all items-center border border-outline-variant/30 bg-surface shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5 lg:col-span-1 lg:self-end">
                    <input
                      type="checkbox"
                      checked={isMaintenance}
                      onChange={(e) => setIsMaintenance(e.target.checked)}
                      className="sr-only"
                    />
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-outline-variant shadow-sm transition-all group-has-[:checked]/check:border-primary group-has-[:checked]/check:bg-primary">
                      <CheckIcon
                        className="h-4 w-4 scale-0 text-on-primary transition-transform group-has-[:checked]/check:scale-100"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-on-surface">
                        Maintenance operation
                      </span>
                      <p className="mt-0.5 text-caption text-on-surface-variant">
                        Includes Maintenance Services
                      </p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-on-warning-container opacity-70 group-has-[:checked]/check:opacity-100">
                      <WrenchIcon className="h-4 w-4" aria-hidden />
                    </div>
                  </label>
                </div>
              </div>

              <FormSelect
                searchable={false}
                id="sale-status"
                label="Sale status"
                icon={ShieldCheckIcon}
                value={saleStatus}
                disabled={!isRemoteSale}
                hint={
                  !isRemoteSale
                    ? "In-store sales are marked completed automatically."
                    : undefined
                }
                onChange={(v) =>
                  setSaleStatus(v as "pending" | "partial" | "completed")
                }
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "partial", label: "Partial" },
                  { value: "completed", label: "Completed" },
                ]}
              />

              <FormSelect
                searchable={false}
                id="sale-delivery-status"
                label="Delivery status"
                icon={TruckIcon}
                value={deliveryStatus}
                disabled={!isRemoteSale}
                hint={
                  !isRemoteSale
                    ? "Delivery tracking applies to online and delivery orders."
                    : undefined
                }
                onChange={setDeliveryStatus}
                options={[
                  { value: "pending", label: "Pending" },
                  { value: "in-transit", label: "In transit" },
                  { value: "delivered", label: "Delivered" },
                ]}
              />
              {isRemoteSale ? (
                  <FormMoneyInput
                    id="sale-shipping"
                    label="Shipping fee"
                    icon={CurrencyDollarIcon}
                    prefix="+"
                    value={shippingFee}
                    onChange={setShippingFee}
                  />
                ) : null}
              <FormSectionDivider title="Financial adjustments" />

              <div className="col-span-full">
                <OverallDiscountPanel
                  id="sale-discount"
                  label="Overall discount (whole sale)"
                  context="sale"
                  hasItems={cartItems.length > 0}
                  presentCategories={presentCategories}
                  computeDiscountBase={computeSaleDiscountBase}
                  discount={discount}
                  adminHint="Enter a fixed EGP amount or a percentage of the cart subtotal (after line discounts)."
                  staffHint="Enter a discount and request admin approval before finalizing the sale."
                  variant="embedded"
                />
              </div>

              <div className="col-span-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/90 p-4 md:p-5">
                <p className="mb-3 label-caps text-on-surface-variant">
                  Live total preview
                </p>
                <SaleTotalsSummary
                  breakdown={cartTotalsBreakdown}
                  shippingFee={shippingFee}
                  showShipping={isRemoteSale}
                  overallDiscount={approvedDiscount}
                  overallDiscountDraft={
                    normalizeDiscountAmount(resolvedDiscountDraft) !==
                      approvedDiscount
                      ? normalizeDiscountAmount(resolvedDiscountDraft)
                      : null
                  }
                  saleTotal={saleTotal}
                />
              </div>
            </div>
          </div>
        </SurfaceCard>
        {/* Global Action Footer */}
        <div className="sticky bottom-4 z-20 mt-8 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/20 shadow-ambient p-4 px-6 flex items-center justify-between flex-wrap gap-4 animate-in slide-in-from-bottom-8">
          <div className="flex items-center gap-6">
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Review your items and proceed
              </p>
            </div>


          </div>
          <div className="flex items-center gap-3">
            {saleTotal > 0 && (
              <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 shadow-sm">
                <span className="text-sm font-bold uppercase tracking-widest text-primary/80">
                  Total
                </span>
                <span className="text-base font-black text-primary font-mono tracking-tight">
                  {saleTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-bold text-primary/70 uppercase">EGP</span>
              </div>
            )}
            <ActionButton
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="text-on-surface"
            >
              Cancel
            </ActionButton>
            <ActionButton
              type="submit"
              tone="primary"
              variant="filled"
              disabled={
                submitting ||
                !customerId ||
                !sellerId ||
                !paymentMethodId ||
                cartItems.length === 0
              }
              className="min-w-[160px] text-base gap-2 px-8 py-3.5 shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Finalize Sale"
              )}
            </ActionButton>
          </div>
        </div>
      </form>

      {/* Catalog Picker Modal */}
      {activeCatalog && (
        <CatalogPickerModal
          isOpen={pickerOpen}
          onClose={handleCloseCatalog}
          catalogType={activeCatalog}
          onAddItems={handleAddItems}
        />
      )}
      {/* Quick Create Customer Modal */}
      <EntityDrawer
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title="Quick Customer Registration"
        description="Add a new customer to the system without leaving the sales flow."
        fields={customerFields}
        onSubmit={handleCreateCustomer}
        submitLabel="Register & Select"
        heroLabel="New Customer"
      />

    </PageShell>
  );
}
