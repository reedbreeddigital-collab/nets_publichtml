import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Undo, Redo, Heading1, Heading2, Link as LinkIcon, Image as ImageIcon
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
}

const MenuBar = ({ editor }: { editor: any }) => {
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

  const addImage = () => {
    const url = window.prompt('Enter Image URL (e.g. Unsplash or Cloudinary):')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
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
    { icon: ImageIcon, action: addImage, isActive: false, label: 'Image' },
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
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
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

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
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
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Synchronize external content changes if editor doesn't match
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  }, [content, editor])

  return (
    <div style={{
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      background: '#FFFFFF',
      minHeight: '340px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <MenuBar editor={editor} />
      <div style={{ flex: 1, padding: '16px', outline: 'none' }}>
        <EditorContent
          editor={editor}
          style={{ minHeight: '280px', outline: 'none' }}
          className="prose-editor"
        />
      </div>
    </div>
  )
}
