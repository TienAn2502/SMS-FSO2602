'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { FindAndReplace } from '@tiptap/extension-find-and-replace';
import { Selection } from '@tiptap/extensions';

// --- Custom Extensions ---
import { BlogImage } from '@/components/tiptap-extension/blog-image-extension';

// --- UI Primitives ---
import { Button } from '@/components/tiptap-ui-primitive/button';
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar';

// --- Tiptap Node ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension';
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss';
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/heading-node/heading-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button';
import {
    ColorHighlightPopover,
    ColorHighlightPopoverContent,
    ColorHighlightPopoverButton,
} from '@/components/tiptap-ui/color-highlight-popover';
import { ColorTextPopover } from '@/components/tiptap-ui/color-text-popover';
import {
    LinkPopover,
    LinkContent,
    LinkButton,
} from '@/components/tiptap-ui/link-popover';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';
import {
    SearchAndReplace,
    SearchAndReplaceButton,
} from '@/components/tiptap-ui/search-and-replace';

// --- Icons ---
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon';
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon';
import { LinkIcon } from '@/components/tiptap-icons/link-icon';

// --- Hooks ---
import { useIsBreakpoint } from '@/hooks/use-is-breakpoint';
import { useWindowSize } from '@/hooks/use-window-size';
import { useCursorVisibility } from '@/hooks/use-cursor-visibility';

// --- Lib ---
import { MAX_FILE_SIZE } from '@/lib/tiptap-utils';
import { handleTempImageUpload } from '@/features/blogs/lib/blog-image-upload';

// --- Styles ---
import '@/components/tiptap-templates/simple/simple-editor.scss';
import type { FilePurpose } from '@/features/files/api/files-api';

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
    block: 'center',
};

const MainToolbarContent = ({
    onHighlighterClick,
    onLinkClick,
    onSearchAndReplaceClick,
    isSearchAndReplaceOpen,
    searchAndReplaceButtonRef,
    isMobile,
}: {
    onHighlighterClick: () => void;
    onLinkClick: () => void;
    onSearchAndReplaceClick: () => void;
    isSearchAndReplaceOpen: boolean;
    searchAndReplaceButtonRef: React.RefObject<HTMLButtonElement | null>;
    isMobile: boolean;
}) => {
    return (
        <>
            <ToolbarGroup>
                <UndoRedoButton action='undo' />
                <UndoRedoButton action='redo' />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
                <ListDropdownMenu
                    modal={false}
                    types={['bulletList', 'orderedList', 'taskList']}
                />
                <BlockquoteButton />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type='bold' />
                <MarkButton type='italic' />
                <MarkButton type='strike' />
                <MarkButton type='underline' />
                <ColorTextPopover />
                {!isMobile ? (
                    <ColorHighlightPopover />
                ) : (
                    <ColorHighlightPopoverButton onClick={onHighlighterClick} />
                )}
                {!isMobile ? (
                    <LinkPopover />
                ) : (
                    <LinkButton onClick={onLinkClick} />
                )}
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type='superscript' />
                <MarkButton type='subscript' />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <TextAlignButton align='left' />
                <TextAlignButton align='center' />
                <TextAlignButton align='right' />
                <TextAlignButton align='justify' />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <ImageUploadButton text='Add' />
                <SearchAndReplaceButton
                    ref={searchAndReplaceButtonRef}
                    aria-expanded={isSearchAndReplaceOpen}
                    data-active-state={isSearchAndReplaceOpen ? 'on' : 'off'}
                    onClick={onSearchAndReplaceClick}
                />
            </ToolbarGroup>
        </>
    );
};

const MobileToolbarContent = ({
    type,
    onBack,
}: {
    type: 'highlighter' | 'link';
    onBack: () => void;
}) => (
    <>
        <ToolbarGroup>
            <Button variant='ghost' onClick={onBack}>
                <ArrowLeftIcon className='tiptap-button-icon' />
                {type === 'highlighter' ? (
                    <HighlighterIcon className='tiptap-button-icon' />
                ) : (
                    <LinkIcon className='tiptap-button-icon' />
                )}
            </Button>
        </ToolbarGroup>

        <ToolbarSeparator />

        {type === 'highlighter' ? (
            <ColorHighlightPopoverContent />
        ) : (
            <LinkContent />
        )}
    </>
);

export type SimpleEditorProps = {
    value?: string;
    onChange?: (html: string) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    purpose: FilePurpose;
};

export function SimpleEditor({
    value,
    onChange,
    disabled = false,
    className,
    id,
    purpose,
}: SimpleEditorProps) {
    const isMobile = useIsBreakpoint();
    const { height } = useWindowSize();
    const [mobileView, setMobileView] = useState<
        'main' | 'highlighter' | 'link'
    >('main');
    const [isSearchAndReplaceOpen, setIsSearchAndReplaceOpen] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        editable: !disabled,
        editorProps: {
            attributes: {
                ...(id ? { id } : {}),
                autocomplete: 'off',
                autocorrect: 'off',
                autocapitalize: 'off',
                'aria-label': 'Main content area, start typing to enter text.',
                class: 'simple-editor',
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
                code: false,
                codeBlock: false,
                link: {
                    openOnClick: false,
                    enableClickSelection: true,
                },
            }),
            HorizontalRule,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            BlogImage,
            Typography,
            Superscript,
            Subscript,
            Selection,
            FindAndReplace.configure({
                searchDebounceMs: 500,
                injectCSS: false,
            }),
            ImageUploadNode.configure({
                accept: 'image/*',
                maxSize: MAX_FILE_SIZE,
                // limit: 3,
                upload: (file, onProgress, abortSignal) =>
                    handleTempImageUpload(
                        purpose,
                        file,
                        onProgress,
                        abortSignal,
                    ),
                onError: (error) => console.error('Upload failed:', error),
            }),
        ],
        content: value ?? '',
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
    });

    const rect = useCursorVisibility({
        editor,
        overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
    });

    useEffect(() => {
        if (!editor) {
            return;
        }
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
        if (!editor || value === undefined) {
            return;
        }
        const current = editor.getHTML();
        if (value !== current) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
    }, [editor, value]);

    useEffect(() => {
        if (!isMobile && mobileView !== 'main') {
            setMobileView('main');
        }
    }, [isMobile, mobileView]);

    const openSearchAndReplace = useCallback(() => {
        setMobileView('main');
        setIsSearchAndReplaceOpen(true);
    }, []);

    const closeSearchAndReplace = useCallback(() => {
        setIsSearchAndReplaceOpen(false);
        searchAndReplaceButtonRef.current?.focus();
    }, []);

    const toggleSearchAndReplace = useCallback(() => {
        if (isSearchAndReplaceOpen) {
            closeSearchAndReplace();
            return;
        }

        openSearchAndReplace();
    }, [closeSearchAndReplace, isSearchAndReplaceOpen, openSearchAndReplace]);

    return (
        <div
            className={
                className
                    ? `simple-editor-wrapper ${className}`
                    : 'simple-editor-wrapper'
            }
        >
            <EditorContext.Provider value={{ editor }}>
                <Toolbar
                    ref={toolbarRef}
                    style={{
                        ...(isMobile
                            ? {
                                  bottom: `calc(100% - ${height - rect.y}px)`,
                              }
                            : {}),
                    }}
                >
                    {mobileView === 'main' ? (
                        <MainToolbarContent
                            onHighlighterClick={() =>
                                setMobileView('highlighter')
                            }
                            onLinkClick={() => setMobileView('link')}
                            onSearchAndReplaceClick={toggleSearchAndReplace}
                            isSearchAndReplaceOpen={isSearchAndReplaceOpen}
                            searchAndReplaceButtonRef={
                                searchAndReplaceButtonRef
                            }
                            isMobile={isMobile}
                        />
                    ) : (
                        <MobileToolbarContent
                            type={
                                mobileView === 'highlighter'
                                    ? 'highlighter'
                                    : 'link'
                            }
                            onBack={() => setMobileView('main')}
                        />
                    )}
                </Toolbar>

                <SearchAndReplace
                    className='simple-editor-search-and-replace'
                    open={isSearchAndReplaceOpen}
                    onOpen={openSearchAndReplace}
                    onClose={closeSearchAndReplace}
                    scrollIntoViewOptions={SEARCH_AND_REPLACE_SCROLL_OPTIONS}
                />

                <EditorContent
                    editor={editor}
                    role='presentation'
                    className='simple-editor-content'
                />
            </EditorContext.Provider>
        </div>
    );
}
