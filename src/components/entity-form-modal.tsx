"use client";

import { useEffect, useState } from "react";

export type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select" | "multiselect" | "toggle" | "password" | "date" | "time";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  value?: unknown;
  error?: string;
  disabled?: boolean;
  rows?: number;
  description?: string;
  section?: string;
  min?: number;
  max?: number;
  step?: number | string;
};

export type EntityFormModalProps = {
  title: string;
  fields: FieldConfig[];
  isOpen: boolean;
  isLoading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (formData: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  description?: string;
};

export function EntityFormModal({
  title,
  fields,
  isOpen,
  isLoading = false,
  error,
  onClose,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  description,
}: EntityFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.type === "toggle") {
          initialData[field.name] = field.value === true;
        } else if (field.type === "multiselect") {
          initialData[field.name] = Array.isArray(field.value) ? field.value : [];
        } else {
          initialData[field.name] = field.value ?? "";
        }
      });
      setFormData(initialData);
      setFieldErrors({});
    }
  }, [isOpen, fields]);

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleMultiselectChange = (name: string, value: number | string, checked: boolean) => {
    const current = Array.isArray(formData[name]) ? (formData[name] as Array<number | string>) : [];
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    handleChange(name, updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const errors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.name];
        if (field.type === "multiselect") {
          if (!Array.isArray(value) || value.length === 0) {
            errors[field.name] = `${field.label} is required`;
          }
        } else if (!value) {
          errors[field.name] = `${field.label} is required`;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      // Error handling is managed by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Group fields by section
  const fieldsBySection = fields.reduce((acc, field) => {
    const section = field.section || "General";
    if (!acc[section]) acc[section] = [];
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FieldConfig[]>);

  const sections = Object.keys(fieldsBySection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-2xl border border-surface/20">
        {/* Header */}
        <div className="mb-6 border-b border-outline-variant/10 pb-4">
          <h2 className="font-display text-2xl font-semibold text-on-surface">{title}</h2>
          {description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex gap-3 rounded-lg bg-error/10 p-4 border border-error/20">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-error">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {sections.map((section) => (
            <div key={section}>
              {section !== "General" && (
                <div className="mb-4 border-t border-outline-variant/15 pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">{section}</h3>
                </div>
              )}

              <div className="space-y-4">
                {fieldsBySection[section].map((field) => (
                  <div key={field.name}>
                    {field.type === "toggle" ? (
                      <label className="flex items-center gap-3 group">
                        <input
                          type="checkbox"
                          checked={formData[field.name] === true}
                          onChange={(e) => handleChange(field.name, e.target.checked)}
                          disabled={isSubmitting || isLoading || field.disabled}
                          className="h-5 w-5 rounded border-2 border-outline-variant/40 bg-surface-container-lowest text-primary accent-primary cursor-pointer hover:border-outline-variant/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col">
                          <span className="text-on-surface font-medium">{field.label}</span>
                          {field.description && <p className="text-xs text-on-surface-variant mt-0.5">{field.description}</p>}
                        </div>
                      </label>
                    ) : field.type === "textarea" ? (
                      <div>
                        <label className="block text-sm font-semibold text-on-surface">
                          {field.label}
                          {field.required && <span className="text-error ml-1.5">*</span>}
                        </label>
                        {field.description && <p className="text-xs text-on-surface-variant mt-1">{field.description}</p>}
                        <textarea
                          name={field.name}
                          value={String(formData[field.name] ?? "")}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          disabled={isSubmitting || isLoading || field.disabled}
                          rows={field.rows ?? 4}
                          className={`mt-2 w-full rounded-lg border-2 transition-colors ${
                            fieldErrors[field.name]
                              ? "border-error/50 bg-error/5 focus:border-error focus:ring-2 focus:ring-error/20"
                              : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          } px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                        {fieldErrors[field.name] && <p className="mt-1.5 text-xs text-error font-medium">{fieldErrors[field.name]}</p>}
                      </div>
                    ) : field.type === "select" || field.type === "multiselect" ? (
                      <div>
                        <label className="block text-sm font-semibold text-on-surface">
                          {field.label}
                          {field.required && <span className="text-error ml-1.5">*</span>}
                        </label>
                        {field.description && <p className="text-xs text-on-surface-variant mt-1">{field.description}</p>}
                        {field.type === "multiselect" ? (
                          <div className={`mt-2 space-y-2 rounded-lg border-2 border-outline-variant/30 bg-surface-container-lowest p-3 ${fieldErrors[field.name] ? "border-error/50 bg-error/5" : ""}`}>
                            {field.options?.map((opt) => (
                              <label key={opt.value} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(formData[field.name]) && (formData[field.name] as Array<unknown>).includes(opt.value)}
                                  onChange={(e) => handleMultiselectChange(field.name, opt.value, e.target.checked)}
                                  disabled={isSubmitting || isLoading || field.disabled}
                                  className="h-4 w-4 rounded border-outline-variant/40 text-primary accent-primary cursor-pointer disabled:opacity-50"
                                />
                                <span className="text-sm text-on-surface">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <select
                            name={field.name}
                            value={String(formData[field.name] ?? "")}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            disabled={isSubmitting || isLoading || field.disabled}
                            className={`mt-2 w-full rounded-lg border-2 transition-colors ${
                              fieldErrors[field.name]
                                ? "border-error/50 bg-error/5 focus:border-error focus:ring-2 focus:ring-error/20"
                                : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            } px-4 py-2.5 text-on-surface focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-no-repeat bg-right`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                              backgroundPosition: "right 0.75rem center",
                              backgroundSize: "1.5em 1.5em",
                              paddingRight: "2.5rem",
                            }}
                          >
                            <option value="">Select {field.label}</option>
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {fieldErrors[field.name] && <p className="mt-1.5 text-xs text-error font-medium">{fieldErrors[field.name]}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-on-surface">
                          {field.label}
                          {field.required && <span className="text-error ml-1.5">*</span>}
                        </label>
                        {field.description && <p className="text-xs text-on-surface-variant mt-1">{field.description}</p>}
                        <input
                          type={field.type}
                          name={field.name}
                          value={String(formData[field.name] ?? "")}
                          onChange={(e) => handleChange(field.name, field.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value)}
                          placeholder={field.placeholder}
                          disabled={isSubmitting || isLoading || field.disabled}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className={`mt-2 w-full rounded-lg border-2 transition-colors ${
                            fieldErrors[field.name]
                              ? "border-error/50 bg-error/5 focus:border-error focus:ring-2 focus:ring-error/20"
                              : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                          } px-4 py-2.5 text-on-surface placeholder-on-surface-variant/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                        {fieldErrors[field.name] && <p className="mt-1.5 text-xs text-error font-medium">{fieldErrors[field.name]}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-outline-variant/15 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="rounded-lg px-5 py-2.5 font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
