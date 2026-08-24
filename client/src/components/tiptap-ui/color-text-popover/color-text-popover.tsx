import { forwardRef, useMemo, useRef, useState } from "react"
import { type Editor } from "@tiptap/react"

import { useMenuNavigation } from "@/hooks/use-menu-navigation"
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

import { BanIcon } from "@/components/tiptap-icons/ban-icon"
import { CaseSensitiveIcon } from "@/components/tiptap-icons/case-sensitive-icon"

import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button-group"
import {
  Card,
  CardBody,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/tiptap-ui-primitive/popover"
import { Separator } from "@/components/tiptap-ui-primitive/separator"

import {
  ColorTextButton,
  pickTextColorsByValue,
  useColorText,
  type TextColor,
  type UseColorTextConfig,
} from "@/components/tiptap-ui/color-text-button"

export interface ColorTextPopoverContentProps {
  editor?: Editor | null
  colors?: TextColor[]
}

export interface ColorTextPopoverProps
  extends Omit<ButtonProps, "type">,
    Pick<UseColorTextConfig, "editor" | "hideWhenUnavailable" | "onApplied"> {
  colors?: TextColor[]
}

export const ColorTextPopoverButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, children, ...props }, ref) => (
  <Button
    type="button"
    className={className}
    variant="ghost"
    data-appearance="default"
    role="button"
    tabIndex={-1}
    aria-label="Text color"
    tooltip="Màu chữ"
    ref={ref}
    {...props}
  >
    {children ?? <CaseSensitiveIcon className="tiptap-button-icon" />}
  </Button>
))

ColorTextPopoverButton.displayName = "ColorTextPopoverButton"

export function ColorTextPopoverContent({
  editor,
  colors = pickTextColorsByValue([
    "var(--tt-color-text-red)",
    "var(--tt-color-text-orange)",
    "var(--tt-color-text-yellow)",
    "var(--tt-color-text-green)",
    "var(--tt-color-text-blue)",
    "var(--tt-color-text-purple)",
    "var(--tt-color-text-pink)",
    "var(--tt-color-text-gray)",
  ]),
}: ColorTextPopoverContentProps) {
  const { handleRemoveColor } = useColorText({ editor })
  const isMobile = useIsBreakpoint()
  const containerRef = useRef<HTMLDivElement>(null)

  const menuItems = useMemo(
    () => [...colors, { label: "Xóa màu chữ", value: "none" }],
    [colors]
  )

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    orientation: "both",
    onSelect: (item) => {
      if (!containerRef.current) return false
      const highlightedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]'
      ) as HTMLElement
      if (highlightedElement) highlightedElement.click()
      if (item.value === "none") handleRemoveColor()
      return true
    },
    autoSelectFirstItem: false,
  })

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      style={isMobile ? { boxShadow: "none", border: 0 } : {}}
    >
      <CardBody style={isMobile ? { padding: 0 } : {}}>
        <CardItemGroup orientation="horizontal">
          <ButtonGroup>
            {colors.map((color, index) => (
              <ButtonGroup key={color.value}>
                <ColorTextButton
                  editor={editor}
                  textColor={color.value}
                  tooltip={color.label}
                  aria-label={color.label}
                  tabIndex={index === selectedIndex ? 0 : -1}
                  data-highlighted={selectedIndex === index}
                />
              </ButtonGroup>
            ))}
          </ButtonGroup>
          <Separator />
          <ButtonGroup>
            <Button
              onClick={handleRemoveColor}
              aria-label="Xóa màu chữ"
              tooltip="Xóa màu chữ"
              tabIndex={selectedIndex === colors.length ? 0 : -1}
              type="button"
              role="menuitem"
              variant="ghost"
              data-highlighted={selectedIndex === colors.length}
            >
              <BanIcon className="tiptap-button-icon" />
            </Button>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </Card>
  )
}

export function ColorTextPopover({
  editor: providedEditor,
  colors = pickTextColorsByValue([
    "var(--tt-color-text-red)",
    "var(--tt-color-text-orange)",
    "var(--tt-color-text-yellow)",
    "var(--tt-color-text-green)",
    "var(--tt-color-text-blue)",
    "var(--tt-color-text-purple)",
    "var(--tt-color-text-pink)",
    "var(--tt-color-text-gray)",
  ]),
  hideWhenUnavailable = false,
  onApplied,
  ...props
}: ColorTextPopoverProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)
  const { isVisible, canColorText, isActive, label, Icon } = useColorText({
    editor,
    hideWhenUnavailable,
    onApplied,
  })

  if (!isVisible) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ColorTextPopoverButton
          disabled={!canColorText}
          data-active-state={isActive ? "on" : "off"}
          data-disabled={!canColorText}
          aria-pressed={isActive}
          aria-label={label}
          tooltip={label}
          {...props}
        >
          <Icon className="tiptap-button-icon" />
        </ColorTextPopoverButton>
      </PopoverTrigger>
      <PopoverContent aria-label="Text colors">
        <ColorTextPopoverContent editor={editor} colors={colors} />
      </PopoverContent>
    </Popover>
  )
}

export default ColorTextPopover
