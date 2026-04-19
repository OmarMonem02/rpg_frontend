"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getSettings } from "@/lib/api/settings";
import {
  createSale,
  listCustomers,
  listSellers,
  listPaymentMethods,
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
import { CatalogPickerModal } from "@/components/catalog-picker-modal";
import { CartLineItemsPanel, type SaleLineItem } from "@/components/cart-line-items-panel";
import { PageShell, ActionButton, PageHero, SurfaceCard } from "@/components/ops-ui";
import { CubeIcon, WrenchIcon, BanknotesIcon, CogIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

type CatalogType = "products" | "spare_parts" | "bikes" | "maintenance_services";

export function CreateSaleForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [sellers, setSellers] = useState<SellerRecord[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0);

  // Form header state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [saleType, setSaleType] = useState<"site" | "online" | "delivery">("site");
  const [deliveryStatus, setDeliveryStatus] = useState("pending");
  const [shippingFee, setShippingFee] = useState(0);
  const [saleDiscount, setSaleDiscount] = useState(0);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Cart state
  const [cartItems, setCartItems] = useState<SaleLineItem[]>([]);
  const [tempItemCounter, setTempItemCounter] = useState(0);

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

        const [customersRes, sellersRes, paymentRes, settingsRes] = await Promise.all([
          listCustomers(token, 1),
          listSellers(token, 1),
          listPaymentMethods(token, 1),
          getSettings(token),
        ]);

        setCustomers(customersRes.items);
        setSellers(sellersRes.items);
        setPaymentMethods(paymentRes.items);
        setExchangeRate(settingsRes.exchange_rate ?? 0);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dependencies"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDependencies();
  }, []);

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
      items: (ProductRecord | SparePartRecord | BikeRecord | MaintenanceServiceRecord)[]
    ) => {
      const newItems: SaleLineItem[] = items.map((item) => {
        // Determine sellable_type and get pricing
        let sellableType: "products" | "spare_parts" | "bikes" | "maintenance_services";
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
          quantity: sellableType === "bikes" ? 1 : 1,
          currency: ("currency_pricing" in item ? item.currency_pricing : "EGP") as "EGP" | "USD",
          catalogItem: item,
        };
      });

      setCartItems((prev) => [...prev, ...newItems]);
      setTempItemCounter((prev) => prev + items.length);
    },
    [tempItemCounter]
  );

  const handleUpdateItem = (itemId: string | number, updates: Partial<SaleLineItem>) => {
    setCartItems((prev) =>
      prev.map((item) =>
        (item.id || item.sellable_id) === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const handleDeleteItem = (itemId: string | number) => {
    setCartItems((prev) =>
      prev.filter((item) => (item.id || item.sellable_id) !== itemId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      // Validation
      if (!customerId) throw new Error("Please select a customer");
      if (!sellerId) throw new Error("Please select a seller");
      if (!paymentMethodId) throw new Error("Please select a payment method");
      if (cartItems.length === 0) throw new Error("Please add at least one item");

      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      // Create sale payload
      const payload: CreateSalePayload = {
        customer_id: customerId,
        seller_id: sellerId,
        payment_method_id: paymentMethodId,
        type: saleType,
        status: "pending",
        items: cartItems.map((item) => {
          const lineItem: CreateSaleLineItemPayload = {
            selling_price: Number(item.selling_price) || 0,
            discount: Number(item.discount_amount) || 0,
            qty: Number(item.quantity) || 1,
          };

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

      console.log("Sale payload:", payload);
      const sale = await createSale(token, payload);

      // Success
      console.log("Sale created successfully:", sale);
      router.push(`/inventory/sales/${sale.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create sale"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
          <p className="text-on-surface-variant font-medium uppercase tracking-widest text-xs">Preparing Workspace...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        title="Create New Sale"
        description="Build a new transaction by selecting products, services, or bikes, and finalizing payment details."
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
        <div className="rounded-2xl border border-error/30 bg-error-container p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <svg className="w-5 h-5 text-on-error-container flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex flex-col">
            <h4 className="text-on-error-container font-bold text-sm">Action Failed</h4>
            <p className="text-on-error-container/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-12">
        {/* Top Info Grid */}
        <SurfaceCard className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm border-outline-variant/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <BanknotesIcon className="w-64 h-64 -translate-y-12 translate-x-12" />
          </div>
          
          <div className="relative">
            <div className="mb-6 pb-4 border-b border-outline-variant/15 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl text-on-surface tracking-tight">
                  Transaction Details
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">Configure the core parameters of this sale</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Customer */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  Customer <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={customerId || ""}
                    onChange={(e) => setCustomerId(Number(e.target.value) || null)}
                    className="form-input-base w-full appearance-none pr-10 bg-surface shadow-sm"
                  >
                    <option value="" disabled>Select a customer...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-on-surface-variant">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Seller */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  Seller <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={sellerId || ""}
                    onChange={(e) => setSellerId(Number(e.target.value) || null)}
                    className="form-input-base w-full appearance-none pr-10 bg-surface shadow-sm"
                  >
                    <option value="" disabled>Assign a seller...</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-on-surface-variant">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  Payment Method <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={paymentMethodId || ""}
                    onChange={(e) => setPaymentMethodId(Number(e.target.value) || null)}
                    className="form-input-base w-full appearance-none pr-10 bg-surface shadow-sm"
                  >
                    <option value="" disabled>Choose payment type...</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-on-surface-variant">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-3 border-t border-outline-variant/10 my-2 pt-6 pb-2" />

              {/* Sale Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Sale Type
                </label>
                <div className="relative">
                  <select
                    value={saleType}
                    onChange={(e) => setSaleType(e.target.value as "site" | "online" | "delivery")}
                    className="form-input-base w-full appearance-none bg-surface shadow-sm"
                  >
                    <option value="site">In-store (Site)</option>
                    <option value="online">Online Order</option>
                    <option value="delivery">Delivery</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-on-surface-variant">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Delivery Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Delivery Status
                </label>
                <div className="relative">
                  <select
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value)}
                    className="form-input-base w-full appearance-none bg-surface shadow-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-on-surface-variant">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Shipping Fee */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Shipping Fee (EGP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={shippingFee || ""}
                    onChange={(e) => setShippingFee(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="form-input-base pl-9 shadow-sm"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant font-medium">
                    +
                  </div>
                </div>
              </div>

              {/* Base Sale Discount */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Overall Discount (EGP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={saleDiscount || ""}
                    onChange={(e) => setSaleDiscount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    className="form-input-base pl-9 shadow-sm"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-error font-medium">
                    -
                  </div>
                </div>
              </div>

              {/* Is Maintenance Checkbox */}
              <div className="space-y-2 flex items-center pt-7 lg:pl-6">
                <label className="relative flex cursor-pointer items-center p-3 rounded-xl border border-outline-variant/15 hover:bg-surface-container/50 transition-colors w-full bg-surface shadow-sm group">
                  <input
                    type="checkbox"
                    checked={isMaintenance}
                    onChange={(e) => setIsMaintenance(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-5 rounded border-2 border-outline-variant peer-checked:border-primary peer-checked:bg-primary transition-all flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                    Mark as Maintenance Operation
                  </span>
                </label>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {/* Workspace: Cart + Catalogs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 xl:gap-8 items-start animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Quick-add Catalogs Sidebar */}
          <div className="lg:col-span-1 bg-surface-container-low border border-outline-variant/15 rounded-[1.5rem] p-5 shadow-sm sticky top-6">
            <h3 className="font-display text-lg font-bold text-on-surface mb-2">Item Catalogs</h3>
            <p className="text-xs text-on-surface-variant font-medium mb-6">Select a catalog to add lines to your sale cart.</p>
            
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleOpenCatalog("products")}
                className="group relative flex items-center gap-4 w-full p-4 rounded-xl border-2 border-transparent bg-primary/5 hover:bg-primary/10 hover:border-primary/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <CubeIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm">Products</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">General merchandise</span>
                </div>
                <div className="absolute right-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">+</div>
              </button>
              
              <button
                type="button"
                onClick={() => handleOpenCatalog("spare_parts")}
                className="group relative flex items-center gap-4 w-full p-4 rounded-xl border-2 border-transparent bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
                  <CogIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm">Spare Parts</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Components & fixing</span>
                </div>
                <div className="absolute right-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">+</div>
              </button>
              
              <button
                type="button"
                onClick={() => handleOpenCatalog("bikes")}
                className="group relative flex items-center gap-4 w-full p-4 rounded-xl border-2 border-transparent bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm">Bikes</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Whole units for sale</span>
                </div>
                <div className="absolute right-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">+</div>
              </button>
              
              <button
                type="button"
                onClick={() => handleOpenCatalog("maintenance_services")}
                className="group relative flex items-center gap-4 w-full p-4 rounded-xl border-2 border-transparent bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/20 text-on-surface transition-all overflow-hidden"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
                  <WrenchIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm">Services</span>
                  <span className="text-[10px] text-on-surface-variant font-medium">Labor & maintenance</span>
                </div>
                <div className="absolute right-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">+</div>
              </button>
            </div>
          </div>

          {/* Cart Panel */}
          <div className="lg:col-span-3 xl:col-span-4 self-stretch">
            <CartLineItemsPanel
              items={cartItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              shippingFee={shippingFee}
              saleDiscount={saleDiscount}
              exchangeRate={exchangeRate}
            />
          </div>
        </div>

        {/* Global Action Footer */}
        <div className="sticky bottom-4 z-20 mt-8 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant/20 shadow-ambient p-4 px-6 flex items-center justify-between flex-wrap gap-4 animate-in slide-in-from-bottom-8">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
            Review your items and proceed
          </p>
          <div className="flex items-center gap-3">
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
                submitting || !customerId || !sellerId || !paymentMethodId || cartItems.length === 0
              }
              className="min-w-[160px] text-base gap-2 px-8 py-3.5 shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
    </PageShell>
  );
}
