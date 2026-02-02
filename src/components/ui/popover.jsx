import * as React from "react"
import { cn } from "@/lib/utils"

const PopoverContext = React.createContext(null)

function Popover({ children, open: controlledOpen, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = React.useCallback((next) => {
    const value = typeof next === 'function' ? next(open) : next
    if (isControlled) {
      onOpenChange?.(value)
    } else {
      setUncontrolledOpen(value)
    }
  }, [isControlled, onOpenChange, open])
  const containerRef = React.useRef(null)
  const value = React.useMemo(() => ({ open, setOpen, containerRef }), [open, setOpen])
  return (
    <PopoverContext.Provider value={value}>
      <div ref={containerRef} className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = React.forwardRef(({ children, ...props }, ref) => {
  const ctx = React.useContext(PopoverContext)
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

const PopoverAnchor = ({ children }) => children

const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const ctx = React.useContext(PopoverContext)

  React.useEffect(() => {
    if (!ctx?.open) return
    const onDocClick = (e) => {
      const container = ctx?.containerRef?.current
      if (container && !container.contains(e.target)) {
        ctx.setOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') ctx.setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ctx?.open])

  if (!ctx?.open) return null
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-2 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className
      )}
      {...props}
    />
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }