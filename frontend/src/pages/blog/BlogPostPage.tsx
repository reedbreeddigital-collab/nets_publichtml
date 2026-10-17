import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, User, Clock, Share2, Mail,
  MessageSquare, Check, Send, Sparkles, BookOpen
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { blogService } from '../../services/blogService'
import { BlogPost, BlogComment } from '../../types/blog'
import { marked } from 'marked'

const TwitterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.77 0-1.805.2-2.185.74-.325.46-.388 1.136-.388 2.096v1.144h4.341l-.488 3.667h-3.853v7.98c-1.026.175-2.078.271-3.143.271s-2.117-.096-3.143-.271z"/>
  </svg>
)

const LinkedinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
)

/**
 * Normalizes blog post content so both HTML and Markdown (as well as plain text)
 * render with proper paragraph spacing, line breaks, headings, images, and editorial typography.
 */
function formatBlogContent(raw?: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  try {
    return marked.parse(trimmed, { async: false, gfm: true, breaks: true }) as string
  } catch (err) {
    console.warn('Error formatting blog content with marked:', err)
    return trimmed
  }
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  // Comments form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // Newsletter subscribe
  const [subEmail, setSubEmail] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    async function loadPost() {
      if (!slug) return
      setLoading(true)
      try {
        const found = await blogService.getPostBySlug(slug)
        setPost(found)

        const all = await blogService.getPosts()
        const others = all.filter(p => p.status === 'PUBLISHED' && p.slug !== slug && p.id !== slug).slice(0, 3)
        setRelatedPosts(others)
      } catch (err) {
        console.error('Failed to load blog post:', err)
      } finally {
        setLoading(false)
      }
    }
    loadPost()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [slug])

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'email' | 'copy') => {
    const url = window.location.href
    const title = post?.title || 'NETS Mobility Insights'

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Read this article on NETS: ${url}`)}`
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      toast.success('Article link copied to clipboard!')
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleReplyClick = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, name: userName })
    setCommentText(`@${userName} `)
    if (commentInputRef.current) {
      commentInputRef.current.focus()
      commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !commentText.trim()) {
      toast.error('First name and comment text are required')
      return
    }

    if (!post) return

    setIsSubmittingComment(true)
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const newComment = await blogService.createComment({
        post_id: post.id,
        name: fullName,
        email: email.trim() || undefined,
        content: commentText.trim(),
        parent_id: replyingTo ? replyingTo.id : null,
      })

      if (newComment) {
        toast.success('Your comment has been submitted!')
        setPost({
          ...post,
          comments: [...(post.comments || []), newComment],
        })
        setFirstName('')
        setLastName('')
        setEmail('')
        setCommentText('')
        setReplyingTo(null)
      } else {
        toast.error('Failed to submit comment')
      }
    } catch {
      toast.error('An error occurred while posting your comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subEmail || !subEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    setIsSubscribing(true)
    try {
      await blogService.subscribe(subEmail.trim())
      toast.success('Thank you for subscribing to NETS Mobility Insights!')
      setSubEmail('')
    } catch {
      toast.error('Failed to subscribe')
    } finally {
      setIsSubscribing(false)
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FC' }}>
        <div style={{ textAlign: 'center', color: '#6B7280' }}>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading article...</div>
        </div>
      </main>
    )
  }

  if (!post) {
    return (
      <main style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FC', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', background: '#fff', padding: '3rem 2rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem auto', color: '#9CA3AF' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>Article Not Found</h1>
          <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '1.5rem' }}>
            The article you are looking for does not exist or may have been moved.
          </p>
          <Link to="/blog" className="btn btn-primary" style={{ padding: '0.625rem 1.5rem', fontSize: '14px' }}>
            Back to Blog
          </Link>
        </div>
      </main>
    )
  }

  const cover = post.cover_image || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80'
  const displayDate = post.published_at || post.created_at
    ? new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recent'

  const topLevelComments = (post.comments || []).filter(c => !c.parent_id)

  return (
    <main style={{ minHeight: '100vh', background: '#F8F9FC', paddingBottom: '6rem' }}>
      <Toaster position="top-right" />

      {/* Hero Cover Image */}
      <div style={{ position: 'relative', width: '100%', height: '52vh', minHeight: '360px', maxHeight: '520px', background: '#0A3041' }}>
        <img
          src={cover}
          alt={post.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(6, 29, 40, 0.4) 0%, rgba(6, 29, 40, 0.75) 100%)',
        }} />

        {/* Back Link Floating */}
        <div className="container-nets" style={{ position: 'absolute', top: '100px', left: 0, right: 0, zIndex: 10 }}>
          <Link
            to="/blog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1.25rem',
              borderRadius: '9999px',
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)'}
          >
            <ArrowLeft size={16} />
            <span>Back to Insights</span>
          </Link>
        </div>
      </div>

      {/* Main Content Overlapping Container */}
      <div className="container-nets" style={{ position: 'relative', zIndex: 20, marginTop: '-120px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Card 1: Article Header Banner */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            padding: '2.5rem 2rem',
          }}>
            {post.category && (
              <div style={{
                display: 'inline-block',
                background: 'rgba(196, 0, 0, 0.08)',
                color: 'var(--color-nets-red, #C40000)',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '4px 12px',
                borderRadius: '4px',
                marginBottom: '1rem',
              }}>
                {post.category}
              </div>
            )}

            <h1 style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#0A3041',
              letterSpacing: '-0.02em',
              marginBottom: '1.5rem',
            }}>
              {post.title}
            </h1>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              borderTop: '1px solid #F3F4F6',
              paddingTop: '1.25rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--color-nets-navy, #0A3041)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '16px',
                }}>
                  {post.author ? post.author.charAt(0).toUpperCase() : 'N'}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                    {post.author || 'NETS Editorial Team'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {displayDate}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      5 min read
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleShare('twitter')}
                  title="Share on Twitter"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4B5563' }}
                >
                  <TwitterIcon />
                </button>
                <button
                  type="button"
                  onClick={() => handleShare('facebook')}
                  title="Share on Facebook"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4B5563' }}
                >
                  <FacebookIcon />
                </button>
                <button
                  type="button"
                  onClick={() => handleShare('linkedin')}
                  title="Share on LinkedIn"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4B5563' }}
                >
                  <LinkedinIcon />
                </button>
                <button
                  type="button"
                  onClick={() => handleShare('copy')}
                  title="Copy Link"
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: copiedLink ? '#16A34A' : '#4B5563' }}
                >
                  {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Main Body Prose Content */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            padding: '3rem 2.5rem',
          }}>
            {post.excerpt && (
              <div style={{
                fontSize: '1.125rem',
                lineHeight: 1.7,
                color: '#374151',
                fontWeight: 500,
                borderLeft: '4px solid var(--color-nets-red, #C40000)',
                paddingLeft: '1.25rem',
                marginBottom: '2.5rem',
                fontStyle: 'italic',
              }}>
                {post.excerpt}
              </div>
            )}

            <div
              className="prose blog-content max-w-none"
              dangerouslySetInnerHTML={{ __html: formatBlogContent(post.content) }}
            />

            {post.tags && (
              <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#6B7280' }}>Tags:</span>
                {post.tags.split(',').map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: '#F3F4F6',
                      color: '#4B5563',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    #{t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Author Bio */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '2rem 2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-nets-navy, #0A3041)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '24px',
              flexShrink: 0,
            }}>
              {post.author ? post.author.charAt(0).toUpperCase() : 'N'}
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0A3041', marginBottom: '4px' }}>
                Written by {post.author || 'NETS Editorial Team'}
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                Specialized in corporate mobility, interstate logistics, fleet intelligence, and passenger transit solutions across Nigeria.
              </p>
            </div>
          </div>

          {/* Card 4: Comments List */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '2.5rem',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0A3041', marginBottom: '1.5rem' }}>
              Reader Comments ({post.comments ? post.comments.length : 0})
            </h3>

            {topLevelComments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
                No comments on this article yet. Be the first to share your thoughts!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {topLevelComments.map(comment => {
                  const replies = (post.comments || []).filter(c => c.parent_id === comment.id)
                  const cDate = new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  return (
                    <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #F3F4F6', paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#E2E8F0',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {comment.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{comment.user_name}</span>
                            <button
                              type="button"
                              onClick={() => handleReplyClick(comment.id, comment.user_name)}
                              style={{ border: 'none', background: 'none', color: 'var(--color-nets-red, #C40000)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Reply
                            </button>
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>{cDate}</div>
                          <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                            {comment.content}
                          </p>
                        </div>
                      </div>

                      {/* Nested Replies */}
                      {replies.length > 0 && (
                        <div style={{ marginLeft: '48px', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid #E5E7EB', paddingLeft: '1rem', marginTop: '0.5rem' }}>
                          {replies.map(r => (
                            <div key={r.id}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{r.user_name}</div>
                              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>
                                {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.5, margin: 0 }}>
                                {r.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Card 5: Leave Comment Form */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '2.5rem',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0A3041', marginBottom: '0.5rem' }}>
              Leave a Comment
            </h3>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '1.5rem' }}>
              Your email address will not be published. Required fields are marked *
            </p>

            {replyingTo && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                background: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#991B1B',
                marginBottom: '1rem',
              }}>
                <span>Replying to <strong>{replyingTo.name}</strong></span>
                <button
                  type="button"
                  onClick={() => { setReplyingTo(null); setCommentText(''); }}
                  style={{ border: 'none', background: 'none', color: '#991B1B', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel Reply
                </button>
              </div>
            )}

            <form onSubmit={handleCommentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', marginBottom: '4px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Babatunde"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      fontSize: '13px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB',
                      background: '#F9FAFB',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', marginBottom: '4px' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Alabi"
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      fontSize: '13px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB',
                      background: '#F9FAFB',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', marginBottom: '4px' }}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: '1px solid #D1D5DB',
                    background: '#F9FAFB',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', marginBottom: '4px' }}>
                  Your Comment *
                </label>
                <textarea
                  ref={commentInputRef}
                  required
                  rows={4}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Share your feedback or questions regarding this transit perspective..."
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: '1px solid #D1D5DB',
                    background: '#F9FAFB',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.625rem 1.75rem',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmittingComment ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingComment ? 0.7 : 1,
                  }}
                >
                  <Send size={14} />
                  <span>{isSubmittingComment ? 'Submitting...' : 'Post Comment'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 6: Newsletter Subscribe */}
          <div style={{
            background: 'var(--color-nets-navy-dark, #061D28)',
            color: '#FFFFFF',
            borderRadius: '8px',
            padding: '3rem 2.5rem',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Subscribe to NETS Mobility Insights
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', maxWidth: '520px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
              Receive our monthly editorial on logistics management, fleet innovations, and travel guidelines across Nigeria.
            </p>

            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.5rem', maxWidth: '480px', margin: '0 auto', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="Enter your email address..."
                value={subEmail}
                onChange={e => setSubEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.625rem 1rem',
                  fontSize: '13px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="btn btn-primary"
                style={{
                  padding: '0.625rem 1.5rem',
                  fontSize: '13px',
                  cursor: isSubscribing ? 'not-allowed' : 'pointer',
                  opacity: isSubscribing ? 0.7 : 1,
                }}
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>

          {/* Card 7: Related Articles */}
          {relatedPosts.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0A3041' }}>Related Articles</h3>
                <Link to="/blog" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-nets-red, #C40000)', textDecoration: 'none' }}>
                  View All &rarr;
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {relatedPosts.map(rel => {
                  const relCover = rel.cover_image || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
                  return (
                    <article
                      key={rel.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Link to={`/blog/${rel.slug}`} style={{ height: '140px', display: 'block', overflow: 'hidden' }}>
                        <img
                          src={relCover}
                          alt={rel.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Link>
                      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        {rel.category && (
                          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-nets-red, #C40000)', marginBottom: '4px' }}>
                            {rel.category}
                          </div>
                        )}
                        <h4 style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.4, marginBottom: '0.75rem' }}>
                          <Link to={`/blog/${rel.slug}`} style={{ color: '#111827', textDecoration: 'none' }}>
                            {rel.title}
                          </Link>
                        </h4>
                        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #F3F4F6' }}>
                          <Link to={`/blog/${rel.slug}`} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-nets-red, #C40000)', textDecoration: 'none' }}>
                            Read full article &rarr;
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
