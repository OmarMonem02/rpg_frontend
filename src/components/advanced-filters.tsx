import React from "react";
import { SUPPORTED_PRICING_CURRENCIES } from "@/lib/currencies";
import { FilterBar, InputGroup, SearchableSelect } from "@/components/ops-ui";

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
          <SearchableSelect
            id="currency"
            value={currency}
            onChange={setCurrency}
            options={[
              { value: "all", label: "All Currencies" },
              ...SUPPORTED_PRICING_CURRENCIES.map((code) => ({
                value: code,
                label: code,
              })),
            ]}
            className="form-input-base py-2 text-sm"
          />
        </InputGroup>
      )}
      {showPriceFilters ? (
        <>
          <InputGroup label="Min Price" className="md:col-span-4">
            <input
              type="number"
              onWheel={(event) => {
                event.currentTarget.blur();
              }}
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
