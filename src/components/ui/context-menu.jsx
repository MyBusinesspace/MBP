import * as React from "react"
import { cn } from "@/lib/utils"

const ContextMenuContext = React.createContext({
  open: false,
  setOpen: () => {},
  position: { x: 0, y: 0 },
  setPosition: () => {}
})

export const ContextMenu = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    const handleClickOutside = () => setOpen(false)
    const handleScroll = () => setOpen(false)
    
    if (open) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [open])

  return (
    <ContextMenuContext.Provider value={{ open, setOpen, position, setPosition }}>
      {children}
    </ContextMenuContext.Provider>
  )
}

export const ContextMenuTrigger = React.forwardRef(({ children, asChild, ...props }, ref) => {
  const { setOpen, setPosition } = React.useContext(ContextMenuContext)

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setPosition({ x: e.clientX, y: e.clientY })
    setOpen(true)
  }

  const child = React.Children.only(children)
  
  return React.cloneElement(child, {
    onContextMenu: handleContextMenu,
    ref
  })
})
ContextMenuTrigger.displayName = "ContextMenuTrigger"

export const ContextMenuContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, position } = React.useContext(ContextMenuContext)
  const contentRef = React.useRef(null)

  React.useEffect(() => {
    if (open && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let x = position.x
      let y = position.y

      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10
      }
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10
      }

      contentRef.current.style.left = `${x}px`
      contentRef.current.style.top = `${y}px`
    }
  }, [open, position])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-slate-950 shadow-md animate-in fade-in-80 zoom-in-95",
        className
      )}
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  )
})
ContextMenuContent.displayName = "ContextMenuContent"

export const ContextMenuItem = React.forwardRef(({ className, inset, onClick, disabled, children, ...props }, ref) => {
  const { setOpen } = React.useContext(ContextMenuContext)

  const handleClick = (e) => {
    if (disabled) return
    e.stopPropagation()
    if (onClick) onClick(e)
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-100 hover:text-slate-900",
        inset && "pl-8",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  )
})
ContextMenuItem.displayName = "ContextMenuItem"

export const ContextMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-200", className)}
    {...props}
  />
))
ContextMenuSeparator.displayName = "ContextMenuSeparator"

export const ContextMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-slate-950",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
ContextMenuLabel.displayName = "ContextMenuLabel"

// Exports for compatibility
export const ContextMenuGroup = ({ children }) => <>{children}</>
export const ContextMenuPortal = ({ children }) => <>{children}</>
export const ContextMenuSub = ({ children }) => <>{children}</>
export const ContextMenuSubContent = ({ children }) => <>{children}</>
export const ContextMenuSubTrigger = ({ children }) => <>{children}</>
export const ContextMenuRadioGroup = ({ children }) => <>{children}</>
export const ContextMenuCheckboxItem = ({ children }) => <>{children}</>
export const ContextMenuRadioItem = ({ children }) => <>{children}</>
export const ContextMenuShortcut = ({ children, className }) => (
  <span className={cn("ml-auto text-xs tracking-widest text-slate-500", className)}>
    {children}
  </span>
)