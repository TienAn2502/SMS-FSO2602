import {
    SimpleEditor,
    type SimpleEditorProps,
} from '@/components/tiptap-templates/simple/simple-editor';
import type { FilePurpose } from '@/features/files/api/files-api';

export type RichTextEditorProps = SimpleEditorProps & {
    /** Kept for API compatibility; TipTap simple template has no placeholder node. */
    placeholder?: string;
    initialValue?: string;
} & {
    purpose: FilePurpose;
};

/**
 * TipTap official simple-editor template.
 * Sanitize HTML on the server before persist / before public render.
 */
export function RichTextEditor({
    purpose,
    value,
    initialValue,
    onChange,
    disabled,
    className,
    id,
}: RichTextEditorProps) {
    return (
        <SimpleEditor
            value={value ?? initialValue}
            onChange={onChange}
            disabled={disabled}
            className={className}
            id={id}
            purpose={purpose}
        />
    );
}
