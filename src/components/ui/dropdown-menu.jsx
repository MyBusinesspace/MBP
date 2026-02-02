import * as React from "react"
import { ChevronRight, Circle, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const MenuContext = React.createContext(null)

function DropdownMenu({ children }) {
  const [open, setOpen] = React.useState(false)
  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </MenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef(({ children, ...props }, ref) => {
  const ctx = React.useContext(MenuContext)
  const onClick = (e) => {
    ctx?.setOpen(!ctx.open)
    props.onClick?.(e)
  }
  if (React.isValidElement(children)) {
    return React.cloneElement(children, { onClick, ref })
  }
  return (
    <button ref={ref} onClick={onClick} {...props}>
      {children}
    </button>
  )
})

const DropdownMenuGroup = ({ children, ...props }) => (
  <div role="group" {...props}>{children}</div>
)

const DropdownMenuPortal = ({ children }) => children

const DropdownMenuSub = ({ children }) => <div>{children}</div>

const DropdownMenuRadioGroup = ({ children, ...props }) => (
  <div role="radiogroup" {...props}>{children}</div>
)

const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </div>
))

const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
      className
    )}
    {...props}
  />
))

const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => {
  const ctx = React.useContext(MenuContext)
  if (!ctx?.open) return null
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    />
  )
})

const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))

const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
      className
    )}
    data-checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {checked ? <Check className="h-4 w-4" /> : null}
    </span>
    {children}
  </div>
))

const DropdownMenuRadioItem = React.forwardRef(({ className, children, selected, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      {selected ? <Circle className="h-2 w-2 fill-current" /> : null}
    </span>
    {children}
  </div>
))

const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />
))

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))

const DropdownMenuShortcut = ({ className, ...props }) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
)

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}