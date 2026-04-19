"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton, StatusBadge } from "@/components/ops-ui";

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

export type EntityFormProps = {
  title: string;
  fields: FieldConfig[];
  isLoading?: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (formData: Record<string, unknown>) => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  description?: string;
  heroLabel?: string;
  variant?: "modal" | "page";
};

type SectionConfig = {
  name: string;
  description?: string;
  fields: FieldConfig[];
};

export function EntityForm({
  title,
  fields,
  isLoading = false,
  error,
  onCancel,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  description,
  heroLabel = "Guided Entry",
  variant = "page",
}: EntityFormProps) {
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

    if (result.length > 1) {
      result.push({
        name: "Review & Save",
        description: "Review all your details in the snapshot below before finalizing.",
        fields: [],
      });
    }

    return result;
  }, [fields]);

  const currentSection = sections[currentSectionIndex];
  const isFinalSection = currentSectionIndex === sections.length - 1;

  useEffect(() => {
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
  }, [fields]);

  const isFieldDisabled = (field: FieldConfig) => {
    if (typeof field.disabled === "function") {
      return field.disabled(formData);
    }
    return field.disabled === true;
  };

  const isEmptyValue = (field: FieldConfig, value: unknown) => {
    if (field.type === "multiselect") return !Array.isArray(value) || value.length === 0;
    if (field.type === "toggle") return value !== true;
    if (typeof value === "number") return Number.isNaN(value);
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
    const nextIndex = Math.min(currentSectionIndex + 1, sections.length - 1);
    if (nextIndex > currentSectionIndex) {
      setCurrentSectionIndex(nextIndex);
    }
  };

  const getFieldDisplayValue = (field: FieldConfig) => {
    const value = formData[field.name];
    if (typeof field.summaryValue === "function") return field.summaryValue({ field, formData, value });
    if (typeof field.summaryValue === "string") return field.summaryValue;
    if (field.type === "toggle") return value === true ? "Enabled" : undefined;
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.length === 0) return undefined;
      const labels = value.map((item) => field.options?.find((option) => String(option.value) === String(item))?.label ?? String(item)).filter(Boolean);
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
    const values = section.fields.map((field) => {
      const displayValue = getFieldDisplayValue(field);
      return displayValue ? `${field.label}: ${displayValue}` : undefined;
    }).filter(Boolean) as string[];
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
      const firstInvalidSectionIndex = sections.findIndex((section) => section.fields.some((field) => errors[field.name]));
      if (firstInvalidSectionIndex >= 0) setCurrentSectionIndex(firstInvalidSectionIndex);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch {
      // Parent handles errors
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionLayoutClassName = (sectionFields: FieldConfig[]) => {
    const shouldUseSingleColumn = sectionFields.every((field) => field.type === "textarea" || field.type === "toggle" || field.type === "multiselect" || field.span === 2);
    return shouldUseSingleColumn ? "space-y-4" : "grid gap-4 md:grid-cols-2";
  };

  const getFieldWrapperClassName = (field: FieldConfig) => {
    if (field.span === 2 || field.type === "textarea" || field.type === "toggle" || field.type === "multiselect") return "md:col-span-2";
    return "";
  };

  if (!currentSection) return null;

  const shellClassName = variant === "modal" 
    ? "form-modal-shell h-[94vh] max-h-[94vh] w-full flex flex-col overflow-hidden" 
    : "w-full flex flex-col space-y-6";

  const headerClassName = variant === "modal"
    ? "overflow-hidden rounded-t-[2rem] border border-outline-variant/15 bg-surface-container-low p-4 md:p-6"
    : "rounded-[2rem] border border-outline-variant/15 bg-surface-container-low p-6 shadow-sm";

  const contentClassName = variant === "modal"
    ? "flex-1 overflow-y-auto"
    : "flex-1";

  const footerClassName = variant === "modal"
    ? "flex flex-col gap-4 border-t border-outline-variant/15 rounded-b-[2rem] bg-surface-container-lowest px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6"
    : "flex flex-col gap-4 border border-outline-variant/15 rounded-[2rem] bg-surface-container-lowest px-6 py-6 md:flex-row md:items-center md:justify-between shadow-sm";

  return (
    <form onSubmit={handleSubmit} className={shellClassName}>
      {/* Header */}
      <div className={headerClassName}>
        <div className="grid gap-6 border-b border-outline-variant/10 pb-6 md:grid-cols-[1fr_0.7fr]">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="form-chip">{heroLabel}</span>
              <span className="form-chip">{sections.length} steps</span>
              <span className="form-chip">{requiredFieldsCount} required</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface md:text-4xl">{title}</h2>
            {description && <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">{description}</p>}
          </div>

          <div className="grid gap-3">
            <div className="form-field-card bg-surface-container-lowest/50">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">Current Phase</p>
              <p className="mt-1.5 font-bold text-on-surface">{currentSection.name}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{currentSection.description ?? "Complete this step to proceed."}</p>
            </div>
            <div className="form-field-card bg-surface-container-lowest/50">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">Flow Progress</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-on-surface whitespace-nowrap">{Math.round(((currentSectionIndex + 1) / sections.length) * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {sections.map((section, index) => (
            <button
              key={section.name}
              type="button"
              onClick={() => handleGoToSection(index)}
              disabled={index > currentSectionIndex && getSectionStatus(index) === "upcoming"}
              className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                index === currentSectionIndex ? "border-primary/30 bg-surface-container-lowest shadow-sm" : "border-outline-variant/10 bg-surface-container-lowest/30 hover:border-outline-variant/30"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                getSectionStatus(index) === "complete" ? "bg-primary text-on-primary" : 
                index === currentSectionIndex ? "bg-primary/10 text-primary border border-primary/20" : "bg-surface-container text-on-surface-variant"
              }`}>
                {getSectionStatus(index) === "complete" ? "✓" : String(index + 1).padStart(2, '0')}
              </span>
              <span className={`truncate text-xs font-bold transition-colors ${index === currentSectionIndex ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"}`}>
                {section.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={contentClassName}>
        {error && (
          <div className="my-4 flex gap-4 rounded-2xl border border-error/20 bg-error/5 p-4 mx-6">
             <div className="shrink-0 text-xl text-error">⚠</div>
             <p className="text-sm font-bold text-error">{error}</p>
          </div>
        )}

        <div className="space-y-6 p-6">
          <section className="form-section-card bg-surface-container-lowest shadow-sm">
            <div className="form-section-header mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Step {currentSectionIndex + 1}</p>
                <h3 className="mt-1 text-2xl font-bold text-on-surface">{currentSection.name}</h3>
              </div>
            </div>

            <div className={currentSection.fields.length > 0 ? getSectionLayoutClassName(currentSection.fields) : ""}>
              {currentSection.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-4xl text-primary animate-bounce">✨</div>
                  <h4 className="mt-6 text-2xl font-bold text-on-surface">Ready to Finalize</h4>
                  <p className="mt-2 text-on-surface-variant">Your entries look solid. Review the snapshot below before saving.</p>
                </div>
              ) : (
                currentSection.fields.map((field) => {
                  const fieldDisabled = isFieldDisabled(field);
                  const fieldValue = formData[field.name];
                  
                  return (
                    <div key={field.name} className={getFieldWrapperClassName(field)}>
                      {field.type === "toggle" ? (
                        <label className={`flex items-start gap-4 rounded-3xl border bg-surface-container-lowest p-5 transition-all ${fieldDisabled ? "opacity-50" : "hover:border-primary/30 hover:shadow-sm"}`}>
                          <input type="checkbox" checked={fieldValue === true} onChange={(e) => handleChange(field.name, e.target.checked)} disabled={isSubmitting || isLoading || fieldDisabled} className="mt-1 h-6 w-6 rounded-lg border-2 border-outline-variant/30 text-primary transition-all focus:ring-primary/20" />
                          <div>
                            <span className="font-bold text-on-surface text-lg">{field.label}</span>
                            {field.description && <p className="mt-1 text-sm text-on-surface-variant font-medium">{field.description}</p>}
                          </div>
                        </label>
                      ) : (
                        <div className="group">
                          <label className="block text-sm font-bold tracking-wide text-on-surface mb-2 ml-1">
                            {field.label} {field.required && <span className="text-error">*</span>}
                          </label>
                          <div className="relative">
                            {field.type === "textarea" ? (
                              <textarea
                                value={String(fieldValue ?? "")}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                className={`form-input-base !bg-surface-container-lowest !rounded-2xl transition-all focus:ring-8 ${fieldErrors[field.name] ? "!border-error/50 !ring-error/5" : ""}`}
                                rows={field.rows ?? 4}
                                placeholder={field.placeholder}
                                disabled={isSubmitting || isLoading || fieldDisabled}
                              />
                            ) : field.type === "select" ? (
                              <select
                                value={String(fieldValue ?? "")}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                className={`form-input-base !bg-surface-container-lowest !rounded-2xl transition-all focus:ring-8 ${fieldErrors[field.name] ? "!border-error/50 !ring-error/5" : ""}`}
                                disabled={isSubmitting || isLoading || fieldDisabled}
                              >
                                <option value="">Select Option</option>
                                {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field.type}
                                value={String(fieldValue ?? "")}
                                onChange={(e) => handleChange(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}
                                className={`form-input-base !bg-surface-container-lowest !rounded-2xl transition-all focus:ring-8 ${fieldErrors[field.name] ? "!border-error/50 !ring-error/5" : ""}`}
                                placeholder={field.placeholder}
                                disabled={isSubmitting || isLoading || fieldDisabled}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                              />
                            )}
                            {fieldErrors[field.name] && <p className="mt-2 text-xs font-bold text-error ml-2">⚠ {fieldErrors[field.name]}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Quick Summary Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {sections.map((sec, idx) => (
                <button key={sec.name} type="button" onClick={() => setCurrentSectionIndex(idx)} className={`rounded-3xl border p-4 text-left transition-all ${idx === currentSectionIndex ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-outline-variant/10 bg-surface-container-lowest/50 hover:bg-surface-container-lowest"}`}>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Step {idx + 1}</p>
                   <p className="mt-1 font-bold text-on-surface truncate">{sec.name}</p>
                   <p className="mt-2 text-[11px] font-medium text-on-surface-variant truncate opacity-70">{getSectionSummary(sec)}</p>
                </button>
             ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={footerClassName}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/70">Operational Status</p>
          <p className="mt-1 text-sm font-bold text-on-surface-variant">
            {isFinalSection ? "Locked and ready for submission." : "Please finalize the current phase."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton onClick={onCancel} disabled={isSubmitting || isLoading}>
            {cancelLabel}
          </ActionButton>
          
          {currentSectionIndex > 0 && (
            <button type="button" onClick={() => setCurrentSectionIndex(p => p - 1)} className="rounded-2xl border border-outline-variant/20 bg-surface px-6 py-3 py-4 text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container-low">
               Back
            </button>
          )}

          {isFinalSection ? (
            <button type="submit" disabled={isSubmitting || isLoading} className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm font-black text-on-primary shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-95 disabled:opacity-50">
               {isSubmitting ? "Processing..." : submitLabel}
            </button>
          ) : (
            <button type="button" onClick={handleNextSection} className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-sm font-black text-on-primary shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-2xl">
               Continue →
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
