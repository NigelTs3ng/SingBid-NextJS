"use client";
import React, { forwardRef, useId } from "react";
import { cn } from "../../utils/cn";

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  wrapperClassName?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type = "text",
    label,
    description,
    error,
    required,
    id,
    wrapperClassName,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  // simple inputs for checkbox/radio
  if (type === "checkbox" || type === "radio") {
    return (
      <input
        id={inputId}
        ref={ref}
        type={type}
        className={cn(
          type === "checkbox"
            ? "h-4 w-4 rounded border-2 border-slate-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            : "h-4 w-4 rounded-full border-2 border-slate-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        {...rest}
      />
    );
  }

  const baseInputClasses =
    "flex h-10 w-full rounded-md border-2 border-slate-200 hover:border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 transition-all duration-200";

  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            error ? "text-red-600" : "text-gray-900"
          )}
        >
          {label}
          {required ? <span className="text-red-500 ml-1">*</span> : null}
        </label>
      )}

      <input
        id={inputId}
        ref={ref}
        type={type}
        className={cn(
          baseInputClasses,
          error && "border-red-500 focus:border-red-500 focus:ring-red-200",
          className
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={description ? `${inputId}-desc` : undefined}
        {...rest}
      />

      {description && !error ? (
        <p id={`${inputId}-desc`} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
