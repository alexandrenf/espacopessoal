"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const labelStyles = {
  base: "text-sm font-medium leading-none",
  state: "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
} as const;

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  className?: string;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelStyles.base, labelStyles.state, className)}
    {...props}
  />
));

Label.displayName = "Label";

export { Label };
