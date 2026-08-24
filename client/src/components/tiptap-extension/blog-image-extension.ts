import { Image } from '@tiptap/extension-image';

/**
 * TipTap Image với fileId / temp để track upload R2 temp → promote.
 */
export const BlogImage = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) => {
          if (!attributes.fileId) {
            return {};
          }
          return { 'data-file-id': attributes.fileId };
        },
      },
      temp: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-temp') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.temp) {
            return {};
          }
          return { 'data-temp': 'true' };
        },
      },
      mimeType: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-mime-type'),
        renderHTML: (attributes) => {
          if (!attributes.mimeType) {
            return {};
          }
          return { 'data-mime-type': attributes.mimeType };
        },
      },
      sizeBytes: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-size-bytes');
          return val ? Number(val) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.sizeBytes) {
            return {};
          }
          return { 'data-size-bytes': String(attributes.sizeBytes) };
        },
      },
      originalName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-original-name'),
        renderHTML: (attributes) => {
          if (!attributes.originalName) {
            return {};
          }
          return { 'data-original-name': attributes.originalName };
        },
      },
    };
  },
}).configure({
  allowBase64: true,
  HTMLAttributes: {
    class: 'blog-editor-image',
  },
});
