import * as React from "react"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef(({ className, src, alt, onError, ...props }, ref) => {
  const [hasError, setHasError] = React.useState(false)
  
  if (!src || hasError) return null
  
  return (
    <img
      ref={ref}
      src={src}
      alt={alt || ""}
      className={cn("aspect-square h-full w-full object-cover", className)}
      style={{ borderRadius: 'inherit' }}
      onError={() => setHasError(true)}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-slate-100 text-slate-600 text-sm font-medium",
      className
    )}
    style={{ borderRadius: 'inherit' }}
    {...props}
  >
    {children}
  </div>
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }