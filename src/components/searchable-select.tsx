"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export type SearchableSelectOption = {
  value: string | number;
  label: string;
  disabled?: boolean;
};

export type SearchableSelectProps = {
  id?: string;
  name?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: readonly SearchableSelectOption[];
  placeholder?: string;
  /** When false, the placeholder row is disabled (required picks). Default true. */
  placeholderSelectable?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Show a search field in the dropdown. Default true. */
  searchable?: boolean;
};

type DropdownPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

const DROPDOWN_GAP = 4;
const DROPDOWN_MAX_HEIGHT = 280;

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function toValueKey(value: string | number): string {
  return String(value);
}

function matchesQuery(label: string, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return label.toLowerCase().includes(normalized);
}

function measureDropdownPosition(trigger: HTMLElement): DropdownPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP;
  const spaceAbove = rect.top - DROPDOWN_GAP;
  const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    DROPDOWN_MAX_HEIGHT,
    Math.max(120, openUp ? spaceAbove : spaceBelow),
  );

  return {
    left: rect.left,
    width: rect.width,
    top: openUp ? undefined : rect.bottom + DROPDOWN_GAP,
    bottom: openUp ? window.innerHeight - rect.top + DROPDOWN_GAP : undefined,
    maxHeight,
  };
}

export function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  placeholderSelectable = true,
  disabled = false,
  required = false,
  className = "form-input-base",
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  searchPlaceholder = "Search…",
  emptyMessage = "No matches found",
  searchable = true,
}: SearchableSelectProps) {
  const mounted = useIsMounted();
  const autoId = useId();
  const controlId = id ?? autoId;
  const listboxId = `${controlId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(
    null,
  );

  const valueKey = toValueKey(value);

  const allOptions = useMemo(() => {
    if (!placeholder) return options;
    if (options.some((option) => toValueKey(option.value) === "")) {
      return options;
    }
    return [
      {
        value: "",
        label: placeholder,
        disabled: !placeholderSelectable,
      },
      ...options,
    ];
  }, [options, placeholder, placeholderSelectable]);

  const selectedOption = allOptions.find(
    (option) => toValueKey(option.value) === valueKey,
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return allOptions;
    return allOptions.filter(
      (option) =>
        toValueKey(option.value) === "" || matchesQuery(option.label, query),
    );
  }, [allOptions, query]);

  const selectableOptions = filteredOptions.filter((option) => !option.disabled);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlightIndex(0);
    setDropdownPosition(null);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setDropdownPosition(measureDropdownPosition(trigger));
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    updateDropdownPosition();
    setOpen(true);
    const selectedIndex = filteredOptions.findIndex(
      (option) => toValueKey(option.value) === valueKey,
    );
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [disabled, filteredOptions, updateDropdownPosition, valueKey]);

  const selectOption = useCallback(
    (option: SearchableSelectOption) => {
      if (option.disabled) return;
      onChange(toValueKey(option.value));
      close();
    },
    [close, onChange],
  );

  useEffect(() => {
    if (!open || !searchable) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const highlighted = listRef.current.querySelector<HTMLElement>(
      `[data-highlighted="true"]`,
    );
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (open && !searchable) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((current) =>
          Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const option =
          filteredOptions[highlightIndex] ??
          selectableOptions[0];
        if (option) {
          selectOption(option);
        }
        return;
      }
    }

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDropdown();
      return;
    }

    if (
      searchable &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setQuery(event.key);
      updateDropdownPosition();
      setOpen(true);
      setHighlightIndex(0);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option =
        filteredOptions[highlightIndex] ??
        selectableOptions[0];
      if (option) {
        selectOption(option);
      }
    }
  };

  const displayLabel =
    selectedOption && toValueKey(selectedOption.value) !== ""
      ? selectedOption.label
      : placeholder ?? selectedOption?.label ?? "Select option";

  const showPlaceholderStyle =
    !selectedOption || toValueKey(selectedOption.value) === "";

  const dropdownStyle: CSSProperties | undefined = dropdownPosition
    ? {
        position: "fixed",
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        top: dropdownPosition.top,
        bottom: dropdownPosition.bottom,
        maxHeight: dropdownPosition.maxHeight,
        zIndex: 200,
      }
    : undefined;

  const dropdownPanel = open && dropdownPosition ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="overflow-hidden rounded-xl border border-outline-variant/25 bg-surface shadow-ambient"
    >
      {searchable ? (
        <div className="border-b border-outline-variant/15 p-2">
          <div className="relative">

            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              aria-controls={listboxId}
              aria-autocomplete="list"
            />
          </div>
        </div>
      ) : null}

      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={controlId}
        className="max-h-60 overflow-y-auto p-1"
        style={{
          maxHeight: searchable
            ? Math.max(dropdownPosition.maxHeight - 56, 80)
            : dropdownPosition.maxHeight,
        }}
      >
        {filteredOptions.length === 0 ? (
          <li className="px-3 py-2 text-sm text-on-surface-variant">
            {emptyMessage}
          </li>
        ) : (
          filteredOptions.map((option, index) => {
            const optionKey = toValueKey(option.value);
            const isSelected = optionKey === valueKey;
            const isHighlighted = index === highlightIndex;

            return (
              <li
                key={`${optionKey}-${option.label}`}
                role="option"
                aria-selected={isSelected}
                data-highlighted={isHighlighted ? "true" : undefined}
                onMouseEnter={() => setHighlightIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
                  option.disabled
                    ? "cursor-not-allowed text-on-surface-variant/50"
                    : isHighlighted
                      ? "bg-primary/10 text-on-surface"
                      : "text-on-surface hover:bg-surface-container-high"
                } ${isSelected ? "font-medium" : ""}`}
              >
                {option.label}
              </li>
            );
          })
        )}
      </ul>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        id={controlId}
        name={name}
        disabled={disabled}
        aria-required={required || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className={`${className} flex items-center justify-between gap-2 text-left`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${showPlaceholderStyle ? "text-on-surface-variant/70" : ""}`}
        >
          {displayLabel}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {mounted && dropdownPanel
        ? createPortal(dropdownPanel, document.body)
        : null}
    </div>
  );
}
