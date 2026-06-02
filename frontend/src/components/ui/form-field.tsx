import React from "react"
import { AlertCircle } from "lucide-react"

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-bold"
    >
      <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}

interface FormLabelProps {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
}

export function FormLabel({ children, required, htmlFor }: FormLabelProps) {
  return (
    // aria-required on the label element has no effect on its own; the prop is
    // forwarded to the actual input via FormField's render-prop pattern below.
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-black">
      {children}
      {required && (
        <span
          className="text-destructive ml-0.5"
          // Hidden from AT — the input's required/aria-required carries the semantics.
          aria-hidden="true"
        >
          *
        </span>
      )}
    </label>
  )
}

interface FormFieldRenderProps {
  id: string
  /** Maps to the native `required` attribute so the browser validates and AT
   *  announces "required" without relying solely on aria-required. */
  required?: boolean
  /** Redundant but belt-and-suspenders for custom inputs that don't forward
   *  the native required attribute (e.g. a div-based combobox). */
  "aria-required"?: boolean
  "aria-invalid": boolean
  "aria-describedby"?: string
}

interface FormFieldProps {
  id: string
  label?: string
  required?: boolean
  error?: string
  children: (props: FormFieldRenderProps) => React.ReactNode
}

export function FormField({ id, label, required, error, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined

  const renderProps: FormFieldRenderProps = {
    id,
    // Pass both required (native) and aria-required (ARIA) so:
    //  • Native inputs get built-in browser constraint validation.
    //  • Custom/role-based inputs expose the required state to screen readers.
    ...(required && { required: true, "aria-required": true }),
    "aria-invalid": !!error,
    ...(errorId && { "aria-describedby": errorId }),
  }

  return (
    <div>
      {label && (
        <FormLabel htmlFor={id} required={required}>
          {label}
        </FormLabel>
      )}
      {children(renderProps)}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
