import { generateHTML, generateJSON } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';

/**
 * Extensions cơ bản cho converter - không cần tất cả extensions
 * để convert giữa HTML và JSON
 */
const SHARED_EXTENSIONS = [
    StarterKit.configure({
        codeBlock: false,
    }),
    Image.configure({
        HTMLAttributes: {
            class: 'blog-image',
        },
    }),
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    Highlight.configure({
        multicolor: true,
    }),
];

/**
 * Convert HTML string sang TiTip JSON format
 */
export function htmlToTiptapJson(html: string): { type: 'doc'; content?: unknown[] } {
    if (!html || html.trim() === '') {
        return { type: 'doc' };
    }

    try {
        return generateJSON(html, SHARED_EXTENSIONS) as { type: 'doc'; content?: unknown[] };
    } catch (error) {
        console.error('Error converting HTML to TiTip JSON:', error);
        return { type: 'doc' };
    }
}

/**
 * Convert TiTip JSON sang HTML string
 */
export function tiptapJsonToHtml(json: unknown): string {
    if (!json) return '';

    try {
        return generateHTML(json, SHARED_EXTENSIONS) as string;
    } catch (error) {
        console.error('Error converting TiTip JSON to HTML:', error);
        return '';
    }
}

/**
 * Check if content is TiTip JSON format
 */
export function isTiptapJson(content: unknown): content is { type: 'doc'; content?: unknown[] } {
    if (!content || typeof content !== 'object') return false;
    const obj = content as Record<string, unknown>;
    return obj.type === 'doc';
}

/**
 * Get plain text from TiTip JSON (for excerpts)
 */
export function tiptapJsonToPlainText(json: unknown, maxLength = 200): string {
    if (!json || typeof json !== 'object') return '';

    const obj = json as Record<string, unknown>;
    const content = obj.content as Array<Record<string, unknown>> | undefined;

    if (!Array.isArray(content)) return '';

    const extractText = (nodes: Array<Record<string, unknown>>): string => {
        return nodes
            .map((node) => {
                if (node.type === 'text' && typeof node.text === 'string') {
                    return node.text;
                }
                if (node.type === 'paragraph' || node.type === 'heading') {
                    const innerContent = node.content as Array<Record<string, unknown>> | undefined;
                    if (Array.isArray(innerContent)) {
                        return extractText(innerContent);
                    }
                }
                if (Array.isArray(node.content)) {
                    return extractText(node.content as Array<Record<string, unknown>>);
                }
                return '';
            })
            .join(' ')
            .trim();
    };

    let text = extractText(content);
    if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '…';
    }
    return text;
}
