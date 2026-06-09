"use client";

import {
  clampRawDiscountValue,
  convertDiscountBetweenTypes,
  resolveDiscountAmount,
  type DiscountInputType,
} from "@/lib/discount-input";
import {
  formatScopeSummary,
  getVisibleScopeOptions,
  isAllScopeSelected,
  setAllScopeSelected,
  shouldShowAllOption,
  SCOPE_OPTION_LABELS,
  toggleScopeCategory,
  type DiscountScope,
  type DiscountScopeCategory,
  type DiscountScopeContext,
} from "@/lib/discount-scope";
import { formatEgp } from "@/lib/currencies";

type OverallDiscountScopeSelectorProps = {
  presentCategories: DiscountScopeCategory[];
  scope: DiscountScope;
  context: DiscountScopeContext;
  discountBaseSubtotal: number;
  discountDraft: number;
  discountDraftType: DiscountInputType;
  computeDiscountBase: (scope: DiscountScope) => number;
  onScopeChange: (scope: DiscountScope, discountDraft: number) => void;
  disabled?: boolean;
};

function recalculateDiscountDraft(
  discountDraftType: DiscountInputType,
  discountDraft: number,
  currentBase: number,
  nextBase: number,
): number {
  const currentResolved = resolveDiscountAmount(
    discountDraftType,
    discountDraft,
    currentBase,
  );
  const nextRaw =
    discountDraftType === "percentage"
      ? convertDiscountBetweenTypes(
          "fixed",
          "percentage",
          currentResolved,
          nextBase,
        )
      : Math.min(discountDraft, nextBase);
  return clampRawDiscountValue(
    discountDraftType,
    nextRaw,
    nextBase,
    nextBase,
  );
}

export function OverallDiscountScopeSelector({
  presentCategories,
  scope,
  context,
  discountBaseSubtotal,
  discountDraft,
  discountDraftType,
  computeDiscountBase,
  onScopeChange,
  disabled = false,
}: OverallDiscountScopeSelectorProps) {
  const visibleOptions = getVisibleScopeOptions(presentCategories, context);
  const showAll = shouldShowAllOption(presentCategories);
  const allSelected = isAllScopeSelected(scope, presentCategories);
  const optionCount = visibleOptions.length + (showAll ? 1 : 0);
  const gridColsClass =
    (
      {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
      } as const
    )[optionCount] ?? "grid-cols-1";

  if (presentCategories.length === 0) {
    return null;
  }

  const applyScopeChange = (nextScope: DiscountScope) => {
    const nextBase = computeDiscountBase(nextScope);
    const nextDraft = recalculateDiscountDraft(
      discountDraftType,
      discountDraft,
      discountBaseSubtotal,
      nextBase,
    );
    onScopeChange(nextScope, nextDraft);
  };

  const handleCategoryToggle = (category: DiscountScopeCategory) => {
    const nextScope = toggleScopeCategory(
      scope,
      category,
      presentCategories,
    );
    if (nextScope === scope) return;
    applyScopeChange(nextScope);
  };

  const handleAllToggle = () => {
    applyScopeChange(
      setAllScopeSelected(scope, presentCategories, !allSelected),
    );
  };

  const optionButtonClass = (selected: boolean) =>
    `rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all ${
      selected
        ? "border-primary bg-primary/10 text-on-surface shadow-sm ring-1 ring-primary/20"
        : "border-outline-variant/30 bg-surface text-on-surface-variant hover:border-primary/30 hover:bg-primary/5"
    }`;

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3">
      <p className="label-caps text-on-surface-variant">Overall discount scope</p>
      <div
        className={`mt-2 grid ${gridColsClass} gap-1.5`}
        role="group"
        aria-label="Overall discount scope categories"
      >
        {visibleOptions.map((category) => (
          <button
            key={category}
            type="button"
            role="checkbox"
            aria-checked={scope[category]}
            disabled={disabled || (presentCategories.length === 1 && scope[category])}
            onClick={() => handleCategoryToggle(category)}
            className={optionButtonClass(scope[category])}
          >
            {SCOPE_OPTION_LABELS[category]}
          </button>
        ))}
        {showAll ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected}
            disabled={disabled}
            onClick={handleAllToggle}
            className={optionButtonClass(allSelected)}
          >
            All
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">
        Discount base: {formatEgp(discountBaseSubtotal)} EGP (
        {formatScopeSummary(scope, presentCategories)})
      </p>
    </div>
  );
}
