"use client";

import { useEffect, useMemo, useState } from "react";

type SectionSummaryResolver = (args: {
  field: FieldConfig;
  formData: Record<string, unknown>;
  value: unknown;
}) => string | undefined;

type DynamicBoolean = boolean | ((formData: Record<string, unknown>) => boolean);

export type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select" | "multiselect" | "toggle" | "password" | "date" | "time";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string | number; label: string }>;
  value?: unknown;
  error?: string;
  disabled?: DynamicBoolean;
  rows?: number;
  description?: string;
  section?: string;
  sectionDescription?: string;
  min?: number;
  max?: number;
  step?: number | string;
  span?: 1 | 2;
  helperTone?: "default" | "featured" | "muted";
  summaryValue?: string | SectionSummaryResolver;
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
  heroLabel?: string;
};

type SectionConfig = {
  name: string;
  description?: string;
  fields: FieldConfig[];
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
  heroLabel = "Guided Entry",
}: EntityFormModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const requiredFieldsCount = fields.filter((field) => field.required).length;
  const optionalFieldsCount = fields.length - requiredFieldsCount;

  const sections = useMemo(() => {
    const result = fields.reduce((acc, field) => {
      const sectionName = field.section || "General";
      const existing = acc.find((section) => section.name === sectionName);

      if (existing) {
        existing.fields.push(field);
        if (!existing.description && field.sectionDescription) {
          existing.description = field.sectionDescription;
        }
      } else {
        acc.push({
          name: sectionName,
          description: field.sectionDescription,
          fields: [field],
        });
      }

      return acc;
    }, [] as SectionConfig[]);

    // If we have multiple sections, add a final Review step to ensure 
    // the user reaches the very end before being able to submit.
    if (result.length > 1) {
      result.push({
        name: "Review & Save",
        description: "Review all your details in the snapshot below before finalizing.",
        fields: [],
      });
    }
    
    // Log for debugging: verify all sections are created
    if (typeof window !== 'undefined' && (window as any).__DEV_MODAL_DEBUG) {
      console.log(`[EntityFormModal] Created ${result.length} sections from ${fields.length} fields:`, result.map(s => s.name));
    }
    
    return result;
  }, [fields]);

  const currentSection = sections[currentSectionIndex];
  const isFinalSection = currentSectionIndex === sections.length - 1;

  useEffect(() => {
    if (!isOpen) return;

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
    setCurrentSectionIndex(0);
  }, [isOpen, fields]);

  const isFieldDisabled = (field: FieldConfig) => {
    if (typeof field.disabled === "function") {
      return field.disabled(formData);
    }

    return field.disabled === true;
  };

  const isEmptyValue = (field: FieldConfig, value: unknown) => {
    if (field.type === "multiselect") {
      return !Array.isArray(value) || value.length === 0;
    }

    if (field.type === "toggle") {
      return value !== true;
    }

    if (typeof value === "number") {
      return Number.isNaN(value);
    }

    return value === "" || value === null || value === undefined;
  };

  const validateSection = (sectionFields: FieldConfig[]) => {
    const errors: Record<string, string> = {};

    sectionFields.forEach((field) => {
      if (!field.required || isFieldDisabled(field)) return;

      const value = formData[field.name];
      if (isEmptyValue(field, value)) {
        errors[field.name] = `${field.label} is required`;
      }
    });

    return errors;
  };

  const getSectionStatus = (index: number) => {
    if (index === currentSectionIndex) return "current";
    if (index > currentSectionIndex) return "upcoming";

    return Object.keys(validateSection(sections[index].fields)).length > 0 ? "incomplete" : "complete";
  };

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
    const updated = checked ? [...current, value] : current.filter((item) => item !== value);
    handleChange(name, updated);
  };

  const handleGoToSection = (targetIndex: number) => {
    if (targetIndex === currentSectionIndex) return;

    if (targetIndex > currentSectionIndex) {
      const sectionErrors = validateSection(currentSection.fields);
      if (Object.keys(sectionErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...sectionErrors }));
        return;
      }
    }

    setCurrentSectionIndex(targetIndex);
  };

  const handleNextSection = () => {
    const sectionErrors = validateSection(currentSection.fields);
    if (Object.keys(sectionErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...sectionErrors }));
      return;
    }

    // Ensure we move to next section, even if it's the last one
    const nextIndex = Math.min(currentSectionIndex + 1, sections.length - 1);
    if (nextIndex > currentSectionIndex) {
      setCurrentSectionIndex(nextIndex);
    }
  };

  const getFieldDisplayValue = (field: FieldConfig) => {
    const value = formData[field.name];

    if (typeof field.summaryValue === "function") {
      return field.summaryValue({ field, formData, value });
    }

    if (typeof field.summaryValue === "string") {
      return field.summaryValue;
    }

    if (field.type === "toggle") {
      return value === true ? "Enabled" : undefined;
    }

    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.length === 0) return undefined;
      const labels = value
        .map((item) => field.options?.find((option) => String(option.value) === String(item))?.label ?? String(item))
        .filter(Boolean);
      return labels.slice(0, 2).join(", ") + (labels.length > 2 ? ` +${labels.length - 2}` : "");
    }

    if (field.type === "select") {
      if (value === "" || value === undefined || value === null) return undefined;
      return field.options?.find((option) => String(option.value) === String(value))?.label ?? String(value);
    }

    if (value === "" || value === undefined || value === null) return undefined;
    return String(value);
  };

  const getSectionSummary = (section: SectionConfig) => {
    const values = section.fields
      .map((field) => {
        const displayValue = getFieldDisplayValue(field);
        return displayValue ? `${field.label}: ${displayValue}` : undefined;
      })
      .filter(Boolean) as string[];

    if (values.length === 0) return "No selections yet";
    return values.slice(0, 2).join(" | ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFinalSection) {
      handleNextSection();
      return;
    }

    const errors = sections.reduce((acc, section) => ({ ...acc, ...validateSection(section.fields) }), {} as Record<string, string>);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstInvalidSectionIndex = sections.findIndex((section) =>
        section.fields.some((field) => errors[field.name]),
      );
      if (firstInvalidSectionIndex >= 0) {
        setCurrentSectionIndex(firstInvalidSectionIndex);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch {
      // Error handling is managed by parent.
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionLayoutClassName = (sectionFields: FieldConfig[]) => {
    const shouldUseSingleColumn = sectionFields.every(
      (field) => field.type === "textarea" || field.type === "toggle" || field.type === "multiselect" || field.span === 2,
    );

    return shouldUseSingleColumn ? "space-y-4" : "grid gap-4 md:grid-cols-2";
  };

  const getFieldWrapperClassName = (field: FieldConfig) => {
    if (field.span === 2 || field.type === "textarea" || field.type === "toggle" || field.type === "multiselect") {
      return "md:col-span-2";
    }

    return "";
  };

  if (!isOpen || !currentSection) return null;

  return (
    <div className="form-modal-overlay fixed inset-0 z-50 flex items-center justify-center px-4 py-5">
      <form onSubmit={handleSubmit} className="form-modal-shell h-[94vh] max-h-[94vh] w-full max-w-5xl rounded-[2rem] flex flex-col">
        <div className="overflow-hidden rounded-t-[2rem] border border-outline-variant/15 bg-surface-container-low p-4 md:p-6">
          <div className="grid gap-4 border-b border-outline-variant/10 px-5 py-5 md:grid-cols-[1.4fr_0.9fr] md:px-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="form-chip">{heroLabel}</span>
                <span className="form-chip">{sections.length} steps</span>
                <span className="form-chip">{requiredFieldsCount} required</span>
                {optionalFieldsCount > 0 && <span className="form-chip">{optionalFieldsCount} optional</span>}
              </div>
              <h2 className="font-display text-3xl font-semibold leading-tight text-on-surface md:text-[2.35rem]">{title}</h2>
              {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>}
            </div>

            <div className="grid gap-3">
              <div className="form-field-card">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Current Step</p>
                <p className="mt-1 font-medium text-on-surface">{currentSection.name}</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  {currentSection.description ?? "Complete this section to move forward."}
                </p>
              </div>
              <div className="form-field-card">
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Progress</p>
                <p className="mt-1 font-medium text-on-surface">
                  Step {currentSectionIndex + 1} of {sections.length}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-4 md:grid-cols-5 md:px-6">
            {sections.map((section, index) => {
              const status = getSectionStatus(index);
              const isActive = index === currentSectionIndex;
              const isClickable = index <= currentSectionIndex || status === "complete";
              const chipClassName =
                status === "complete"
                  ? "border-primary/20 bg-primary-container text-on-primary-container"
                  : status === "current"
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : status === "incomplete"
                      ? "border-error/20 bg-error/10 text-error"
                      : "border-outline-variant/15 bg-surface-container text-on-surface-variant";

              return (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => handleGoToSection(index)}
                  disabled={!isClickable}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "border-primary/25 bg-surface-container-lowest shadow-[var(--shadow-ambient)]"
                      : "border-outline-variant/12 bg-surface-container-lowest hover:border-outline-variant/30"
                  } disabled:cursor-not-allowed disabled:opacity-80`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${chipClassName}`}>
                      {status === "complete" ? "OK" : String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-on-surface">{section.name}</p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {status === "current"
                          ? "Current"
                          : status === "complete"
                            ? "Complete"
                            : status === "incomplete"
                              ? "Needs attention"
                              : "Upcoming"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 flex gap-3 rounded-2xl border border-error/20 bg-error/10 p-4 md:mx-6">
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

          <div className="space-y-5 p-4 md:p-6">
            <section className="form-section-card">
            <div className="form-section-header">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">
                  Step {String(currentSectionIndex + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-on-surface">{currentSection.name}</h3>
                {currentSection.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">{currentSection.description}</p>
                )}
              </div>
              <span className="form-chip">
                {currentSection.fields.length} field{currentSection.fields.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className={currentSection.fields.length > 0 ? getSectionLayoutClassName(currentSection.fields) : ""}>
              {currentSection.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-on-surface">Data Entry Complete</h4>
                  <p className="mt-2 text-sm text-on-surface-variant">Your entry is ready. Please double-check the review snapshot below.</p>
                </div>
              ) : (
                currentSection.fields.map((field) => {
                const fieldDisabled = isFieldDisabled(field);
                const fieldValue = formData[field.name];
                const helperToneClassName =
                  field.helperTone === "featured"
                    ? "border-primary/15 bg-primary/5"
                    : field.helperTone === "muted"
                      ? "border-outline-variant/8 bg-surface-container-low"
                      : "";

                return (
                  <div key={field.name} className={getFieldWrapperClassName(field)}>
                    {field.type === "toggle" ? (
                      <label className={`flex items-start gap-3 rounded-2xl border bg-surface px-4 py-4 transition-colors ${helperToneClassName} ${fieldDisabled ? "border-outline-variant/10 opacity-70" : "border-outline-variant/15 hover:border-outline-variant/30"}`}>
                        <input
                          type="checkbox"
                          checked={fieldValue === true}
                          onChange={(e) => handleChange(field.name, e.target.checked)}
                          disabled={isSubmitting || isLoading || fieldDisabled}
                          className="mt-1 h-5 w-5 rounded border-2 border-outline-variant/40 bg-surface-container-lowest text-primary accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-on-surface">{field.label}</span>
                            {field.required && <span className="form-chip">Required</span>}
                          </div>
                          {field.description && <p className="mt-1 text-sm leading-6 text-on-surface-variant">{field.description}</p>}
                        </div>
                      </label>
                    ) : field.type === "textarea" ? (
                      <div className={`rounded-2xl border border-outline-variant/10 bg-surface p-4 ${helperToneClassName}`}>
                        <label className="block text-sm font-semibold text-on-surface">
                          {field.label}
                          {field.required && <span className="ml-1.5 text-error">*</span>}
                        </label>
                        {field.description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{field.description}</p>}
                        <textarea
                          name={field.name}
                          value={String(fieldValue ?? "")}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          placeholder={field.placeholder}
                          disabled={isSubmitting || isLoading || fieldDisabled}
                          rows={field.rows ?? 4}
                          className={`form-input-base mt-3 min-h-[132px] resize-y ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                        />
                        {fieldErrors[field.name] && <p className="mt-1.5 text-xs font-medium text-error">{fieldErrors[field.name]}</p>}
                      </div>
                    ) : field.type === "select" || field.type === "multiselect" ? (
                      <div className={`rounded-2xl border border-outline-variant/10 bg-surface p-4 ${helperToneClassName}`}>
                        <label className="block text-sm font-semibold text-on-surface">
                          {field.label}
                          {field.required && <span className="ml-1.5 text-error">*</span>}
                        </label>
                        {field.description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{field.description}</p>}
                        {field.type === "multiselect" ? (
                          <div className={`mt-3 grid gap-2 rounded-2xl border-2 p-3 md:grid-cols-2 ${fieldErrors[field.name] ? "form-input-error" : "border-outline-variant/25 bg-surface"}`}>
                            {field.options?.map((opt) => (
                              <label
                                key={opt.value}
                                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                                  fieldDisabled
                                    ? "border-outline-variant/10 bg-surface-container-low opacity-60"
                                    : "border-outline-variant/10 bg-surface-container-low hover:border-outline-variant/25"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(fieldValue) && (fieldValue as Array<unknown>).includes(opt.value)}
                                  onChange={(e) => handleMultiselectChange(field.name, opt.value, e.target.checked)}
                                  disabled={isSubmitting || isLoading || fieldDisabled}
                                  className="h-4 w-4 rounded border-outline-variant/40 text-primary accent-primary disabled:opacity-50"
                                />
                                <span className="text-sm text-on-surface">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="relative mt-3">
                            <select
                              name={field.name}
                              value={String(fieldValue ?? "")}
                              onChange={(e) => handleChange(field.name, e.target.value)}
                              disabled={isSubmitting || isLoading || fieldDisabled}
                              className={`form-input-base appearance-none pr-12 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                            >
                              <option value="">Select {field.label}</option>
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <svg
                              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
                              viewBox="0 0 20 20"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 7.5L10 12.5L15 7.5"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                        {fieldErrors[field.name] && <p className="mt-1.5 text-xs font-medium text-error">{fieldErrors[field.name]}</p>}
                      </div>
                    ) : (
                      <div className={`rounded-2xl border border-outline-variant/10 bg-surface p-4 ${helperToneClassName}`}>
                        <label className="block text-sm font-semibold text-on-surface">
                          {field.label}
                          {field.required && <span className="ml-1.5 text-error">*</span>}
                        </label>
                        {field.description && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{field.description}</p>}
                        <input
                          type={field.type}
                          name={field.name}
                          value={String(fieldValue ?? "")}
                          onChange={(e) => handleChange(field.name, field.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value)}
                          placeholder={field.placeholder}
                          disabled={isSubmitting || isLoading || fieldDisabled}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className={`form-input-base mt-3 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                        />
                        {fieldErrors[field.name] && <p className="mt-1.5 text-xs font-medium text-error">{fieldErrors[field.name]}</p>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-outline-variant/15 bg-surface-container-low p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Review Snapshot</p>
                <h4 className="mt-1 text-lg font-semibold text-on-surface">What will be saved</h4>
              </div>
              <span className="form-chip">
                {sections.filter((_, index) => getSectionStatus(index) === "complete").length} ready
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section, index) => (
                <button
                  key={section.name}
                  type="button"
                  onClick={() => setCurrentSectionIndex(index)}
                  className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 text-left transition-colors hover:border-outline-variant/25"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-on-surface">{section.name}</p>
                    <span className="text-xs text-on-surface-variant">
                      {getSectionStatus(index) === "complete"
                        ? "Done"
                        : getSectionStatus(index) === "current"
                          ? "Current"
                          : "Edit"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">{getSectionSummary(section)}</p>
                </button>
              ))}
            </div>
          </section>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-outline-variant/15 rounded-b-[2rem] bg-surface-container-lowest px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Step Guidance</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {isFinalSection
                ? "Review the snapshot, then save to create the record."
                : "Finish the current section to unlock the next step."}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="rounded-xl px-5 py-3 font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            {currentSectionIndex > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSectionIndex((prev) => Math.max(prev - 1, 0))}
                disabled={isSubmitting || isLoading}
                className="rounded-xl border border-outline-variant/20 bg-surface px-5 py-3 font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
            )}
            {isFinalSection ? (
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
            ) : (
              <button
                type="button"
                onClick={handleNextSection}
                disabled={isSubmitting || isLoading}
                className="rounded-xl bg-primary px-5 py-3 font-medium text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
