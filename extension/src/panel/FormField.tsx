import type { ReactNode } from "react"
import { cn } from "../lib/utils"

type FormFieldProps = {
  label: string
  htmlFor?: string
  className?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, className, children }: FormFieldProps) {
  return (
    <div className={cn("form-field flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-base font-normal leading-6 text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
