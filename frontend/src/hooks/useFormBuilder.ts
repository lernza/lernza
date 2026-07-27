import { useState, useCallback, type ChangeEvent } from "react"

export type Validator<T> = (values: T) => Partial<Record<keyof T, string>>

export interface UseFormBuilderOptions<T extends Record<string, unknown>> {
  initialValues: T
  validate?: Validator<T>
  onSubmit: (values: T) => void | Promise<void>
}

export function useFormBuilder<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormBuilderOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleChange = useCallback(
    (name: keyof T) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const val = e.target.value
        setValues(prev => ({ ...prev, [name]: val }))
        if (errors[name]) {
          setErrors(prev => ({ ...prev, [name]: undefined }))
        }
      },
    [errors]
  )

  const setValue = useCallback((name: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setIsSubmitting(false)
  }, [initialValues])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e && e.preventDefault) {
        e.preventDefault()
      }

      if (validate) {
        const validationErrors = validate(values)
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors)
          return
        }
      }

      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, validate, onSubmit]
  )

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    setValue,
    resetForm,
    handleSubmit,
    setValues,
  }
}
