"use client";
import React, { useId, useState } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";
import Button from "./Button";
import Input from "./Input";

export type Option<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type BaseProps = {
  id?: string;
  name?: string;
  className?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type SingleSelectProps<T extends string = string> = BaseProps & {
  multiple?: false;
  value?: T;
  defaultValue?: T;
  options: Option<T>[];
  onChange?: (value: T) => void;
};

type MultiSelectProps<T extends string = string> = BaseProps & {
  multiple: true;
  value?: T[];
  defaultValue?: T[];
  options: Option<T>[];
  onChange?: (value: T[]) => void;
};

export type SelectProps<T extends string = string> =
  | (SingleSelectProps<T> &
      Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "defaultValue" | "type">)
  | (MultiSelectProps<T> &
      Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "defaultValue" | "type">);

function isMulti<T extends string>(p: SelectProps<T>): p is MultiSelectProps<T> {
  return !!(p as MultiSelectProps<T>).multiple;
}

/** Function type with a call signature *and* an optional displayName */
type SelectComponent = {
  <T extends string = string>(
    props: SelectProps<T> & React.RefAttributes<HTMLButtonElement>
  ): React.ReactElement | null;
  displayName?: string;
};

const SelectInner = <T extends string = string>(
  props: SelectProps<T>,
  ref: React.Ref<HTMLButtonElement>
) => {
  const {
    className,
    options = [] as Option<T>[],
    value,
    defaultValue, // kept for API completeness (not used internally)
    placeholder = "Select an option",
    disabled = false,
    required = false,
    label,
    description,
    error,
    searchable = false,
    clearable = false,
    loading = false,
    id,
    name,
    onChange,
    onOpenChange,
    multiple,
    ...rest
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const autoId = useId();
  const selectId = id ?? `select-${autoId}`;

  const filteredOptions = searchable && searchTerm
    ? options.filter((o) =>
        o?.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o?.value && o.value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  const hasValue = isMulti(props)
    ? Array.isArray(value) && value.length > 0
    : value !== undefined && (value as unknown as string) !== "";

  const getSelectedDisplay = () => {
    if (!hasValue) return placeholder;

    if (isMulti(props)) {
      const v = (value ?? []) as T[];
      const selectedOptions = options.filter((opt) => v.includes(opt.value));
      if (selectedOptions.length === 0) return placeholder;
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      return `${selectedOptions.length} items selected`;
    }
    const v = value as T | undefined;
    const selected = options.find((o) => o.value === v);
    return selected ? selected.label : placeholder;
  };

  const handleToggle = () => {
    if (disabled) return;
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
    if (!next) setSearchTerm("");
  };

  const handleOptionSelect = (opt: Option<T>) => {
    if (isMulti(props)) {
      const current = (value ?? []) as T[];
      const exists = current.includes(opt.value);
      const updated = exists ? current.filter((v) => v !== opt.value) : [...current, opt.value];
      (onChange as ((v: T[]) => void) | undefined)?.(updated);
    } else {
      (onChange as ((v: T) => void) | undefined)?.(opt.value);
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleClear: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    if (isMulti(props)) {
      (onChange as ((v: T[]) => void) | undefined)?.([]);
    } else {
      (onChange as ((v: T) => void) | undefined)?.("" as T);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "text-sm font-medium leading-none mb-2 block",
            error ? "text-red-600" : "text-gray-900"
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={ref}
          id={selectId}
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border-2 border-slate-200 hover:border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 transition-all duration-200",
            error && "border-red-500 focus:border-red-500 focus:ring-red-200",
            !hasValue && "text-slate-400"
          )}
          onClick={handleToggle}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          {...rest}
        >
          <span className="truncate">{getSelectedDisplay()}</span>

        <div className="flex items-center gap-1">
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}

            {clearable && hasValue && !loading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={handleClear}
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>

        {/* Hidden native select for form submission */}
        {isMulti(props) ? (
          <select
            name={name}
            value={((value as T[] | undefined) ?? []) as any}
            multiple
            required={required}
            className="sr-only"
            tabIndex={-1}
            onChange={() => {}}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            name={name}
            value={((value as T | undefined) ?? "") as any}
            required={required}
            className="sr-only"
            tabIndex={-1}
            onChange={() => {}}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white text-slate-900 border-2 border-slate-200 rounded-md shadow-lg">
            {searchable && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search options..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-8"
                  />
                </div>
              </div>
            )}

            <div className="py-1 max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {searchTerm ? "No options found" : "No options available"}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const selected = isMulti(props)
                    ? ((value as T[] | undefined) ?? []).includes(opt.value)
                    : (value as T | undefined) === opt.value;

                  return (
                    <div
                      key={opt.value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-slate-100",
                        selected && "bg-primary text-primary-foreground",
                        opt.disabled && "pointer-events-none opacity-50"
                      )}
                      onClick={() => !opt.disabled && handleOptionSelect(opt)}
                    >
                      <span className="flex-1">{opt.label}</span>
                      {isMulti(props) && selected && <Check className="h-4 w-4" />}
                      {opt.description && (
                        <span className="text-xs text-muted-foreground ml-2">{opt.description}</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {description && !error && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};

// set displayName on the inner function (no type error)
(SelectInner as any).displayName = "Select";

// forwardRef + cast to callable component type that also carries displayName
const Select = React.forwardRef<HTMLButtonElement, SelectProps<any>>(
  SelectInner
) as SelectComponent;

Select.displayName = "Select";

export default Select;
