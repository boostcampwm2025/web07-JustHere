import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gray" | "ghost";
  size?: "icon" | "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "flex items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-pressed active:bg-primary-pressed/90 focus-visible:ring-primary focus-visible:ring-offset-white",
    gray: "bg-gray-bg text-gray hover:bg-gray-disable/20 active:bg-gray-disable/30 focus-visible:ring-gray",
    ghost:
      "text-gray hover:bg-gray-bg active:bg-gray-disable/10 focus-visible:ring-gray",
  };

  const sizes = {
    icon: "h-fit w-fit p-2 rounded-lg",
    sm: "h-9 w-fit px-4 text-sm gap-1.5 rounded-lg",
    md: "h-11 w-fit px-6 text-base gap-2 rounded-xl",
    lg: "h-12 w-full text-base gap-2 rounded-xl",
  };

  const iconElement = icon ? <span className="shrink-0">{icon}</span> : null;

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {iconPosition === "left" && iconElement}
      {children && <span>{children}</span>}
      {iconPosition === "right" && iconElement}
    </button>
  );
}
