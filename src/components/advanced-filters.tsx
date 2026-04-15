import React from "react";

type AdvancedFiltersProps = {
  priceMin?: number;
  setPriceMin: (value: number | "") => void;
  priceMax?: number;
  setPriceMax: (value: number | "") => void;
  currency?: string;
  setCurrency: (value: string) => void;
  showPriceFilters?: boolean;
  showCurrencyFilter?: boolean;
};

export function AdvancedFilters({
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  currency = "all",
  setCurrency,
  showPriceFilters = true,
  showCurrencyFilter = true,
}: AdvancedFiltersProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
      {showPriceFilters && (
        <>
          <div>
            <label htmlFor="price-min" style={{ display: "block", fontSize: "12px", fontWeight: "500", marginBottom: "4px" }}>
              Min Price
            </label>
            <input
              id="price-min"
              type="number"
              placeholder="Min Price"
              value={priceMin ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setPriceMin(val === "" ? "" : Number(val));
              }}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>

          <div>
            <label htmlFor="price-max" style={{ display: "block", fontSize: "12px", fontWeight: "500", marginBottom: "4px" }}>
              Max Price
            </label>
            <input
              id="price-max"
              type="number"
              placeholder="Max Price"
              value={priceMax ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setPriceMax(val === "" ? "" : Number(val));
              }}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
          </div>
        </>
      )}

      {showCurrencyFilter && (
        <div>
          <label htmlFor="currency" style={{ display: "block", fontSize: "12px", fontWeight: "500", marginBottom: "4px" }}>
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #e0e0e0",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Currencies</option>
            <option value="EGP">EGP</option>
            <option value="USD">USD</option>
          </select>
        </div>
      )}
    </div>
  );
}
