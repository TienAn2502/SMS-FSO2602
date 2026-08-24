import { forwardRef, useCallback, useMemo } from "react"

import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  useColorText,
  type UseColorTextConfig,
} from "@/components/tiptap-ui/color-text-button/use-color-text"

import "@/components/tiptap-ui/color-text-button/color-text-button.scss"

export interface ColorTextButtonProps
  extends Omit<ButtonProps, "type">,
    UseColorTextConfig {
  textColor: string
  text?: string
}

export const ColorTextButton = forwardRef<
  HTMLButtonElement,
  ColorTextButtonProps
>(
  (
    {
      editor,
      textColor,
      text,
      label,
      hideWhenUnavailable,
      onApplied,
      onClick,
      style,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { isVisible, isActive, canColorText, handleColorText } = useColorText(
      {
        editor,
        textColor,
        label: text || label || `Màu chữ (${textColor})`,
        hideWhenUnavailable,
        onApplied,
      }
    )

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleColorText()
      },
      [handleColorText, onClick]
    )

    const buttonStyle = useMemo(
      () =>
        ({
          ...style,
          "--text-color": textColor,
        }) as React.CSSProperties,
      [style, textColor]
    )

    if (!isVisible) {
      return null
    }

    return (
      <Button
        type="button"
        variant="ghost"
        data-active-state={isActive ? "on" : "off"}
        role="button"
        tabIndex={-1}
        disabled={!canColorText}
        data-disabled={!canColorText}
        aria-label={label || text || "Text color"}
        aria-pressed={isActive}
        tooltip={label || text}
        onClick={handleClick}
        style={buttonStyle}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <span
              className="tiptap-button-text-color"
              style={{ "--text-color": textColor } as React.CSSProperties}
            />
            {text ? <span className="tiptap-button-text">{text}</span> : null}
          </>
        )}
      </Button>
    )
  }
)

ColorTextButton.displayName = "ColorTextButton"
