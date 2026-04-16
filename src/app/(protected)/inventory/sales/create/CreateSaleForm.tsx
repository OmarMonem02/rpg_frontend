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
import { PageShell, ActionButton } from "@/components/ops-ui";

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
      router.push(`/sales/${sale.id}`);
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
        <div className="flex items-center justify-center h-80">
          <p className="text-on-surface-variant">Loading...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-display font-600 text-on-surface mb-2">
            Create Sale
          </h1>
          <p className="text-on-surface-variant">
            Build a new sale by selecting items from multiple catalogs
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl bg-error/10 border border-error/30 px-5 py-3">
            <p className="text-error text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Form Section */}
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-6">
            <h2 className="font-display font-600 text-lg text-on-surface mb-4">
              Sale Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Customer *
                </label>
                <select
                  required
                  value={customerId || ""}
                  onChange={(e) => setCustomerId(Number(e.target.value) || null)}
                  className="form-input-base"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seller */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Seller *
                </label>
                <select
                  required
                  value={sellerId || ""}
                  onChange={(e) => setSellerId(Number(e.target.value) || null)}
                  className="form-input-base"
                >
                  <option value="">Select a seller</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Payment Method *
                </label>
                <select
                  required
                  value={paymentMethodId || ""}
                  onChange={(e) => setPaymentMethodId(Number(e.target.value) || null)}
                  className="form-input-base"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sale Type */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Sale Type
                </label>
                <select
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value as "site" | "online" | "delivery")}
                  className="form-input-base"
                >
                  <option value="site">Site</option>
                  <option value="online">Online</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>

              {/* Delivery Status */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Delivery Status
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  className="form-input-base"
                >
                  <option value="pending">Pending</option>
                  <option value="in-transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              {/* Is Maintenance */}
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMaintenance}
                    onChange={(e) => setIsMaintenance(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-outline-variant accent-primary cursor-pointer"
                  />
                  <span className="text-sm font-medium text-on-surface">
                    Mark as Maintenance
                  </span>
                </label>
              </div>

              {/* Shipping Fee */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Shipping Fee
                </label>
                <input
                  type="number"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="form-input-base"
                  placeholder="0.00"
                />
              </div>

              {/* Sale Discount */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Sale Discount
                </label>
                <input
                  type="number"
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="form-input-base"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Catalog Buttons & Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-96">
            {/* Catalog Buttons */}
            <div className="lg:col-span-1 space-y-3 flex flex-col">
              <button
                type="button"
                onClick={() => handleOpenCatalog("products")}
                className="flex-1 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
              >
                + Products
              </button>
              <button
                type="button"
                onClick={() => handleOpenCatalog("spare_parts")}
                className="flex-1 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
              >
                + Spare Parts
              </button>
              <button
                type="button"
                onClick={() => handleOpenCatalog("bikes")}
                className="flex-1 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
              >
                + Bikes For Sale
              </button>
              <button
                type="button"
                onClick={() => handleOpenCatalog("maintenance_services")}
                className="flex-1 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium transition-colors"
              >
                + Services
              </button>
            </div>

            {/* Cart Panel */}
            <div className="lg:col-span-3">
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

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 rounded-lg bg-surface hover:bg-surface-container text-on-surface font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting || !customerId || !sellerId || !paymentMethodId || cartItems.length === 0
              }
              className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-medium transition-colors"
            >
              {submitting ? "Creating Sale..." : "Create Sale"}
            </button>
          </div>
        </form>
      </div>

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
