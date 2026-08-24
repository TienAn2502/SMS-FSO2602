"use client"

import { useCallback, useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"

import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { isMarkInSchema, isNodeTypeSelected } from "@/lib/tiptap-utils"
import { CaseSensitiveIcon } from "@/components/tiptap-icons/case-sensitive-icon"

export const TEXT_COLORS = [
  {
    label: "Xám",
    value: "var(--tt-color-text-gray)",
  },
  {
    label: "Nâu",
    value: "var(--tt-color-text-brown)",
  },
  {
    label: "Cam",
    value: "var(--tt-color-text-orange)",
  },
  {
    label: "Vàng",
    value: "var(--tt-color-text-yellow)",
  },
  {
    label: "Xanh lá",
    value: "var(--tt-color-text-green)",
  },
  {
    label: "Xanh dương",
    value: "var(--tt-color-text-blue)",
  },
  {
    label: "Tím",
    value: "var(--tt-color-text-purple)",
  },
  {
    label: "Hồng",
    value: "var(--tt-color-text-pink)",
  },
  {
    label: "Đỏ",
    value: "var(--tt-color-text-red)",
  },
] as const

export type TextColor = (typeof TEXT_COLORS)[number]

export interface UseColorTextConfig {
  editor?: Editor | null
  textColor?: string
  label?: string
  hideWhenUnavailable?: boolean
  onApplied?: (params: { color: string; label: string }) => void
}

export function pickTextColorsByValue(values: string[]) {
  return TEXT_COLORS.filter((color) =>
    values.includes(color.value)
  ) as TextColor[]
}

export function canColorText(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  if (
    !isMarkInSchema("textStyle", editor) ||
    isNodeTypeSelected(editor, ["image"])
  ) {
    return false
  }

  return editor.can().setColor("#000000")
}

export function isColorTextActive(
  editor: Editor | null,
  textColor?: string
): boolean {
  if (!editor) return false
  return textColor
    ? editor.isActive("textStyle", { color: textColor })
    : editor.isActive("textStyle") &&
        Boolean(editor.getAttributes("textStyle").color)
}

export function useColorText(config: UseColorTextConfig) {
  const {
    editor: providedEditor,
    textColor,
    label,
    hideWhenUnavailable = false,
    onApplied,
  } = config

  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState(true)

  const canColorTextState = canColorText(editor)
  const isActive = isColorTextActive(editor, textColor)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      setIsVisible(
        hideWhenUnavailable ? canColorText(editor) : true
      )
    }

    handleSelectionUpdate()
    editor.on("selectionUpdate", handleSelectionUpdate)
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  const handleColorText = useCallback(() => {
    if (!editor || !canColorTextState || !textColor) return false

    const chain = editor.chain().focus()
    const applied = isActive
      ? chain.unsetColor().run()
      : chain.setColor(textColor).run()

    if (applied) {
      onApplied?.({ color: textColor, label: label || textColor })
    }

    return applied
  }, [canColorTextState, editor, isActive, label, onApplied, textColor])

  const handleRemoveColor = useCallback(() => {
    if (!editor || !canColorTextState) return false
    return editor.chain().focus().unsetColor().run()
  }, [canColorTextState, editor])

  return {
    isVisible,
    isActive,
    canColorText: canColorTextState,
    handleColorText,
    handleRemoveColor,
    label: label || "Màu chữ",
    Icon: CaseSensitiveIcon,
  }
}
