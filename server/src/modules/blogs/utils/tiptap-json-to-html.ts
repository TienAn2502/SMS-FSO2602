import { parseHTML } from 'linkedom';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';

// Setup DOM environment for Node.js using linkedom
const { document, window } = parseHTML(`<!doctype html><html><body></body></html>`);

// Custom Image extension với đầy đủ attributes cho blog images
const BlogImageExtension = Node.create({
    name: 'image',
    group: 'block',
    draggable: true,
    selectable: true,
    atom: true,

    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            fileId: { default: null },
            temp: { default: false },
            mimeType: { default: null },
            sizeBytes: { default: null },
            originalName: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'img' }];
    },

    renderHTML({ node, HTMLAttributes }) {
        const attrs: Record<string, string> = {
            src: HTMLAttributes.src as string || '',
        };
        
        if (HTMLAttributes.alt) attrs['alt'] = HTMLAttributes.alt as string;
        if (HTMLAttributes.title) attrs['title'] = HTMLAttributes.title as string;
        if (node.attrs.fileId) attrs['data-file-id'] = String(node.attrs.fileId);
        if (node.attrs.temp) attrs['data-temp'] = 'true';
        if (node.attrs.mimeType) attrs['data-mime-type'] = String(node.attrs.mimeType);
        if (node.attrs.sizeBytes) attrs['data-size-bytes'] = String(node.attrs.sizeBytes);
        if (node.attrs.originalName) attrs['data-original-name'] = String(node.attrs.originalName);
        
        return ['img', mergeAttributes({ class: 'blog-image' }, attrs)];
    },
});

// TiPTap requires document.implementation.createHTMLDocument()
const mockBody = {
    style: {},
    setAttribute: () => {},
    removeAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getAttribute: () => null,
    hasAttribute: () => false,
    childNodes: [],
    nodeType: 1,
    nodeName: 'BODY',
    localName: 'body',
    tagName: 'BODY',
    textContent: '',
    innerHTML: '',
};

const mockDocumentElement = {
    style: {},
    setAttribute: () => {},
    removeAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getAttribute: () => null,
    hasAttribute: () => false,
    childNodes: [],
    nodeType: 1,
    nodeName: 'HTML',
    localName: 'html',
    tagName: 'HTML',
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    className: '',
    id: '',
    textContent: '',
    innerHTML: '',
    outerHTML: '<html></html>',
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    scrollIntoView: () => {},
    focus: () => {},
    blur: () => {},
};

(document as any).implementation = {
    createHTMLDocument: () => {
        const createElement = (tag: string) => {
            const attrs: Record<string, string> = {};
            const children: any[] = [];
            return {
                style: {},
                setAttribute: (name: string, value: string) => { attrs[name] = value; },
                removeAttribute: (name: string) => { delete attrs[name]; },
                getAttribute: (name: string) => attrs[name] || null,
                hasAttribute: (name: string) => name in attrs,
                appendChild: (child: any) => { children.push(child); },
                removeChild: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                childNodes: children,
                nodeType: 1,
                nodeName: tag.toUpperCase(),
                localName: tag,
                tagName: tag.toUpperCase(),
                textContent: '',
                get innerHTML() {
                    return children.map(c => c.outerHTML || c.textContent || '').join('');
                },
                get outerHTML() {
                    const attrStr = Object.entries(attrs)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(' ');
                    return attrStr ? `<${tag} ${attrStr}></${tag}>` : `<${tag}></${tag}>`;
                },
            };
        };
        
        return {
            body: mockBody,
            documentElement: mockDocumentElement,
            createElement,
            createElementNS: () => ({}),
            createTextNode: (text: string) => ({
                textContent: text,
                nodeType: 3,
                nodeName: '#text',
            }),
            createDocumentFragment: () => ({
                appendChild: () => {},
                querySelector: () => null,
                childNodes: [],
            }),
        };
    },
};

const extensions = [
    StarterKit.configure({
        codeBlock: false,
    }),
    BlogImageExtension,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    Highlight.configure({
        multicolor: true,
    }),
];

export function tiptapJsonToHtml(json: unknown): string {
    if (!json || typeof json !== 'object') {
        return '';
    }

    try {
        // Set global document for prosemirror
        const originalDocument = globalThis.document;
        const originalWindow = globalThis.window;
        globalThis.document = document;
        globalThis.window = window;

        const html = generateHTML(json, extensions) as string;

        // Restore original globals
        globalThis.document = originalDocument;
        globalThis.window = originalWindow;

        return html;
    } catch (error) {
        console.error('Error converting TiTip JSON to HTML:', error);
        return '';
    }
}

interface TiptapNode {
    type: string;
    content?: TiptapNode[];
    text?: string;
}

function extractTextFromNode(node: TiptapNode): string {
    if (node.type === 'text' && node.text) {
        return node.text;
    }
    if (node.content) {
        return node.content.map(extractTextFromNode).join(' ');
    }
    return '';
}

export function tiptapJsonToPlainText(
    json: unknown,
    maxLength = 200,
): string {
    if (!json || typeof json !== 'object') return '';

    const doc = json as { type: string; content?: TiptapNode[] };

    if (doc.type !== 'doc' || !Array.isArray(doc.content)) {
        return '';
    }

    const text = doc.content.map(extractTextFromNode).join(' ').trim();

    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '…';
}
