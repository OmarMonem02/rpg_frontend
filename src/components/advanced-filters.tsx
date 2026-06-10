import React from "react";
import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";
import { FilterBar, InputGroup } from "@/components/ops-ui";

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
    <FilterBar className="md:grid-cols-12">
      {showCurrencyFilter && (
        <InputGroup label="Currency" className="md:col-span-4">
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="form-input-base py-2 text-sm"
          >
            <option value="all">All Currencies</option>
            {SUPPORTED_PRICING_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </InputGroup>
      )}
      {showPriceFilters ? (
        <>
          <InputGroup label="Min Price" className="md:col-span-4">
            <input
              type="number"
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              value={priceMin ?? ""}
              onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : "")}
              className="form-input-base py-2 text-sm mono-data [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
            />
          </InputGroup>
          <InputGroup label="Max Price" className="md:col-span-4">
            <input
              type="number"
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
              value={priceMax ?? ""}
              onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : "")}
              className="form-input-base py-2 text-sm mono-data [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="No limit"
            />
          </InputGroup>
        </>
      ) : null}
    </FilterBar>
  );
}
