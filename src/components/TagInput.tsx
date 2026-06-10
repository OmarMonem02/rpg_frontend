"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { ActionButton } from "@/components/ops-ui";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  addButtonLabel?: string;
  disabled?: boolean;
  description?: string;
};

function normalizeTag(tag: string): string {
  return tag.trim();
}

function hasTag(tags: string[], tag: string): boolean {
  const key = tag.toLowerCase();
  return tags.some((existing) => existing.toLowerCase() === key);
}

export function TagInput({
  value,
  onChange,
  label,
  placeholder = "e.g., Black",
  addButtonLabel = "Add tag",
  disabled = false,
  description,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const addTag = useCallback(() => {
    const trimmed = normalizeTag(draft);
    if (!trimmed || hasTag(value, trimmed)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }, [draft, onChange, value]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    },
    [onChange, value],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label className="label-caps text-on-surface-variant">{label}</label>
      ) : null}
      {description ? (
        <p className="text-xs text-on-surface-variant/80">{description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="form-input-base min-w-[12rem] flex-1"
        />
        <ActionButton
          type="button"
          tone="default"
          onClick={addTag}
          disabled={disabled || !normalizeTag(draft)}
        >
          {addButtonLabel}
        </ActionButton>
      </div>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="form-chip inline-flex items-center gap-2 border-primary/20 bg-primary-container text-on-primary-container transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {tag}
              <span aria-hidden className="text-on-primary-container/70">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
