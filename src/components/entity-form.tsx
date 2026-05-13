"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ActionButton } from "@/components/ops-ui";

type SectionSummaryResolver = (args: {
  field: FieldConfig;
  formData: Record<string, unknown>;
  value: unknown;
}) => string | undefined;

type DynamicBoolean =
  | boolean
  | ((formData: Record<string, unknown>) => boolean);

export type FieldConfig = {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "email"
    | "textarea"
    | "select"
    | "multiselect"
    | "toggle"
    | "image"
    | "password"
    | "date"
    | "time";
  required?: boolean;
  placeholder?: string;
  options?:
    | Array<{ value: string | number; label: string }>
    | ((
        formData: Record<string, unknown>,
      ) => Array<{ value: string | number; label: string }>);
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
  imagePublicIdField?: string;
  uploadFolder?: string;
  summaryValue?: string | SectionSummaryResolver;
  onValueChange?: (args: {
    value: unknown;
    formData: Record<string, unknown>;
  }) => Partial<Record<string, unknown>> | void;
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
  variant?: "modal" | "page" | "drawer";
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
        description:
          "Review all your details in the snapshot below before finalizing.",
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

  const getFieldOptions = (field: FieldConfig) => {
    if (typeof field.options === "function") {
      return field.options(formData);
    }
    return field.options ?? [];
  };

  const isEmptyValue = (field: FieldConfig, value: unknown) => {
    if (field.type === "multiselect")
      return !Array.isArray(value) || value.length === 0;
    if (field.type === "toggle") return value !== true;
    if (field.type === "image") return !value;
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
    return Object.keys(validateSection(sections[index].fields)).length > 0
      ? "incomplete"
      : "complete";
  };

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      const field = fields.find((candidate) => candidate.name === name);
      if (field?.onValueChange) {
        const updates = field.onValueChange({ value, formData: next });
        if (updates) {
          Object.assign(next, updates);
        }
      }
      return next;
    });
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleMultiselectChange = (
    name: string,
    value: number | string,
    checked: boolean,
  ) => {
    const current = Array.isArray(formData[name])
      ? (formData[name] as Array<number | string>)
      : [];
    const updated = checked
      ? [...current, value]
      : current.filter((item) => item !== value);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFinalSection) {
      handleNextSection();
      return;
    }
    const errors = sections.reduce(
      (acc, section) => ({ ...acc, ...validateSection(section.fields) }),
      {} as Record<string, string>,
    );
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstInvalidSectionIndex = sections.findIndex((section) =>
        section.fields.some((field) => errors[field.name]),
      );
      if (firstInvalidSectionIndex >= 0)
        setCurrentSectionIndex(firstInvalidSectionIndex);
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
    const shouldUseSingleColumn = sectionFields.every(
      (field) =>
        field.type === "textarea" ||
        field.type === "toggle" ||
        field.type === "image" ||
        field.type === "multiselect" ||
        field.span === 2,
    );
    return shouldUseSingleColumn ? "space-y-4" : "grid gap-4 md:grid-cols-2";
  };

  const getFieldWrapperClassName = (field: FieldConfig) => {
    if (
      field.span === 2 ||
      field.type === "textarea" ||
      field.type === "toggle" ||
      field.type === "multiselect"
    )
      return "md:col-span-2";
    return "";
  };

  if (!currentSection) return null;

  const isModalStyleChrome = variant === "modal" || variant === "drawer";

  const shellClassName =
    variant === "drawer"
      ? "form-modal-shell flex min-h-0 flex-1 w-full flex-col overflow-hidden"
      : isModalStyleChrome
        ? "form-modal-shell h-[94vh] max-h-[94vh] w-full flex flex-col overflow-hidden"
        : "w-full flex flex-col space-y-6";

  const headerClassName =
    isModalStyleChrome
      ? "overflow-hidden border border-outline-variant/15 bg-surface-container-low p-4 md:p-2"
      : "rounded-[2rem] border border-outline-variant/15 bg-surface-container-low p-6 shadow-sm";

  const contentClassName =
    isModalStyleChrome ? "min-h-0 flex-1 overflow-y-auto" : "flex-1";

  const footerClassName =
    isModalStyleChrome
      ? "sticky bottom-0 z-20 flex flex-col gap-4 border-t border-outline-variant/10 bg-surface-container-lowest/90 px-5 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between"
      : "sticky bottom-0 z-20 -mx-5 mt-8 flex flex-col gap-4 border-t border-outline-variant/10 bg-surface-container-lowest/90 px-5 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between";

  return (
    <form onSubmit={handleSubmit} className={shellClassName}>
      {/* Header */}
      <div className={headerClassName}>
        <div className="grid gap-2 border-b border-outline-variant/10 pb-4 md:grid-cols-[1fr_0.7fr]">
          <div>
            <div
              className={`mb-3 flex flex-wrap items-center gap-2 ${isModalStyleChrome ? "scale-90 origin-left" : ""}`}
            >
              <span className="form-chip">{heroLabel}</span>
              <span className="form-chip">{sections.length} steps</span>
              <span className="form-chip">{requiredFieldsCount} required</span>
            </div>
            <h2
              className={`${isModalStyleChrome ? "text-2xl" : "text-3xl md:text-4xl"} font-display font-bold tracking-tight text-on-surface`}
            >
              {title}
            </h2>
            {description && !isModalStyleChrome && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {description}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="form-field-card bg-surface-container-lowest/50 !p-3">
              <p className="label-caps text-on-surface-variant/70">
                Current Phase
              </p>
              <p className="mt-1 font-bold text-on-surface text-sm">
                {currentSection.name}
              </p>
            </div>
            <div className="form-field-card bg-surface-container-lowest/50 !p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{
                      width: `${((currentSectionIndex + 1) / sections.length) * 100}%`,
                    }}
                  />
                </div>
                <span className="mono-data font-black text-primary">
                  {Math.round(
                    ((currentSectionIndex + 1) / sections.length) * 100,
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div
          className={`mt-6 grid gap-2 ${isModalStyleChrome ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-5"}`}
        >
          {sections.map((section, index) => (
            <button
              key={section.name}
              type="button"
              onClick={() => handleGoToSection(index)}
              disabled={
                index > currentSectionIndex &&
                getSectionStatus(index) === "upcoming"
              }
              className={`group flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${
                index === currentSectionIndex
                  ? "border-primary/30 bg-surface-container-lowest shadow-sm"
                  : "border-outline-variant/5 bg-surface-container-lowest/30 hover:border-outline-variant/30"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
                  getSectionStatus(index) === "complete"
                    ? "bg-primary text-on-primary"
                    : index === currentSectionIndex
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {getSectionStatus(index) === "complete"
                  ? "✓"
                  : String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`truncate text-[10px] font-bold transition-colors ${index === currentSectionIndex ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"}`}
              >
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
          <section className="form-section-card shadow-sm">
            <div className="form-section-header mb-6">
              <div className="flex items-start gap-3">
                <span className="mono-data label-caps rounded-lg bg-primary/8 px-2 py-1 text-primary">
                  {String(currentSectionIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="mt-1 text-2xl font-bold text-on-surface">
                    {currentSection.name}
                  </h3>
                  {currentSection.description ? (
                    <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant/70">
                      {currentSection.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className={
                currentSection.fields.length > 0
                  ? getSectionLayoutClassName(currentSection.fields)
                  : ""
              }
            >
              {currentSection.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-4xl text-primary animate-bounce">
                    ✨
                  </div>
                  <h4 className="mt-6 text-2xl font-bold text-on-surface">
                    Ready to Finalize
                  </h4>
                  <p className="mt-2 text-on-surface-variant">
                    Your entries look solid. Review the snapshot below before
                    saving.
                  </p>
                </div>
              ) : (
                currentSection.fields.map((field, idx) => {
                  const fieldDisabled = isFieldDisabled(field);
                  const fieldValue = formData[field.name];

                  return (
                    <div
                      key={field.name}
                      className={`${getFieldWrapperClassName(field)} animate-fade-in`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      {field.type === "toggle" ? (
                        <label
                          className={`flex items-start gap-4 rounded-3xl border bg-surface-container-lowest p-5 transition-all ${fieldDisabled ? "opacity-50" : "hover:border-primary/30 hover:shadow-sm"}`}
                        >
                          <input
                            type="checkbox"
                            checked={fieldValue === true}
                            onChange={(e) =>
                              handleChange(field.name, e.target.checked)
                            }
                            disabled={
                              isSubmitting || isLoading || fieldDisabled
                            }
                            className="peer sr-only"
                          />
                          <span className="mt-1 inline-flex h-6 w-11 shrink-0 rounded-full bg-outline-variant/40 p-0.5 transition-colors peer-checked:bg-primary peer-checked:[&>span]:translate-x-5">
                            <span className="h-5 w-5 rounded-full bg-surface-container-lowest shadow-sm transition-transform" />
                          </span>
                          <div>
                            <span className="label-caps block text-on-surface">
                              {field.label}
                            </span>
                            {field.description && (
                              <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant/70">
                                {field.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ) : field.type === "image" ? (
                        <div className="group">
                          <label className="label-caps mb-2 ml-1 block">
                            {field.label}{" "}
                            {field.required && (
                              <span className="text-error">*</span>
                            )}
                          </label>
                          <ImageUpload
                            value={String(fieldValue || "") || undefined}
                            folder={field.label}
                            uploadFolder={field.uploadFolder}
                            onChange={(url, publicId) => {
                              handleChange(field.name, url);
                              if (field.imagePublicIdField) {
                                handleChange(field.imagePublicIdField, publicId);
                              }
                            }}
                            onError={(message) => {
                              setFieldErrors((prev) => ({
                                ...prev,
                                [field.name]: message,
                              }));
                            }}
                          />
                          {field.description && (
                            <p className="mt-2 ml-2 text-xs leading-relaxed text-on-surface-variant">
                              {field.description}
                            </p>
                          )}
                          {fieldErrors[field.name] && (
                            <p className="mt-2 ml-2 text-xs font-bold text-error">
                              {fieldErrors[field.name]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="group">
                          <label className="label-caps mb-2 ml-1 block">
                            {field.label}{" "}
                            {field.required && (
                              <span className="text-error">*</span>
                            )}
                          </label>
                          <div className="relative">
                            {field.type === "textarea" ? (
                              <textarea
                                value={String(fieldValue ?? "")}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                                className={`form-input-base !rounded-2xl !bg-surface-container-lowest transition-all focus:ring-8 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                                rows={field.rows ?? 4}
                                placeholder={field.placeholder}
                                disabled={
                                  isSubmitting || isLoading || fieldDisabled
                                }
                              />
                            ) : field.type === "select" ? (
                              <select
                                value={String(fieldValue ?? "")}
                                onChange={(e) =>
                                  handleChange(field.name, e.target.value)
                                }
                                className={`form-input-base !rounded-2xl !bg-surface-container-lowest transition-all focus:ring-8 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                                disabled={
                                  isSubmitting || isLoading || fieldDisabled
                                }
                              >
                                <option value="">Select Option</option>
                                {getFieldOptions(field).map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === "multiselect" ? (
                              <div
                                className={`rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                              >
                                {(() => {
                                  const multiselectOptions = getFieldOptions(field);
                                  const currentValues = Array.isArray(fieldValue)
                                    ? fieldValue
                                    : [];
                                  const allFilteredSelected =
                                    multiselectOptions.length > 0 &&
                                    multiselectOptions.every((option) =>
                                      currentValues.some(
                                        (item) =>
                                          String(item) === String(option.value),
                                      ),
                                    );
                                  return (
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-on-surface-variant">
                                    {Array.isArray(fieldValue)
                                      ? `${fieldValue.length} selected`
                                      : "0 selected"}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const existingValues = Array.isArray(fieldValue)
                                          ? fieldValue
                                          : [];
                                        const toAdd = multiselectOptions
                                          .map((option) => option.value)
                                          .filter(
                                            (value) =>
                                              !existingValues.some(
                                                (item) =>
                                                  String(item) === String(value),
                                              ),
                                          );
                                        if (toAdd.length === 0) return;
                                        handleChange(field.name, [
                                          ...existingValues,
                                          ...toAdd,
                                        ]);
                                      }}
                                      disabled={
                                        isSubmitting ||
                                        isLoading ||
                                        fieldDisabled ||
                                        multiselectOptions.length === 0 ||
                                        allFilteredSelected
                                      }
                                      className="rounded-lg border border-outline-variant/20 px-2 py-1 font-semibold text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Select All Filtered
                                    </button>
                                    {Array.isArray(fieldValue) &&
                                      fieldValue.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleChange(field.name, [])
                                          }
                                          disabled={
                                            isSubmitting ||
                                            isLoading ||
                                            fieldDisabled
                                          }
                                          className="rounded-lg border border-outline-variant/20 px-2 py-1 font-semibold text-on-surface-variant hover:bg-surface-container"
                                        >
                                          Clear
                                        </button>
                                      )}
                                  </div>
                                </div>
                                  );
                                })()}

                                {getFieldOptions(field).length === 0 ? (
                                  <p className="text-sm text-on-surface-variant">
                                    No options match your current filters.
                                  </p>
                                ) : (
                                  <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                    {getFieldOptions(field).map((option) => {
                                      const checked =
                                        Array.isArray(fieldValue) &&
                                        fieldValue.some(
                                          (item) =>
                                            String(item) ===
                                            String(option.value),
                                        );
                                      return (
                                        <label
                                          key={option.value}
                                          className={`flex items-start gap-3 rounded-xl border p-2.5 transition-colors ${
                                            checked
                                              ? "border-primary/40 bg-primary/5"
                                              : "border-outline-variant/10 hover:border-outline-variant/30"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) =>
                                              handleMultiselectChange(
                                                field.name,
                                                option.value,
                                                e.target.checked,
                                              )
                                            }
                                            disabled={
                                              isSubmitting ||
                                              isLoading ||
                                              fieldDisabled
                                            }
                                            className="mt-1 h-4 w-4 rounded border-outline-variant/30 text-primary focus:ring-primary/20"
                                          />
                                          <span className="text-sm font-medium text-on-surface">
                                            {option.label}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type={field.type}
                                value={String(fieldValue ?? "")}
                                onChange={(e) =>
                                  handleChange(
                                    field.name,
                                    field.type === "number"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                  )
                                }
                                className={`form-input-base !rounded-2xl !bg-surface-container-lowest transition-all focus:ring-8 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                                placeholder={field.placeholder}
                                disabled={
                                  isSubmitting || isLoading || fieldDisabled
                                }
                                min={field.min}
                                max={field.max}
                                step={field.step}
                              />
                            )}
                            {fieldErrors[field.name] && (
                              <p className="mt-2 text-xs font-bold text-error ml-2">
                                ⚠ {fieldErrors[field.name]}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className={footerClassName}>
        <div>
          <p className="label-caps text-on-surface-variant/70">
            Operational Status
          </p>
          <p className="mt-1 text-sm font-bold text-on-surface-variant">
            {isFinalSection
              ? "Locked and ready for submission."
              : "Please finalize the current phase."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ActionButton type="button" variant="ghost" size="lg" onClick={onCancel} disabled={isSubmitting || isLoading}>
            {cancelLabel}
          </ActionButton>

          {currentSectionIndex > 0 && (
            <button
              type="button"
              onClick={() => setCurrentSectionIndex((p) => p - 1)}
              className="rounded-2xl border border-outline-variant/20 bg-surface px-6 py-4 text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container-low"
            >
              Back
            </button>
          )}

          {isFinalSection ? (
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-on-primary shadow-md shadow-primary/15 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextSection}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-on-primary shadow-md shadow-primary/15 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97]"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
