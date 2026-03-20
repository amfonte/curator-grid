"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode
  htmlFor?: string
  children: React.ReactElement
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, htmlFor, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("form-field flex flex-col gap-2", className)}
        {...props}
      >
        <label
          htmlFor={htmlFor}
          className="text-base font-normal text-foreground leading-6"
        >
          {label}
        </label>
        {children}
      </div>
    )
  },
)
FormField.displayName = "FormField"

export { FormField }
