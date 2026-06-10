"use client";

import { useCallback, useState } from "react";

export type QuickEditDraft = Record<string, string>;

export function useQuickEditRow() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<QuickEditDraft>({});
  const [original, setOriginal] = useState<QuickEditDraft>({});
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const isEditing = useCallback(
    (id: number) => editingId === id,
    [editingId],
  );

  const startEdit = useCallback(
    (id: number, values: Record<string, string | number>) => {
      const stringValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, String(value)]),
      );
      setEditingId(id);
      setDraft(stringValues);
      setOriginal(stringValues);
      setRowError(null);
    },
    [],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraft({});
    setOriginal({});
    setRowError(null);
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getChangedKeys = useCallback(
    (keys: string[]) =>
      keys.filter((key) => draft[key] !== undefined && draft[key] !== original[key]),
    [draft, original],
  );

  const hasChanges = useCallback(
    (keys: string[]) => getChangedKeys(keys).length > 0,
    [getChangedKeys],
  );

  const saveEdit = useCallback(
    async (
      keys: string[],
      validate: (draft: QuickEditDraft) => string | null,
      onPersist: (changes: QuickEditDraft) => Promise<void>,
    ) => {
      const validationError = validate(draft);
      if (validationError) {
        setRowError(validationError);
        return;
      }

      const changedKeys = getChangedKeys(keys);
      if (changedKeys.length === 0) {
        cancelEdit();
        return;
      }

      const changes = Object.fromEntries(
        changedKeys.map((key) => [key, draft[key]]),
      );

      setSaving(true);
      setRowError(null);
      try {
        await onPersist(changes);
        cancelEdit();
      } catch (err) {
        setRowError(err instanceof Error ? err.message : "Failed to save changes");
      } finally {
        setSaving(false);
      }
    },
    [cancelEdit, draft, getChangedKeys],
  );

  return {
    editingId,
    draft,
    saving,
    rowError,
    isEditing,
    startEdit,
    cancelEdit,
    updateField,
    hasChanges,
    saveEdit,
  };
}

export function validateNonEmptyName(draft: QuickEditDraft, key = "name"): string | null {
  if (!(key in draft)) return null;
  if (!draft[key]?.trim()) return "Name is required";
  return null;
}

export function validateNonNegativeIntegers(
  draft: QuickEditDraft,
  keys: string[],
): string | null {
  for (const key of keys) {
    if (!(key in draft)) continue;
    const value = Number(draft[key]);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return `${key.replace(/_/g, " ")} must be a whole number ≥ 0`;
    }
  }
  return null;
}

export function validateNonNegativeNumbers(
  draft: QuickEditDraft,
  keys: string[],
): string | null {
  for (const key of keys) {
    if (!(key in draft)) continue;
    const value = Number(draft[key]);
    if (!Number.isFinite(value) || value < 0) {
      return `${key.replace(/_/g, " ")} must be a number ≥ 0`;
    }
  }
  return null;
}

export function combineValidators(
  ...validators: Array<(draft: QuickEditDraft) => string | null>
): (draft: QuickEditDraft) => string | null {
  return (draft) => {
    for (const validate of validators) {
      const error = validate(draft);
      if (error) return error;
    }
    return null;
  };
}
