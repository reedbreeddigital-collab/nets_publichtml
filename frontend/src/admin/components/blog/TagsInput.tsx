import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagsInputProps {
  value: string
  onChange: (value: string) => void
}

export function TagsInput({ value, onChange }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')

  const tags = value
    ? value.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handleBlur = () => {
    addTag()
  }

  const addTag = () => {
    const newTag = inputValue.trim().replace(/,/g, '')
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag].join(', '))
    }
    setInputValue('')
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove).join(', '))
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        alignItems: 'center',
        padding: '8px 12px',
        minHeight: '44px',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        background: '#FFFFFF',
      }}
    >
      {tags.map((tag, index) => (
        <span
          key={index}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(196, 0, 0, 0.08)',
            color: 'var(--adm-accent, #C40000)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--adm-accent, #C40000)',
            }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? 'Type tag and press Enter or comma...' : ''}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: '13px',
          flex: 1,
          minWidth: '160px',
          background: 'transparent',
        }}
      />
    </div>
  )
}
