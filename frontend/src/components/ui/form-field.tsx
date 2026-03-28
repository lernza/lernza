import { AlertCircle } from "lucide-react"

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" aria-live="polite" className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-bold">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
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
