"use client";

type QuickEditInputProps = {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  min?: number;
  step?: number | string;
  className?: string;
  align?: "left" | "right" | "center";
  disabled?: boolean;
  "aria-label"?: string;
};

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function QuickEditInput({
  value,
  onChange,
  type = "text",
  min,
  step,
  className = "",
  align = "left",
  disabled = false,
  "aria-label": ariaLabel,
}: QuickEditInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      onWheel={
        type === "number"
          ? (e) => (e.currentTarget as HTMLInputElement).blur()
          : undefined
      }
      className={`form-input-base mono-data min-w-[4.5rem] py-1.5 text-xs ${alignClass[align]} ${type === "number" ? "[&::-webkit-inner-spin-button]:appearance-none" : ""} ${className}`}
    />
  );
}
