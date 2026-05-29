import React from "react"
import { AlertCircle } from "lucide-react"

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" aria-live="polite" className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-bold">
      <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

export function FormLabel({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-black">
      {children}
      {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
    </label>
  )
}

interface FormFieldProps {
  id: string
  label?: string
  required?: boolean
  error?: string
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode
}

export function FormField({ id, label, required, error, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div>
      {label && <FormLabel htmlFor={id} required={required}>{label}</FormLabel>}
      {children({ id, "aria-invalid": !!error, "aria-describedby": errorId })}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
