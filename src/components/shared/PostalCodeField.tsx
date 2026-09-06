"use client";

import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { europeanPostalCodeMessage, normalizeEuropeanPostalCode, validateEuropeanPostalCode } from "@/lib/european-countries";

export function PostalCodeField({
  id,
  label,
  country,
  locale,
  value,
  onChange,
  required = true,
  disabled = false,
  inputClassName = "",
  className = "",
}: {
  id: string;
  label: string;
  country: string;
  locale: "fr" | "en";
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  inputClassName?: string;
  className?: string;
}) {
  const validation = validateEuropeanPostalCode(country, value);
  const showError = Boolean(value.trim()) && !validation.valid;
  const hintId = `${id}-format`;
  const message = showError
    ? europeanPostalCodeMessage(country, value, locale)
    : `${locale === "fr" ? "Exemple" : "Example"} : ${validation.example}`;

  return (
    <div className={`min-w-0 ${className}`}>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-bold text-charcoal">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            const normalized = normalizeEuropeanPostalCode(country, value);
            if (normalized !== value) onChange(normalized);
          }}
          required={required}
          disabled={disabled}
          minLength={2}
          maxLength={20}
          autoComplete="postal-code"
          autoCapitalize="characters"
          inputMode="text"
          placeholder={validation.example}
          aria-invalid={showError || undefined}
          aria-describedby={hintId}
          className={`uppercase ${validation.valid ? "border-burgundy/30 pr-9" : showError ? "border-destructive/45 pr-3" : ""} ${inputClassName}`}
        />
        {validation.valid ? <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy" aria-hidden="true" /> : null}
      </div>
      <p id={hintId} className={`mt-1 text-[9px] leading-4 ${showError ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{message}</p>
    </div>
  );
}
