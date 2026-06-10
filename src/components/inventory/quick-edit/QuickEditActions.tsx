"use client";

import {
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type QuickEditActionsProps = {
  isEditing: boolean;
  saving?: boolean;
  canSave?: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  showQuickEdit?: boolean;
  children?: React.ReactNode;
};

function SaveSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

export function QuickEditActions({
  isEditing,
  saving = false,
  canSave = true,
  onStartEdit,
  onSave,
  onCancel,
  showQuickEdit = true,
  children,
}: QuickEditActionsProps) {
  if (isEditing) {
    const saveDisabled = saving || !canSave;

    return (
      <div
        className="inline-flex flex-nowrap items-center gap-1.5 rounded-xl bg-surface-container-low p-1 shadow-sm ring-1 ring-inset ring-outline-variant/15"
        role="toolbar"
        aria-label="Quick edit controls"
      >
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            saveDisabled
              ? "cursor-not-allowed text-on-surface-variant/45"
              : "bg-success/12 text-on-success-container hover:bg-success/18"
          }`}
          title={canSave ? "Save changes" : "No changes to save"}
          aria-label="Save changes"
        >
          {saving ? (
            <SaveSpinner />
          ) : (
            <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{saving ? "Saving…" : "Save"}</span>
        </button>
        <span
          className="h-5 w-px shrink-0 bg-outline-variant/25"
          aria-hidden
        />
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
          title="Cancel editing"
          aria-label="Cancel editing"
        >
          <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
          <span>Cancel</span>
        </button>
      </div>
    );
  }

  const hasChildren = Boolean(children);

  return (
    <div className="group/actions inline-flex max-w-full flex-nowrap items-center justify-end gap-1 rounded-xl bg-surface-container-lowest/90 p-1 ring-1 ring-inset ring-outline-variant/15">
      {showQuickEdit ? (
        <button
          type="button"
          onClick={onStartEdit}
          className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-inset ring-primary/20 transition-all hover:bg-primary/15 hover:ring-primary/30"
          title="Quick edit row"
          aria-label="Quick edit row"
        >
          Quick Edit
        </button>
      ) : null}

      {showQuickEdit && hasChildren ? (
        <span
          className="mx-0.5 h-5 w-px shrink-0 bg-outline-variant/25"
          aria-hidden
        />
      ) : null}

      {hasChildren ? (
        <div className="inline-flex shrink-0 flex-nowrap items-center gap-0.5 opacity-75 transition-opacity group-hover/actions:opacity-100">
          {children}
        </div>
      ) : null}
    </div>
  );
}
