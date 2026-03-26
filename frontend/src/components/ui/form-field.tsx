import { AlertCircle } from "lucide-react"

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-destructive mt-1 flex items-center gap-1.5 text-xs font-bold">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

export function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-black">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}
