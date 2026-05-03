"use client";

import { EntityForm, type FieldConfig, type EntityFormProps } from "./entity-form";

export type { FieldConfig };

export type EntityFormModalProps = Omit<EntityFormProps, "onCancel" | "variant"> & {
  isOpen: boolean;
  onClose: () => void;
};

export function EntityFormModal({
  isOpen,
  onClose,
  ...props
}: EntityFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="form-modal-overlay animate-fade-in fixed inset-0 z-50 flex items-center justify-center px-4 py-5">
      <div className="form-modal-shell animate-scale-in max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[1.5rem]">
        <EntityForm 
          {...props} 
          onCancel={onClose} 
          onSubmit={async (data) => {
            await props.onSubmit(data);
            onClose();
          }}
          variant="modal" 
        />
      </div>
    </div>
  );
}
