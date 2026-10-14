import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Send, Image as ImageIcon, Loader2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { RichTextEditor } from '../../components/blog/RichTextEditor'
import { TagsInput } from '../../components/blog/TagsInput'
import { blogService } from '../../../services/blogService'
import { BlogCategory } from '../../../types/blog'
import { useAdminStore } from '../../store/useAdminStore'

export function AdminBlogCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const { session } = useAdminStore()

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [author, setAuthor] = useState(session.user?.fullName || 'NETS Editorial Team')
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [isLoadingPost, setIsLoadingPost] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const fetchedCats = await blogService.getCategories()
        setCategories(fetchedCats)

        if (editId) {
          setIsLoadingPost(true)
          const post = await blogService.getPostBySlug(editId)
          if (post) {
            setTitle(post.title || '')
            setExcerpt(post.excerpt || '')
            setCategory(post.category_id || '')
            setContent(post.content || '')
            setTags(post.tags || '')
            setCoverImage(post.cover_image || '')
            if (post.author) setAuthor(post.author)
          } else {
            toast.error('Post not found for editing')
          }
        }
      } catch (err) {
        console.error('Failed to initialize edit page:', err)
        toast.error('Could not load blog post')
      } finally {
        setIsLoadingPost(false)
      }
    }
    init()
  }, [editId])

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      toast.error('Article title is required')
      return
    }

    setIsSaving(true)
    try {
      const selectedCat = categories.find(c => c.id === category)
      const payload = {
        id: editId || undefined,
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        cover_image: coverImage.trim() || null,
        category_id: category || null,
        category: selectedCat ? selectedCat.name : '',
        tags: tags.trim(),
        author: author.trim() || 'NETS Editorial Desk',
        status,
      }

      if (editId) {
        const updated = await blogService.updatePost(payload)
        if (updated) {
          toast.success(`Post ${status === 'DRAFT' ? 'saved as draft' : 'updated & published'}!`)
          navigate('/admin/cms/blog')
        } else {
          toast.error('Failed to update post')
        }
      } else {
        const created = await blogService.createPost(payload)
        if (created) {
          toast.success(`Post ${status === 'DRAFT' ? 'saved as draft' : 'published'} successfully!`)
          navigate('/admin/cms/blog')
        } else {
          toast.error('Failed to create post')
        }
      }
    } catch (err) {
      console.error('Error saving post:', err)
      toast.error('An error occurred while saving')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImagePrompt = () => {
    const url = window.prompt('Enter Cover Image URL (e.g. Unsplash or Cloudinary image link):', coverImage)
    if (url !== null) {
      setCoverImage(url)
    }
  }

  if (isLoadingPost) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '0.75rem', color: 'var(--adm-text-2)' }}>
        <Loader2 className="animate-spin" size={24} />
        <span>Loading article details...</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Toaster position="top-right" />

      {/* Top Action Bar */}
      <div className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
        <Link
          to="/admin/cms/blog"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--adm-text-2)', textDecoration: 'none', fontWeight: 500, fontSize: '13px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Blog CMS</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            disabled={isSaving}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.6 : 1 }}
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave('PUBLISHED')}
            disabled={isSaving}
            className="admin-btn admin-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.6 : 1 }}
          >
            <Send size={15} />
            <span>{isSaving ? 'Processing...' : (editId ? 'Update & Publish' : 'Publish Article')}</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Main Content Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Article Title <span style={{ color: 'var(--adm-accent)' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Safe Interstate Travel: How Modern Fleets Redefine Highway Transit..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '16px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-surface)',
                  color: 'var(--adm-text-1)',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Article Content
              </label>
              <RichTextEditor content={content} onChange={setContent} />
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--adm-text-1)', borderBottom: '1px solid var(--adm-border)', paddingBottom: '0.75rem' }}>
              Publishing Settings
            </div>

            {/* Excerpt */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Article Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Brief summary displayed on blog cards and search snippets..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-surface)',
                  color: 'var(--adm-text-1)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-surface)',
                  color: 'var(--adm-text-1)',
                  outline: 'none',
                }}
              >
                <option value="">Select Category...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Tags
              </label>
              <TagsInput value={tags} onChange={setTags} />
            </div>

            {/* Author */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="NETS Editorial Desk"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--adm-border)',
                  background: 'var(--adm-surface)',
                  color: 'var(--adm-text-1)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Cover Image */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--adm-text-2)', marginBottom: '0.5rem' }}>
                Featured Cover Image
              </label>
              <div
                onClick={handleImagePrompt}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '140px',
                  borderRadius: '6px',
                  border: '2px dashed var(--adm-border)',
                  background: 'var(--adm-surface-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {coverImage ? (
                  <>
                    <img src={coverImage} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '4px' }}>
                      Change Image
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--adm-text-3)' }}>
                    <ImageIcon size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.6 }} />
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--adm-text-2)' }}>Set Cover Image URL</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>Click to enter URL</div>
                  </div>
                )}
              </div>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  style={{ background: 'none', border: 'none', color: 'var(--adm-accent)', fontSize: '11px', cursor: 'pointer', marginTop: '4px', padding: 0 }}
                >
                  Remove Cover Image
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
