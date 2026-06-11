"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ActionButton } from "@/components/ops-ui";
import { QuickCreateButton } from "@/components/quick-create/QuickCreateButton";
import { QuickCreateDrawer } from "@/components/quick-create/QuickCreateDrawer";
import type { QuickCreateConfig } from "@/components/quick-create/types";
import { TagInput } from "@/components/TagInput";
import { PricingFields } from "@/components/inventory/pricing-fields";
import {
  defaultCatalogPricingFromRecord,
  type CatalogPricingFields,
} from "@/lib/catalog-pricing";

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
  | "tags"
  | "toggle"
  | "image"
  | "password"
  | "date"
  | "time"
  | "pricing";
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
  span?: 1 | 2 | 3;
  helperTone?: "default" | "featured" | "muted";
  imagePublicIdField?: string;
  uploadFolder?: string;
  summaryValue?: string | SectionSummaryResolver;
  onValueChange?: (args: {
    value: unknown;
    formData: Record<string, unknown>;
  }) => Partial<Record<string, unknown>> | void;
  quickCreate?: QuickCreateConfig;
};

export type EntityFormHandle = {
  setFieldValue: (name: string, value: unknown) => void;
  patchFormData: (partial: Record<string, unknown>) => void;
  getFormData: () => Record<string, unknown>;
};

export type EntityFormProps = {
  title: string;
  fields: FieldConfig[];
  isLoading?: boolean;
  error?: string;
  serverFieldErrors?: Record<string, string>;
  onCancel: () => void;
  onSubmit: (formData: Record<string, unknown>) => Promise<void>;
  submitLabel?: string | ((formData: Record<string, unknown>) => string);
  cancelLabel?: string;
  description?: string;
  heroLabel?: string;
  variant?: "modal" | "page" | "drawer";
  /** When this changes, form state resets to field default values */
  formKey?: string | number;
};

function seedPricingFields(
  initialData: Record<string, unknown>,
  pricing: CatalogPricingFields,
): void {
  initialData.cost_price = pricing.cost_price;
  initialData.cost_currency = pricing.cost_currency;
  initialData.sale_price = pricing.sale_price;
  initialData.sale_currency = pricing.sale_currency;
  initialData.sale_price_mode = pricing.sale_price_mode;
  initialData.sale_margin_type = pricing.sale_margin_type ?? "percentage";
  initialData.sale_margin_value = pricing.sale_margin_value ?? 0;
  initialData.currency_pricing = pricing.currency_pricing ?? pricing.sale_currency;
}

function buildInitialFormData(fields: FieldConfig[]) {
  const initialData: Record<string, unknown> = {};
  fields.forEach((field) => {
    if (field.type === "pricing") {
      const pricing = defaultCatalogPricingFromRecord(
        (field.value as Partial<CatalogPricingFields>) ?? {},
      );
      seedPricingFields(initialData, pricing);
      return;
    }
    if (field.type === "toggle") {
      initialData[field.name] = field.value === true;
    } else if (field.type === "multiselect" || field.type === "tags") {
      initialData[field.name] = Array.isArray(field.value) ? field.value : [];
    } else {
      initialData[field.name] = field.value ?? "";
    }
  });
  return initialData;
}

type SectionConfig = {
  name: string;
  description?: string;
  fields: FieldConfig[];
};

export const EntityForm = forwardRef<EntityFormHandle, EntityFormProps>(
  function EntityForm(
    {
      title,
      fields,
      isLoading = false,
      error,
      serverFieldErrors,
      onCancel,
      onSubmit,
      submitLabel = "Save",
      cancelLabel = "Cancel",
      description,
      heroLabel = "Guided Entry",
      variant = "page",
      formKey = "default",
    },
    ref,
  ) {
    const [formData, setFormData] = useState<Record<string, unknown>>(() =>
      buildInitialFormData(fields),
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [activeQuickCreateField, setActiveQuickCreateField] = useState<
      string | null
    >(null);
    const [highlightInvalidSectionIndex, setHighlightInvalidSectionIndex] =
      useState<number | null>(null);
    const sectionRefs = useRef<(HTMLElement | null)[]>([]);

    const isStackedLayout = variant === "page";
    const requiredFieldsCount = fields.filter((field) => field.required).length;
    const resolvedSubmitLabel =
      typeof submitLabel === "function" ? submitLabel(formData) : submitLabel;

    const contentSections = useMemo(() => {
      return fields.reduce((acc, field) => {
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
    }, [fields]);

    const sections = useMemo(() => {
      if (!isStackedLayout && contentSections.length > 1) {
        return [
          ...contentSections,
          {
            name: "Review & Save",
            description:
              "Review all your details in the snapshot below before finalizing.",
            fields: [],
          },
        ];
      }
      return contentSections;
    }, [contentSections, isStackedLayout]);

    const currentSection = sections[currentSectionIndex];
    const isFinalSection = currentSectionIndex === sections.length - 1;

    const scrollToSection = (index: number) => {
      sectionRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    useEffect(() => {
      setFormData(buildInitialFormData(fields));
      setFieldErrors({});
      setCurrentSectionIndex(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when form identity changes
    }, [formKey]);

    useEffect(() => {
      if (!serverFieldErrors || Object.keys(serverFieldErrors).length === 0) {
        return;
      }

      setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
    }, [serverFieldErrors]);

    const setFieldValue = useCallback((name: string, value: unknown) => {
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
      setFieldErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }, [fields]);

    const patchFormData = useCallback((partial: Record<string, unknown>) => {
      setFormData((prev) => ({ ...prev, ...partial }));
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        setFieldValue,
        patchFormData,
        getFormData: () => formData,
      }),
      [setFieldValue, patchFormData, formData],
    );

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
      if (field.type === "pricing") {
        const cost = Number(formData.cost_price);
        const sale = Number(formData.sale_price);
        if (!Number.isFinite(cost) || cost < 0) return true;
        if (formData.sale_price_mode !== "margin") {
          return !Number.isFinite(sale) || sale < 0;
        }
        return false;
      }
      if (field.type === "multiselect" || field.type === "tags")
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
          errors[field.name] =
            field.type === "pricing"
              ? "Complete cost and sale pricing"
              : `${field.label} is required`;
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

    const getStackedSectionStatus = (sectionFields: FieldConfig[]) => {
      const hasRequired = sectionFields.some(
        (field) => field.required && !isFieldDisabled(field),
      );
      if (!hasRequired) return "neutral";
      return Object.keys(validateSection(sectionFields)).length > 0
        ? "incomplete"
        : "complete";
    };

    const handleChange = (name: string, value: unknown) => {
      setFieldValue(name, value);
    };

    const activeQuickCreate = activeQuickCreateField
      ? fields.find((field) => field.name === activeQuickCreateField)?.quickCreate
      : undefined;

    const handleQuickCreateSubmit = async (data: Record<string, unknown>) => {
      if (!activeQuickCreateField || !activeQuickCreate) return;

      const created = await activeQuickCreate.onCreate(data);
      const fieldName = activeQuickCreateField;
      const createdIds =
        "ids" in created
          ? created.ids
          : "id" in created
            ? [created.id]
            : [];

      if (activeQuickCreate.mode === "multiselect-append") {
        setFormData((prev) => {
          const current = Array.isArray(prev[fieldName])
            ? (prev[fieldName] as Array<number | string>)
            : [];
          const nextIds = createdIds.filter(
            (id) => !current.some((item) => String(item) === String(id)),
          );
          if (nextIds.length === 0) return prev;
          return { ...prev, [fieldName]: [...current, ...nextIds] };
        });
      } else {
        const firstId = createdIds[0];
        if (firstId !== undefined) {
          setFieldValue(fieldName, String(firstId));
        }
      }
    };

    const renderFieldLabelRow = (
      field: FieldConfig,
      options?: { multiselect?: boolean },
    ) => {
      const quickCreate = field.quickCreate;
      const showQuickCreate =
        quickCreate &&
        quickCreate.enabled !== false &&
        (field.type === "select" || field.type === "multiselect");

      return (
        <div className="mb-2 ml-1 flex items-center justify-between gap-2">
          <label className="label-caps block">
            {field.label}{" "}
            {field.required && <span className="text-error">*</span>}
          </label>
          {showQuickCreate ? (
            <QuickCreateButton
              label={options?.multiselect ? "New" : "New"}
              ariaLabel={`Add new ${field.label}`}
              onClick={() => setActiveQuickCreateField(field.name)}
              disabled={isSubmitting || isLoading}
            />
          ) : null}
        </div>
      );
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

      if (!isStackedLayout && !isFinalSection) {
        handleNextSection();
        return;
      }

      const sectionsToValidate = isStackedLayout ? contentSections : sections;
      const errors = sectionsToValidate.reduce(
        (acc, section) => ({ ...acc, ...validateSection(section.fields) }),
        {} as Record<string, string>,
      );

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        const firstInvalidSectionIndex = sectionsToValidate.findIndex((section) =>
          section.fields.some((field) => errors[field.name]),
        );
        if (firstInvalidSectionIndex >= 0) {
          if (isStackedLayout) {
            setHighlightInvalidSectionIndex(firstInvalidSectionIndex);
            scrollToSection(firstInvalidSectionIndex);
          } else {
            setCurrentSectionIndex(firstInvalidSectionIndex);
          }
        }
        return;
      }

      setHighlightInvalidSectionIndex(null);
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch {
        // Parent sets error state; keep the form open.
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
          field.type === "tags" ||
          field.type === "pricing" ||
          field.span === 2,
      );
      return shouldUseSingleColumn ? "space-y-4" : "grid gap-4 md:grid-cols-2";
    };

    const getFieldWrapperClassName = (field: FieldConfig) => {
      if (
        field.span === 2 ||
        field.type === "textarea" ||
        field.type === "toggle" ||
        field.type === "multiselect" ||
        field.type === "tags" ||
        field.type === "pricing"
      )
        return "md:col-span-2";
      return "";
    };

    const sectionSpansFullWidth = (section: SectionConfig) =>
      section.fields.some(
        (field) =>
          field.span === 2 ||
          field.type === "multiselect" ||
          field.type === "tags" ||
          field.type === "image" ||
          field.type === "pricing",
      ) || section.fields.length > 5;

    const getStackedSectionSpanClassName = (section: SectionConfig) =>
      sectionSpansFullWidth(section) ? "xl:col-span-2" : "";

    if (!isStackedLayout && !currentSection) return null;
    if (isStackedLayout && contentSections.length === 0) return null;

    const isModalStyleChrome = variant === "modal" || variant === "drawer";

    const renderSectionFields = (sectionFields: FieldConfig[]) =>
      sectionFields.map((field, idx) => {
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
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  disabled={isSubmitting || isLoading || fieldDisabled}
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
                    <p className="mt-1 text-caption leading-relaxed text-on-surface-variant/70">
                      {field.description}
                    </p>
                  )}
                </div>
              </label>
            ) : field.type === "pricing" ? (
              <div className="w-full">
                {field.sectionDescription && (
                  <p className="mb-4 text-sm leading-relaxed text-on-surface-variant">
                    {field.sectionDescription}
                  </p>
                )}
                <PricingFields
                  values={defaultCatalogPricingFromRecord(formData)}
                  onChange={(partial) => {
                    Object.entries(partial).forEach(([key, value]) => {
                      handleChange(key, value);
                    });
                  }}
                  errors={fieldErrors}
                  disabled={isSubmitting || isLoading || fieldDisabled}
                />
              </div>
            ) : field.type === "image" ? (
              <div className="group">
                <label className="label-caps mb-2 ml-1 block">
                  {field.label}{" "}
                  {field.required && <span className="text-error">*</span>}
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
                {field.type === "textarea" ||
                  field.type === "select" ||
                  field.type === "multiselect" ||
                  field.type === "tags" ? (
                  field.type === "tags" ? (
                    <label className="label-caps mb-2 ml-1 block">
                      {field.label}{" "}
                      {field.required && <span className="text-error">*</span>}
                    </label>
                  ) : (
                    renderFieldLabelRow(field, {
                      multiselect: field.type === "multiselect",
                    })
                  )
                ) : (
                  <label className="label-caps mb-2 ml-1 block">
                    {field.label}{" "}
                    {field.required && <span className="text-error">*</span>}
                  </label>
                )}
                <div className="relative">
                  {field.type === "textarea" ? (
                    <textarea
                      value={String(fieldValue ?? "")}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className={`form-input-base !rounded-2xl !bg-surface-container-lowest transition-all focus:ring-8 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                      rows={field.rows ?? 4}
                      placeholder={field.placeholder}
                      disabled={isSubmitting || isLoading || fieldDisabled}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={String(fieldValue ?? "")}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className={`form-input-base !rounded-2xl !bg-surface-container-lowest transition-all focus:ring-8 ${fieldErrors[field.name] ? "form-input-error" : ""}`}
                      disabled={isSubmitting || isLoading || fieldDisabled}
                    >
                      <option value="">Select Option</option>
                      {getFieldOptions(field).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "tags" ? (
                    <TagInput
                      value={
                        Array.isArray(fieldValue)
                          ? fieldValue.map(String)
                          : []
                      }
                      onChange={(tags) => handleChange(field.name, tags)}
                      placeholder={field.placeholder}
                      description={field.description}
                      disabled={isSubmitting || isLoading || fieldDisabled}
                    />
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
                              (item) => String(item) === String(option.value),
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
                                    onClick={() => handleChange(field.name, [])}
                                    disabled={
                                      isSubmitting || isLoading || fieldDisabled
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
                                (item) => String(item) === String(option.value),
                              );
                            return (
                              <label
                                key={option.value}
                                className={`flex items-start gap-3 rounded-xl border p-2.5 transition-colors ${checked
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
                                    isSubmitting || isLoading || fieldDisabled
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
                      onWheel={(event) => {
                        event.currentTarget.blur();
                      }}
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
                      disabled={isSubmitting || isLoading || fieldDisabled}
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
      });

    const renderSectionCard = (
      section: SectionConfig,
      index: number,
      options?: { showReviewEmpty?: boolean },
    ) => {
      const isInvalidHighlight = highlightInvalidSectionIndex === index;
      const stackedStatus = isStackedLayout
        ? getStackedSectionStatus(section.fields)
        : null;

      return (
        <section
          key={section.name}
          ref={(el) => {
            sectionRefs.current[index] = el;
          }}
          className={`form-section-card scroll-mt-24 shadow-sm ${isStackedLayout ? `h-full ${getStackedSectionSpanClassName(section)}` : ""
            } ${isInvalidHighlight ? "border-error/30" : ""}`}
        >
          <div className="form-section-header mb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mono-data label-caps rounded-lg bg-primary/8 px-2 py-1 text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="mt-1 text-2xl font-bold text-on-surface">
                    {section.name}
                  </h3>
                  {section.description ? (
                    <p className="mt-1 text-caption leading-relaxed text-on-surface-variant/70">
                      {section.description}
                    </p>
                  ) : null}
                </div>
              </div>
              {isStackedLayout && stackedStatus !== "neutral" ? (
                <span
                  className={`form-chip shrink-0 ${stackedStatus === "complete"
                    ? "border-success/30 bg-success-container text-success"
                    : "border-error/30 bg-error-container text-error"
                    }`}
                >
                  {stackedStatus === "complete" ? "Complete" : "Required"}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className={
              section.fields.length > 0
                ? getSectionLayoutClassName(section.fields)
                : ""
            }
          >
            {section.fields.length === 0 && options?.showReviewEmpty ? (
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
              renderSectionFields(section.fields)
            )}
          </div>
        </section>
      );
    };

    const shellClassName =
      variant === "drawer"
        ? "form-modal-shell flex min-h-0 flex-1 w-full flex-col overflow-hidden border rounded-2xl border-outline-variant/15 bg-surface-container-lowest"
        : isModalStyleChrome
          ? "form-modal-shell h-[94vh] max-h-[94vh] w-full flex flex-col overflow-hidden"
          : "flex w-full min-w-0 flex-col";

    const headerClassName =
      isModalStyleChrome
        ? "overflow-hidden border border-outline-variant/15 bg-surface-container-low p-4 md:p-2"
        : "rounded-[2rem] border border-outline-variant/15 bg-surface-container-low p-4 shadow-sm md:p-6 lg:p-8";

    const contentClassName =
      isModalStyleChrome ? "min-h-0 flex-1 overflow-y-auto" : "min-w-0 flex-1";

    const pagePaddingX = "px-4 md:px-6 lg:px-8";

    const footerClassName =
      isModalStyleChrome
        ? "sticky bottom-0 z-20 flex flex-col gap-4 border-t border-outline-variant/10 bg-surface-container-lowest/90 px-5 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between"
        : `sticky bottom-0 z-20 mt-6 flex flex-col gap-4 border-t border-outline-variant/10 bg-surface-container-lowest/90 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between ${pagePaddingX}`;

    const renderStackedSectionNav = (orientation: "horizontal" | "vertical") => (
      <div
        className={
          orientation === "horizontal"
            ? "-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden"
            : "hidden lg:flex lg:flex-col lg:gap-1.5"
        }
      >
        {contentSections.map((section, index) => {
          const status = getStackedSectionStatus(section.fields);
          return (
            <button
              key={section.name}
              type="button"
              onClick={() => scrollToSection(index)}
              className={`group flex items-center gap-2 rounded-xl border border-outline-variant/10 bg-surface-container-lowest/50 text-left transition-all hover:border-outline-variant/30 hover:bg-surface-container-lowest ${orientation === "horizontal"
                ? "shrink-0 px-3 py-2"
                : "w-full px-3 py-2.5"
                }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption font-bold ${status === "complete"
                  ? "bg-success-container text-success"
                  : status === "incomplete"
                    ? "bg-surface-container text-on-surface-variant"
                    : "bg-primary/10 text-primary"
                  }`}
              >
                {status === "complete"
                  ? "✓"
                  : String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={`font-bold text-on-surface-variant group-hover:text-on-surface ${orientation === "horizontal"
                  ? "truncate text-caption"
                  : "text-body-sm leading-snug"
                  }`}
              >
                {section.name}
              </span>
            </button>
          );
        })}
      </div>
    );

    return (
      <form onSubmit={handleSubmit} className={shellClassName}>
        {/* Header — omitted when title is empty (e.g. EntityDrawer supplies its own) */}
        {title ? (
          <div className={headerClassName}>
          {isStackedLayout ? (
            <>
              <div className="mb-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="form-chip">{heroLabel}</span>
                  <span className="form-chip">
                    {contentSections.length} sections
                  </span>
                  <span className="form-chip">{requiredFieldsCount} required</span>
                </div>
                <h2 className="text-display-md font-bold tracking-tight text-on-surface">
                  {title}
                </h2>
                {description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant lg:max-w-none">
                    {description}
                  </p>
                ) : null}
              </div>

              {contentSections.length > 1
                ? (
                  <div className="mt-4">{renderStackedSectionNav("horizontal")}</div>
                )
                : null}
            </>
          ) : (
            <>
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
                    className={`${isModalStyleChrome ? "text-2xl" : "text-display-md"} font-bold tracking-tight text-on-surface`}
                  >
                    {title}
                  </h2>
                  {description && !isModalStyleChrome && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                      {description}
                    </p>
                  )}
                </div>
              </div>

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
                    className={`group flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all ${index === currentSectionIndex
                      ? "border-primary/30 bg-surface-container-lowest shadow-sm"
                      : "border-outline-variant/5 bg-surface-container-lowest/30 hover:border-outline-variant/30"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold transition-colors ${getSectionStatus(index) === "complete"
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
                      className={`truncate text-caption font-bold transition-colors ${index === currentSectionIndex ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"}`}
                    >
                      {section.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          </div>
        ) : null}

        {/* Main Content */}
        <div className={contentClassName}>
          {error && (
            <div
              className={`my-4 flex gap-4 rounded-2xl border border-error/20 bg-error/5 p-4 ${pagePaddingX}`}
            >
              <div className="shrink-0 text-xl text-error">⚠</div>
              <p className="text-sm font-bold text-error">{error}</p>
            </div>
          )}

          {isStackedLayout ? (
            <div
              className={`pb-6 pt-4 ${pagePaddingX} ${contentSections.length > 1
                ? "lg:grid lg:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)] lg:items-start lg:gap-6 xl:gap-8"
                : ""
                }`}
            >
              {contentSections.length > 1 ? (
                <aside className="mb-2 lg:sticky lg:top-6 lg:mb-0 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:rounded-[1.25rem] lg:border lg:border-outline-variant/10 lg:bg-surface-container-lowest/60 lg:p-3">
                  <p className="label-caps mb-3 hidden px-1 text-on-surface-variant/70 lg:block">
                    Sections
                  </p>
                  {renderStackedSectionNav("vertical")}
                </aside>
              ) : null}

              <div
                className={`grid min-w-0 gap-6 grid-cols-1 ${contentSections.length > 1 ? "xl:grid-cols-2" : ""
                  }`}
              >
                {contentSections.map((section, index) =>
                  renderSectionCard(section, index),
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {currentSection
                ? renderSectionCard(currentSection, currentSectionIndex, {
                  showReviewEmpty: true,
                })
                : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={footerClassName}>
          <div>
            <p className="label-caps text-on-surface-variant/70">
              Operational Status
            </p>
            <p className="mt-1 text-sm font-bold text-on-surface-variant">
              {isStackedLayout
                ? "Review all sections above, then save."
                : isFinalSection
                  ? "Locked and ready for submission."
                  : "Please finalize the current phase."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              type="button"
              variant="ghost"
              size="lg"
              onClick={onCancel}
              disabled={isSubmitting || isLoading}
            >
              {cancelLabel}
            </ActionButton>

            {!isStackedLayout && currentSectionIndex > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSectionIndex((p) => p - 1)}
                className="rounded-2xl border border-outline-variant/20 bg-surface px-6 py-4 text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container-low"
              >
                Back
              </button>
            )}

            {isStackedLayout || isFinalSection ? (
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-on-primary shadow-md shadow-primary/15 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : resolvedSubmitLabel}
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

        {activeQuickCreate ? (
          <QuickCreateDrawer
            isOpen={activeQuickCreateField !== null}
            onClose={() => setActiveQuickCreateField(null)}
            title={activeQuickCreate.title}
            description={activeQuickCreate.description}
            submitLabel={activeQuickCreate.submitLabel}
            fields={activeQuickCreate.fields}
            onSubmit={handleQuickCreateSubmit}
            heroLabel="Quick Create"
            width="md"
          />
        ) : null}
      </form>
    );
  },
);

EntityForm.displayName = "EntityForm";
