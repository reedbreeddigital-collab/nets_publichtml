import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, CheckCircle2, File, Plus, Tag, MessageSquare, Folder, Users,
  Search, Trash2, Edit3, ExternalLink, Image as ImageIcon, Copy, UploadCloud, RefreshCw
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { blogService } from '../../../services/blogService'
import { cloudinaryService, CloudinaryResource } from '../../../services/cloudinaryService'
import { CloudinaryMediaModal } from '../../components/blog/CloudinaryMediaModal'
import { BlogPost, BlogCategory, BlogTag, BlogComment, NewsletterSubscriber } from '../../../types/blog'

const TABS = [
  { id: 'posts', name: 'Posts', icon: FileText },
  { id: 'categories', name: 'Categories', icon: Folder },
  { id: 'tags', name: 'Tags', icon: Tag },
  { id: 'media', name: 'Media (Cloudinary)', icon: ImageIcon },
  { id: 'comments', name: 'Comments', icon: MessageSquare },
  { id: 'subscribers', name: 'Subscribers', icon: Users },
]

export function AdminBlogCMSPage() {
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [tagsList, setTagsList] = useState<BlogTag[]>([])
  const [comments, setComments] = useState<BlogComment[]>([])
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [mediaList, setMediaList] = useState<CloudinaryResource[]>([])
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [fetchedPosts, fetchedCats, fetchedTags, fetchedComms, fetchedSubs, fetchedMedia] = await Promise.all([
        blogService.getPosts(),
        blogService.getCategories(),
        blogService.getTags(),
        blogService.getComments(),
        blogService.getSubscribers(),
        cloudinaryService.getImages(),
      ])
      setPosts(fetchedPosts)
      setCategories(fetchedCats)
      setTagsList(fetchedTags)
      setComments(fetchedComms)
      setSubscribers(fetchedSubs)
      setMediaList(fetchedMedia)
    } catch (err) {
      console.error('Error loading blog CMS data:', err)
      toast.error('Failed to load blog data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Cloudinary URL copied to clipboard!')
  }

  const handleDeleteMedia = async (publicId: string) => {
    if (!window.confirm('Delete this image from Cloudinary?')) return
    const toastId = toast.loading('Deleting image from Cloudinary...')
    const ok = await cloudinaryService.deleteImage(publicId)
    if (ok) {
      toast.success('Image deleted from Cloudinary', { id: toastId })
      setMediaList(mediaList.filter(m => m.public_id !== publicId))
    } else {
      toast.error('Failed to delete image', { id: toastId })
    }
  }

  const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length
  const draftsCount = posts.filter(p => p.status === 'DRAFT').length

  const filteredPosts = posts.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return p.title.toLowerCase().includes(q) || (p.excerpt && p.excerpt.toLowerCase().includes(q))
  })

  // Handlers
  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete post "${title}"?`)) return
    const ok = await blogService.deletePost(id)
    if (ok) {
      setPosts(posts.filter(p => p.id !== id))
      toast.success('Post deleted successfully')
    } else {
      toast.error('Failed to delete post')
    }
  }

  const handleCreateCategory = async () => {
    const name = window.prompt('Enter category name (e.g. Interstate Transit):')
    if (!name || !name.trim()) return
    const created = await blogService.createCategory(name.trim())
    if (created) {
      setCategories([...categories, created])
      toast.success('Category created!')
    } else {
      toast.error('Failed to create category')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category?')) return
    await blogService.deleteCategory(id)
    setCategories(categories.filter(c => c.id !== id))
    toast.success('Category removed')
  }

  const handleCreateTag = async () => {
    const name = window.prompt('Enter tag name (e.g. Safety, Charter):')
    if (!name || !name.trim()) return
    const created = await blogService.createTag(name.trim())
    if (created) {
      setTagsList([...tagsList, created])
      toast.success('Tag created!')
    } else {
      toast.error('Failed to create tag')
    }
  }

  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Delete this tag?')) return
    await blogService.deleteTag(id)
    setTagsList(tagsList.filter(t => t.id !== id))
    toast.success('Tag removed')
  }

  const handleUpdateCommentStatus = async (id: string, status: 'APPROVED' | 'PENDING' | 'SPAM') => {
    const ok = await blogService.updateCommentStatus(id, status)
    if (ok) {
      setComments(comments.map(c => c.id === id ? { ...c, status } : c))
      toast.success(`Comment marked as ${status}`)
    } else {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('Delete this comment permanently?')) return
    const ok = await blogService.deleteComment(id)
    if (ok) {
      setComments(comments.filter(c => c.id !== id))
      toast.success('Comment deleted')
    } else {
      toast.error('Failed to delete comment')
    }
  }

  const handleDeleteSubscriber = async (id: string) => {
    if (!window.confirm('Remove this subscriber?')) return
    const ok = await blogService.deleteSubscriber(id)
    if (ok) {
      setSubscribers(subscribers.filter(s => s.id !== id))
      toast.success('Subscriber removed')
    } else {
      toast.error('Failed to remove subscriber')
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      {/* Page Header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="admin-page-title">Blog CMS &amp; Content Management</div>
          <div className="admin-page-desc">Manage articles, editorial categories, reader comments, and newsletter subscriptions.</div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            to="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ExternalLink size={15} />
            View Public Blog
          </Link>
          <Link
            to="/admin/cms/blog/create"
            className="admin-btn admin-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} />
            Create Post
          </Link>
        </div>
      </div>

      {/* Tabs navigation & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', border: '1px solid #E2E8F0', overflowX: 'auto' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? 'var(--adm-accent, #C40000)' : '#64748B',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'categories' && (
          <button onClick={handleCreateCategory} className="admin-btn admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Add Category
          </button>
        )}
        {activeTab === 'tags' && (
          <button onClick={handleCreateTag} className="admin-btn admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Add Tag
          </button>
        )}
        {activeTab === 'media' && (
          <button onClick={() => setIsMediaModalOpen(true)} className="admin-btn admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={15} /> Upload to Cloudinary
          </button>
        )}
      </div>

      {/* TAB 1: POSTS */}
      {activeTab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Stat Cards */}
          <div className="admin-grid-3" style={{ gap: '1rem' }}>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Total Articles</div>
              <div className="admin-stat-value">{loading ? '...' : posts.length}</div>
              <div className="admin-stat-desc">Published and draft articles</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label" style={{ color: '#16A34A' }}>Published</div>
              <div className="admin-stat-value" style={{ color: '#16A34A' }}>{loading ? '...' : publishedCount}</div>
              <div className="admin-stat-desc">Live on /blog</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label" style={{ color: '#D97706' }}>Drafts</div>
              <div className="admin-stat-value" style={{ color: '#D97706' }}>{loading ? '...' : draftsCount}</div>
              <div className="admin-stat-desc">Work in progress</div>
            </div>
          </div>

          {/* Posts Table Card */}
          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--adm-text-1)' }}>All Blog Posts</div>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 12px 6px 32px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                        Loading blog posts...
                      </td>
                    </tr>
                  ) : filteredPosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
                        No blog posts found. Click "Create Post" to write your first article.
                      </td>
                    </tr>
                  ) : (
                    filteredPosts.map((post) => (
                      <tr key={post.id}>
                        <td style={{ minWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {post.cover_image && (
                              <img
                                src={post.cover_image}
                                alt={post.title}
                                style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--adm-text-1)', fontSize: '14px' }}>
                                {post.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {post.excerpt || 'No summary'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{post.author || 'NETS Team'}</td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                            {post.category || 'General'}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: post.status === 'PUBLISHED' ? '#DCFCE7' : '#FEF3C7',
                              color: post.status === 'PUBLISHED' ? '#15803D' : '#B45309',
                            }}
                          >
                            {post.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Link
                            to={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#64748B', marginRight: '12px', fontSize: '13px' }}
                            title="View on Live Site"
                          >
                            <ExternalLink size={15} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          </Link>
                          <Link
                            to={`/admin/cms/blog/create?edit=${post.id}`}
                            style={{ color: '#2563EB', marginRight: '12px', fontSize: '13px', fontWeight: 600 }}
                          >
                            <Edit3 size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> Edit
                          </Link>
                          <button
                            onClick={() => handleDeletePost(post.id, post.title)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#DC2626',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            <Trash2 size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--adm-border)', background: '#FAFAFA' }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Editorial Categories</div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>URL Slug</th>
                <th>Articles Count</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    No categories created yet. Click "Add Category" above.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                    <td style={{ color: '#64748B', fontSize: '13px' }}>{cat.slug}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--adm-accent, #C40000)' }}>
                        {posts.filter(p => p.category_id === cat.id || p.category === cat.name).length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: TAGS */}
      {activeTab === 'tags' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--adm-border)', background: '#FAFAFA' }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Article Tags</div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tag Name</th>
                <th>URL Slug</th>
                <th>Articles Count</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tagsList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    No tags created yet. Click "Add Tag" above.
                  </td>
                </tr>
              ) : (
                tagsList.map((tag) => (
                  <tr key={tag.id}>
                    <td style={{ fontWeight: 600 }}>{tag.name}</td>
                    <td style={{ color: '#64748B', fontSize: '13px' }}>{tag.slug}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--adm-accent, #C40000)' }}>
                        {posts.filter(p => p.tags && p.tags.includes(tag.name)).length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: COMMENTS */}
      {activeTab === 'comments' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--adm-border)', background: '#FAFAFA' }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Reader Comments Moderation</div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Comment Content</th>
                <th>Article</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    No comments found.
                  </td>
                </tr>
              ) : (
                comments.map((c) => {
                  const targetPost = posts.find(p => p.id === c.post_id)
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.user_name || 'Guest'}</div>
                        {c.user_email && <div style={{ fontSize: '11px', color: '#64748B' }}>{c.user_email}</div>}
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ fontSize: '13px', color: '#334155' }}>{c.content}</div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B' }}>
                        {targetPost ? targetPost.title : c.post_id}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: c.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7',
                            color: c.status === 'APPROVED' ? '#15803D' : '#B45309',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {c.status !== 'APPROVED' ? (
                          <button
                            onClick={() => handleUpdateCommentStatus(c.id, 'APPROVED')}
                            style={{ background: 'none', border: 'none', color: '#16A34A', cursor: 'pointer', marginRight: '10px', fontWeight: 600 }}
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateCommentStatus(c.id, 'PENDING')}
                            style={{ background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', marginRight: '10px', fontWeight: 600 }}
                          >
                            Hide
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: SUBSCRIBERS */}
      {activeTab === 'subscribers' && (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--adm-border)', background: '#FAFAFA' }}>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>Newsletter Subscribers</div>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
                    No subscribers found.
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.email}</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: s.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                          color: s.status === 'ACTIVE' ? '#15803D' : '#B91C1C',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteSubscriber(s.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: MEDIA (CLOUDINARY) */}
      {activeTab === 'media' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="admin-grid-3" style={{ gap: '1rem' }}>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Cloudinary Assets</div>
              <div className="admin-stat-value">{mediaList.length}</div>
              <div className="admin-stat-desc">Images stored on wnmabxiy</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label" style={{ color: '#2563EB' }}>CDN Delivery</div>
              <div className="admin-stat-value" style={{ color: '#2563EB', fontSize: '1.25rem' }}>Active</div>
              <div className="admin-stat-desc">Global edge CDN caching</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label" style={{ color: '#16A34A' }}>Cloud Name</div>
              <div className="admin-stat-value" style={{ color: '#16A34A', fontSize: '1.25rem' }}>wnmabxiy</div>
              <div className="admin-stat-desc">Folder: nets_blog</div>
            </div>
          </div>

          <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>All Cloudinary Media Assets</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={loadData}
                  className="admin-btn admin-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="admin-btn admin-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <UploadCloud size={14} /> Upload Image
                </button>
              </div>
            </div>

            {mediaList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
                <ImageIcon size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#334155' }}>No media uploaded to Cloudinary yet</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Click "Upload Image" to upload your first blog asset to Cloudinary.</div>
              </div>
            ) : (
              <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {mediaList.map((img) => (
                  <div
                    key={img.public_id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '140px', background: '#F1F5F9', overflow: 'hidden' }}>
                      <img
                        src={img.secure_url || img.url}
                        alt={img.public_id}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {img.format}
                      </span>
                    </div>

                    <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={img.public_id}>
                        {img.public_id.split('/').pop()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {img.width}x{img.height} px · {Math.round(img.bytes / 1024)} KB
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(img.secure_url)}
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11.5px' }}
                          title="Copy Cloudinary URL"
                        >
                          <Copy size={12} /> Copy URL
                        </button>
                        <a
                          href={img.secure_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          style={{ padding: '4px 8px', color: '#64748B' }}
                          title="View on CDN"
                        >
                          <ExternalLink size={12} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(img.public_id)}
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          style={{ padding: '4px 8px', color: '#DC2626' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <CloudinaryMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectImage={(url) => {
          loadData()
          toast.success('Image ready in Cloudinary!')
        }}
        title="Upload Image to Cloudinary"
      />
    </>
  )
}
