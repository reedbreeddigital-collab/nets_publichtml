import React, { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Undo, Redo, Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon,
  FileText, FileCode, Columns, Eye, Edit3, Table, Minus, HelpCircle, Check, X
} from 'lucide-react'

import { CloudinaryMediaModal } from './CloudinaryMediaModal'
import {
  htmlToMarkdown,
  markdownToHtml,
  isHtmlContent,
  normalizeContentForMode
} from './markdownUtils'

export type EditorMode = 'wysiwyg' | 'markdown'
export type MarkdownViewMode = 'write' | 'split' | 'preview'

const STORAGE_MODE_KEY = 'nets_blog_editor_mode'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

// WYSIWYG TipTap MenuBar
const WysiwygMenuBar = ({ editor, onOpenMediaModal }: { editor: any; onOpenMediaModal: () => void }) => {
  if (!editor) return null

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href || ''
    const url = window.prompt('Enter Web URL:', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const buttons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold'), label: 'Bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic'), label: 'Italic' },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike'), label: 'Strike' },
    { icon: Code, action: () => editor.chain().focus().toggleCode().run(), isActive: editor.isActive('code'), label: 'Code' },
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }), label: 'H1' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }), label: 'H2' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList'), label: 'Bullet List' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList'), label: 'Numbered List' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), isActive: editor.isActive('blockquote'), label: 'Quote' },
    { icon: LinkIcon, action: toggleLink, isActive: editor.isActive('link'), label: 'Link' },
    { icon: ImageIcon, action: onOpenMediaModal, isActive: false, label: 'Upload or Select Image (Cloudinary)' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), isActive: false, label: 'Undo' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), isActive: false, label: 'Redo' },
  ]

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      padding: '8px 12px',
      borderBottom: '1px solid #E2E8F0',
      background: '#F8FAFC',
    }}>
      {buttons.map((btn, idx) => {
        const Icon = btn.icon
        return (
          <button
            key={idx}
            type="button"
            title={btn.label}
            onClick={(e) => {
              e.preventDefault()
              btn.action()
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: btn.isActive ? '#E2E8F0' : 'transparent',
              color: btn.isActive ? 'var(--adm-accent, #C40000)' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!btn.isActive) e.currentTarget.style.background = '#EDE9FE'
            }}
            onMouseLeave={(e) => {
              if (!btn.isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon size={16} />
          </button>
        )
      })}
    </div>
  )
}

// Markdown Toolbar
interface MarkdownToolbarProps {
  onApplyFormat: (prefix: string, suffix?: string, defaultText?: string) => void
  onApplyLinePrefix: (prefix: string) => void
  onOpenLinkModal: () => void
  onOpenMediaModal: () => void
  onInsertTable: () => void
  onInsertHr: () => void
  onOpenCheatsheet: () => void
}

const MarkdownToolbar = ({
  onApplyFormat,
  onApplyLinePrefix,
  onOpenLinkModal,
  onOpenMediaModal,
  onInsertTable,
  onInsertHr,
  onOpenCheatsheet,
}: MarkdownToolbarProps) => {
  const tools = [
    { label: 'Bold (**text**)', icon: Bold, action: () => onApplyFormat('**', '**', 'bold text') },
    { label: 'Italic (*text*)', icon: Italic, action: () => onApplyFormat('*', '*', 'italic text') },
    { label: 'Strike (~~text~~)', icon: Strikethrough, action: () => onApplyFormat('~~', '~~', 'strikethrough text') },
    { label: 'Inline Code (`code`)', icon: Code, action: () => onApplyFormat('`', '`', 'code') },
    { label: 'Heading 1 (#)', icon: Heading1, action: () => onApplyLinePrefix('# ') },
    { label: 'Heading 2 (##)', icon: Heading2, action: () => onApplyLinePrefix('## ') },
    { label: 'Heading 3 (###)', icon: Heading3, action: () => onApplyLinePrefix('### ') },
    { label: 'Bullet List (- )', icon: List, action: () => onApplyLinePrefix('- ') },
    { label: 'Numbered List (1. )', icon: ListOrdered, action: () => onApplyLinePrefix('1. ') },
    { label: 'Blockquote (> )', icon: Quote, action: () => onApplyLinePrefix('> ') },
    { label: 'Insert Link [text](url)', icon: LinkIcon, action: onOpenLinkModal },
    { label: 'Insert Image (Cloudinary)', icon: ImageIcon, action: onOpenMediaModal },
    { label: 'Horizontal Rule (---)', icon: Minus, action: onInsertHr },
    { label: 'Insert Table', icon: Table, action: onInsertTable },
  ]

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '4px',
      padding: '8px 12px',
      borderBottom: '1px solid #E2E8F0',
      background: '#F8FAFC',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        {tools.map((tool, idx) => {
          const Icon = tool.icon
          return (
            <button
              key={idx}
              type="button"
              title={tool.label}
              onClick={(e) => {
                e.preventDefault()
                tool.action()
              }}
              style={{
                padding: '6px 9px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EDE9FE'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon size={16} />
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onOpenCheatsheet}
        title="Markdown Cheatsheet & Guide"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748B',
          background: '#F1F5F9',
          border: '1px solid #E2E8F0',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        <HelpCircle size={13} />
        <span>Guide</span>
      </button>
    </div>
  )
}

// Markdown Cheatsheet Modal
const MarkdownCheatsheetModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null

  const items = [
    { syntax: '# Heading 1', desc: 'Large page heading' },
    { syntax: '## Heading 2', desc: 'Section heading' },
    { syntax: '### Heading 3', desc: 'Subsection heading' },
    { syntax: '**Bold Text**', desc: 'Strong emphasis' },
    { syntax: '*Italic Text*', desc: 'Emphasis / italics' },
    { syntax: '~~Strikethrough~~', desc: 'Crossed-out text' },
    { syntax: '[Link Text](https://...)', desc: 'Hyperlink to page' },
    { syntax: '![Alt Text](image.jpg)', desc: 'Embedded image' },
    { syntax: '- List item', desc: 'Bullet point list' },
    { syntax: '1. First item', desc: 'Ordered numbered list' },
    { syntax: '> Blockquote', desc: 'Callout or highlighted quote' },
    { syntax: '`code`', desc: 'Inline code snippet' },
    { syntax: '```ts\ncode block\n```', desc: 'Fenced multiline code block' },
    { syntax: '---', desc: 'Horizontal divider line' },
    { syntax: '| Col 1 | Col 2 |\n|---|---|\n| A | B |', desc: 'Markdown tabular grid' },
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        maxWidth: '620px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Markdown Quick Reference
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
              Standard GitHub-Flavored Markdown syntax is fully supported.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            fontSize: '12px',
          }}>
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <code style={{
                  fontFamily: 'ui-monospace, monospace',
                  color: 'var(--adm-accent, #C40000)',
                  fontWeight: 600,
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                }}>
                  {it.syntax}
                </code>
                <span style={{ color: '#475569', fontSize: '11px' }}>{it.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#F8FAFC',
        }}>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn admin-btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '13px' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  // 1. Persistent Mode State ('wysiwyg' vs 'markdown')
  const [mode, setMode] = useState<EditorMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MODE_KEY)
      if (stored === 'markdown' || stored === 'wysiwyg') {
        return stored
      }
    } catch (e) {
      console.warn('Could not read editor mode from localStorage:', e)
    }
    return 'wysiwyg'
  })

  // 2. Markdown View Mode ('write' | 'split' | 'preview')
  const [markdownView, setMarkdownView] = useState<MarkdownViewMode>('write')

  // 3. Local Markdown Content State
  const [markdownContent, setMarkdownContent] = useState<string>(() => {
    return normalizeContentForMode(content || '', 'markdown')
  })

  // Modals
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isInternalUpdateRef = useRef(false)
  const lastExternalContentRef = useRef<string>(content)

  // TipTap WYSIWYG Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline font-medium',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4 shadow-sm',
        },
      }),
    ],
    content: normalizeContentForMode(content || '', 'wysiwyg'),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      isInternalUpdateRef.current = true
      lastExternalContentRef.current = html
      onChange(html)
    },
  })

  // Synchronize when external content changes (e.g. post fetched from backend)
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false
      return
    }

    if (content !== lastExternalContentRef.current) {
      lastExternalContentRef.current = content
      if (mode === 'markdown') {
        const md = isHtmlContent(content) ? htmlToMarkdown(content) : content
        setMarkdownContent(md)
      } else {
        const html = isHtmlContent(content) ? content : markdownToHtml(content)
        if (editor && editor.getHTML() !== html) {
          editor.commands.setContent(html, { emitUpdate: false })
        }
      }
    }
  }, [content, mode, editor])

  // Toggle Mode Handler (Switching between WYSIWYG and Markdown persistently)
  const handleModeSwitch = (newMode: EditorMode) => {
    if (newMode === mode) return

    if (newMode === 'markdown') {
      // Switch from WYSIWYG to Markdown
      const currentHtml = editor ? editor.getHTML() : (content || '')
      const md = htmlToMarkdown(currentHtml)
      setMarkdownContent(md)
      isInternalUpdateRef.current = true
      lastExternalContentRef.current = md
      onChange(md)
    } else {
      // Switch from Markdown to WYSIWYG
      const html = markdownToHtml(markdownContent)
      if (editor) {
        editor.commands.setContent(html, { emitUpdate: false })
      }
      isInternalUpdateRef.current = true
      lastExternalContentRef.current = html
      onChange(html)
    }

    setMode(newMode)
    try {
      localStorage.setItem(STORAGE_MODE_KEY, newMode)
    } catch (e) {
      console.warn('Could not persist editor mode:', e)
    }
  }

  // Markdown change handler
  const handleMarkdownChange = (newVal: string) => {
    setMarkdownContent(newVal)
    isInternalUpdateRef.current = true
    lastExternalContentRef.current = newVal
    onChange(newVal)
  }

  // Markdown format actions
  const applyMarkdownFormat = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = markdownContent
    const selected = text.substring(start, end) || defaultText

    const replacement = `${prefix}${selected}${suffix}`
    const nextText = text.substring(0, start) + replacement + text.substring(end)

    handleMarkdownChange(nextText)

    setTimeout(() => {
      textarea.focus()
      const newStart = start + prefix.length
      const newEnd = newStart + selected.length
      textarea.setSelectionRange(newStart, newEnd)
    }, 0)
  }

  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = markdownContent

    // Find the start of the current line
    const lastNewline = text.lastIndexOf('\n', start - 1)
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1

    const nextText = text.substring(0, lineStart) + prefix + text.substring(lineStart)
    handleMarkdownChange(nextText)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 0)
  }

  const handleOpenLinkModal = () => {
    const textarea = textareaRef.current
    const selected = textarea ? markdownContent.substring(textarea.selectionStart, textarea.selectionEnd) : ''
    const url = window.prompt('Enter Web URL for Link:', 'https://')
    if (!url) return
    applyMarkdownFormat('[', `](${url})`, selected || 'Link Text')
  }

  const handleInsertTable = () => {
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Data 1 | Data 2 | Data 3 |\n| Data 4 | Data 5 | Data 6 |\n\n`
    applyMarkdownFormat('', tableTemplate, '')
  }

  const handleInsertHr = () => {
    applyMarkdownFormat('\n\n---\n\n', '', '')
  }

  // Tab key & shortcut keydown handler for Markdown textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Tab key inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = markdownContent
      const updated = text.substring(0, start) + '  ' + text.substring(end)
      handleMarkdownChange(updated)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
      return
    }

    // Ctrl/Cmd + B -> Bold
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      applyMarkdownFormat('**', '**', 'bold text')
      return
    }

    // Ctrl/Cmd + I -> Italic
    if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault()
      applyMarkdownFormat('*', '*', 'italic text')
      return
    }

    // Ctrl/Cmd + K -> Link
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault()
      handleOpenLinkModal()
      return
    }
  }

  // Handle image selected from CloudinaryMediaModal
  const handleSelectImage = (url: string) => {
    if (!url) return

    if (mode === 'markdown') {
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = markdownContent
        const imageMarkdown = `\n\n![Article Image](${url})\n\n`
        const nextText = text.substring(0, start) + imageMarkdown + text.substring(end)
        handleMarkdownChange(nextText)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length)
        }, 0)
      } else {
        handleMarkdownChange(markdownContent + `\n\n![Article Image](${url})\n\n`)
      }
    } else {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    }
  }

  // Word and character count calculation
  const currentText = mode === 'markdown' ? markdownContent : (editor ? editor.getText() : '')
  const charCount = currentText.length
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0

  return (
    <>
      <div style={{
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        background: '#FFFFFF',
        minHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        {/* Top Header: Mode Switcher & View Toggles */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {/* Left: Mode Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#E2E8F0',
            padding: '3px',
            borderRadius: '6px',
            gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => handleModeSwitch('wysiwyg')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: mode === 'wysiwyg' ? 700 : 500,
                background: mode === 'wysiwyg' ? '#FFFFFF' : 'transparent',
                color: mode === 'wysiwyg' ? 'var(--adm-accent, #C40000)' : '#64748B',
                border: 'none',
                boxShadow: mode === 'wysiwyg' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Visual WYSIWYG editor mode"
            >
              <FileText size={14} />
              <span>WYSIWYG</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('markdown')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: mode === 'markdown' ? 700 : 500,
                background: mode === 'markdown' ? '#FFFFFF' : 'transparent',
                color: mode === 'markdown' ? 'var(--adm-accent, #C40000)' : '#64748B',
                border: 'none',
                boxShadow: mode === 'markdown' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Markdown code & raw text mode"
            >
              <FileCode size={14} />
              <span>Markdown</span>
            </button>
          </div>

          {/* Right: Markdown View sub-toggles & Persistence Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'markdown' && (
              <div style={{
                display: 'inline-flex',
                background: '#E2E8F0',
                padding: '2px',
                borderRadius: '6px',
                gap: '2px',
              }}>
                <button
                  type="button"
                  onClick={() => setMarkdownView('write')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: markdownView === 'write' ? 600 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: markdownView === 'write' ? '#FFFFFF' : 'transparent',
                    color: markdownView === 'write' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                  }}
                  title="Editor view"
                >
                  <Edit3 size={12} />
                  <span>Write</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMarkdownView('split')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: markdownView === 'split' ? 600 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: markdownView === 'split' ? '#FFFFFF' : 'transparent',
                    color: markdownView === 'split' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                  }}
                  title="Split view (Live Preview)"
                >
                  <Columns size={12} />
                  <span>Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMarkdownView('preview')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: markdownView === 'preview' ? 600 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    background: markdownView === 'preview' ? '#FFFFFF' : 'transparent',
                    color: markdownView === 'preview' ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                  }}
                  title="Full preview view"
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>
              </div>
            )}

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#059669',
              background: '#ECFDF5',
              padding: '3px 8px',
              borderRadius: '9999px',
              fontWeight: 500,
              border: '1px solid #A7F3D0',
            }}
            title="Your editor mode selection is saved in local storage and stays persistent across sessions."
            >
              <Check size={11} />
              <span>Persisted</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        {mode === 'wysiwyg' ? (
          <WysiwygMenuBar
            editor={editor}
            onOpenMediaModal={() => setIsMediaModalOpen(true)}
          />
        ) : (
          <MarkdownToolbar
            onApplyFormat={applyMarkdownFormat}
            onApplyLinePrefix={applyLinePrefix}
            onOpenLinkModal={handleOpenLinkModal}
            onOpenMediaModal={() => setIsMediaModalOpen(true)}
            onInsertTable={handleInsertTable}
            onInsertHr={handleInsertHr}
            onOpenCheatsheet={() => setIsCheatsheetOpen(true)}
          />
        )}

        {/* Editor Body Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {mode === 'wysiwyg' ? (
            <div style={{ flex: 1, padding: '16px', outline: 'none' }}>
              <EditorContent
                editor={editor}
                style={{ minHeight: '300px', outline: 'none' }}
                className="prose-editor"
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', minHeight: '320px' }}>
              {/* Write or Split view: textarea */}
              {(markdownView === 'write' || markdownView === 'split') && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  borderRight: markdownView === 'split' ? '1px solid #E2E8F0' : 'none',
                }}>
                  <textarea
                    ref={textareaRef}
                    value={markdownContent}
                    onChange={(e) => handleMarkdownChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write article content in Markdown format (e.g. # Heading, **bold**, - lists, > blockquotes)..."
                    style={{
                      width: '100%',
                      minHeight: '320px',
                      padding: '16px',
                      fontSize: '14px',
                      lineHeight: '1.65',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      border: 'none',
                      outline: 'none',
                      resize: 'vertical',
                      background: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  />
                </div>
              )}

              {/* Split or Preview view: live HTML preview */}
              {(markdownView === 'split' || markdownView === 'preview') && (
                <div style={{
                  flex: 1,
                  padding: '20px 24px',
                  background: '#FDFEFE',
                  overflowY: 'auto',
                  maxHeight: '600px',
                }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Eye size={12} />
                    <span>Live Rendered Preview</span>
                  </div>
                  <div
                    className="prose blog-content max-w-none"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(markdownContent) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 14px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          fontSize: '11px',
          color: '#64748B',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              <strong>{wordCount}</strong> {wordCount === 1 ? 'word' : 'words'}
            </span>
            <span>•</span>
            <span>
              <strong>{charCount}</strong> characters
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Active mode: <strong>{mode === 'wysiwyg' ? 'WYSIWYG' : 'Markdown'}</strong></span>
            <span>•</span>
            <span style={{ color: '#059669' }}>Persistently saved on switch</span>
          </div>
        </div>
      </div>

      {/* Cloudinary Media Modal */}
      <CloudinaryMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={handleSelectImage}
        title="Insert Image into Article (Cloudinary)"
      />

      {/* Markdown Cheatsheet Modal */}
      <MarkdownCheatsheetModal
        isOpen={isCheatsheetOpen}
        onClose={() => setIsCheatsheetOpen(false)}
      />
    </>
  )
}
