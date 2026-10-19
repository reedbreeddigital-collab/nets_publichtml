import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, User, Search, BookOpen, Send, Sparkles, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { blogService } from '../../services/blogService'
import { BlogPost, BlogCategory } from '../../types/blog'

export function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categoryPage, setCategoryPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [subEmail, setSubEmail] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)

  const CATEGORIES_PER_PAGE = 3
  const totalCategoryPages = Math.ceil(categories.length / CATEGORIES_PER_PAGE) || 1
  const visibleCategories = categories.slice(
    categoryPage * CATEGORIES_PER_PAGE,
    (categoryPage + 1) * CATEGORIES_PER_PAGE
  )

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId)
    if (catId === 'all') return
    const catIdx = categories.findIndex(c => c.id === catId || c.name === catId)
    if (catIdx !== -1) {
      setCategoryPage(Math.floor(catIdx / CATEGORIES_PER_PAGE))
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [fetchedPosts, fetchedCats] = await Promise.all([
          blogService.getPosts(),
          blogService.getCategories(),
        ])
        setPosts(fetchedPosts)
        setCategories(fetchedCats)
      } catch (err) {
        console.error('Failed to load blog posts:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const publishedPosts = posts.filter(p => p.status === 'PUBLISHED')

  const filteredPosts = publishedPosts.filter(post => {
    const matchesCat = selectedCategory === 'all' || post.category_id === selectedCategory || (post.category && post.category.toLowerCase() === selectedCategory.toLowerCase())
    const matchesSearch = !searchQuery.trim() || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (post.excerpt && post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCat && matchesSearch
  })

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
      toast.error('Failed to subscribe. Please try again.')
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-nets-light, #F8F9FC)' }}>
      <Toaster position="top-right" />

      {/* Hero Header */}
      <section style={{
        background: 'var(--color-nets-navy-dark, #061D28)',
        color: '#FFFFFF',
        paddingTop: '9rem',
        paddingBottom: '5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(196, 0, 0, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container-nets" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '800px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-nets-red, #C40000)',
              marginBottom: '1rem',
            }}>
              <Sparkles size={14} />
              <span>NETS Mobility Insights</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '1.25rem',
              color: '#FFFFFF',
            }}>
              Insights, Updates <br />
              <span style={{ color: 'var(--color-nets-red, #C40000)' }}>&amp; Industry Perspectives.</span>
            </h1>

            <p style={{
              fontSize: '1.125rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.75)',
              maxWidth: '680px',
            }}>
              Read the latest perspectives from New Era Transport Services on corporate transit, executive fleet charters, interstate highway safety protocols, and modern mobility across Nigeria.
            </p>
          </div>
        </div>
      </section>

      {/* Controls: Search & Category Pills */}
      <section style={{
        paddingTop: '2.5rem',
        paddingBottom: '2.5rem',
        borderBottom: '1px solid #E5E7EB',
        background: '#FFFFFF',
      }}>
        <div className="container-nets">
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}>
            {/* Category Filter Pills & Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.625rem',
            }}>
              {/* All Articles Pill */}
              <button
                type="button"
                onClick={() => handleCategorySelect('all')}
                style={{
                  padding: '0.5rem 1.15rem',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  background: selectedCategory === 'all' ? 'var(--color-nets-navy, #0A3041)' : '#F3F4F6',
                  color: selectedCategory === 'all' ? '#FFFFFF' : '#4B5563',
                  borderColor: selectedCategory === 'all' ? 'var(--color-nets-navy, #0A3041)' : '#E5E7EB',
                }}
              >
                All Articles ({publishedPosts.length})
              </button>

              {/* Paginated Category Pills (3 at a time) */}
              {visibleCategories.map(cat => {
                const count = publishedPosts.filter(p => p.category_id === cat.id || p.category === cat.name).length
                const active = selectedCategory === cat.id || selectedCategory === cat.name
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    style={{
                      padding: '0.5rem 1.15rem',
                      borderRadius: '9999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      background: active ? 'var(--color-nets-navy, #0A3041)' : '#F3F4F6',
                      color: active ? '#FFFFFF' : '#4B5563',
                      borderColor: active ? 'var(--color-nets-navy, #0A3041)' : '#E5E7EB',
                    }}
                  >
                    {cat.name} ({count})
                  </button>
                )
              })}

              {/* Category Pagination Controller */}
              {totalCategoryPages > 1 && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  background: '#F1F5F9',
                  borderRadius: '9999px',
                  padding: '2px 5px',
                  border: '1px solid #E2E8F0',
                }}>
                  <button
                    type="button"
                    onClick={() => setCategoryPage(prev => Math.max(0, prev - 1))}
                    disabled={categoryPage === 0}
                    title="Previous 3 categories"
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: categoryPage === 0 ? 'transparent' : '#FFFFFF',
                      color: categoryPage === 0 ? '#9CA3AF' : '#1E293B',
                      cursor: categoryPage === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: categoryPage === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748B',
                    padding: '0 5px',
                    userSelect: 'none',
                    letterSpacing: '0.02em',
                  }}>
                    {categoryPage + 1}/{totalCategoryPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCategoryPage(prev => Math.min(totalCategoryPages - 1, prev + 1))}
                    disabled={categoryPage >= totalCategoryPages - 1}
                    title="Next 3 categories"
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: categoryPage >= totalCategoryPages - 1 ? 'transparent' : '#FFFFFF',
                      color: categoryPage >= totalCategoryPages - 1 ? '#9CA3AF' : '#1E293B',
                      cursor: categoryPage >= totalCategoryPages - 1 ? 'not-allowed' : 'pointer',
                      boxShadow: categoryPage >= totalCategoryPages - 1 ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Category Dropdown Selector */}
              {categories.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      padding: '0.5rem 2.25rem 0.5rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid #E5E7EB',
                      background: '#F9FAFB',
                      color: selectedCategory !== 'all' ? 'var(--color-nets-navy, #0A3041)' : '#4B5563',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    title="Select any category from full list"
                  >
                    <option value="all">All Categories ({publishedPosts.length})</option>
                    {categories.map(cat => {
                      const count = publishedPosts.filter(p => p.category_id === cat.id || p.category === cat.name).length
                      return (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({count})
                        </option>
                      )
                    })}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      pointerEvents: 'none',
                      color: '#6B7280',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  fontSize: '14px',
                  borderRadius: '9999px',
                  border: '1px solid #E5E7EB',
                  background: '#F9FAFB',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
        <div className="container-nets">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: '#6B7280' }}>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading latest mobility insights...</div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '5rem 1rem',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              maxWidth: '600px',
              margin: '0 auto',
            }}>
              <BookOpen size={40} style={{ margin: '0 auto 1rem auto', color: '#9CA3AF' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>No articles found</h3>
              <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '1.5rem' }}>
                {searchQuery ? `No matching posts for "${searchQuery}".` : 'Check back shortly for new publications.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1.5rem', fontSize: '13px' }}
                >
                  Clear search filters
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '2rem',
            }}>
              {filteredPosts.map(post => {
                const cover = post.cover_image || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
                const displayDate = post.published_at || post.created_at
                  ? new Date(post.published_at || post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Recent'

                return (
                  <article
                    key={post.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(0, 0, 0, 0.12)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {/* Card Thumbnail */}
                    <Link
                      to={`/blog/${post.slug}`}
                      style={{
                        position: 'relative',
                        height: '210px',
                        overflow: 'hidden',
                        display: 'block',
                        background: '#1F2937',
                      }}
                    >
                      <img
                        src={cover}
                        alt={post.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.4s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                      {post.category && (
                        <div style={{
                          position: 'absolute',
                          top: '14px',
                          left: '14px',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(4px)',
                          color: 'var(--color-nets-navy, #0A3041)',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}>
                          {post.category}
                        </div>
                      )}
                    </Link>

                    {/* Card Body */}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#6B7280',
                        marginBottom: '0.75rem',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} />
                          {displayDate}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={13} />
                          {post.author || 'NETS Desk'}
                        </span>
                      </div>

                      <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#111827',
                        marginBottom: '0.75rem',
                      }}>
                        <Link
                          to={`/blog/${post.slug}`}
                          style={{ color: '#111827', textDecoration: 'none', transition: 'color 0.15s ease' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-nets-red, #C40000)'}
                          onMouseLeave={e => e.currentTarget.style.color = '#111827'}
                        >
                          {post.title}
                        </Link>
                      </h2>

                      <p style={{
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: '#4B5563',
                        marginBottom: '1.5rem',
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {post.excerpt}
                      </p>

                      <div style={{
                        borderTop: '1px solid #F3F4F6',
                        paddingTop: '1rem',
                        marginTop: 'auto',
                      }}>
                        <Link
                          to={`/blog/${post.slug}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--color-nets-red, #C40000)',
                            textDecoration: 'none',
                            transition: 'gap 0.15s ease',
                          }}
                          onMouseEnter={e => e.currentTarget.style.gap = '10px'}
                          onMouseLeave={e => e.currentTarget.style.gap = '6px'}
                        >
                          <span>Read Full Article</span>
                          <ArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Subscription Footer Card */}
      <section style={{
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        padding: '5rem 0',
      }}>
        <div className="container-nets">
          <div style={{
            maxWidth: '680px',
            margin: '0 auto',
            textAlign: 'center',
          }}>
            <h3 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--color-nets-navy, #0A3041)',
              marginBottom: '0.75rem',
            }}>
              Subscribe to NETS Mobility Insights
            </h3>
            <p style={{
              fontSize: '15px',
              color: '#4B5563',
              lineHeight: 1.6,
              marginBottom: '2rem',
            }}>
              Join transport managers, executive organizers, and travelers receiving our monthly briefing on transport logistics, highway trends, and charter discounts.
            </p>

            <form onSubmit={handleSubscribe} style={{
              display: 'flex',
              gap: '0.5rem',
              maxWidth: '520px',
              margin: '0 auto',
              flexWrap: 'wrap',
            }}>
              <input
                type="email"
                placeholder="Enter your corporate or personal email..."
                value={subEmail}
                onChange={e => setSubEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #D1D5DB',
                  background: '#F9FAFB',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isSubscribing ? 'not-allowed' : 'pointer',
                  opacity: isSubscribing ? 0.7 : 1,
                }}
              >
                <span>{isSubscribing ? 'Subscribing...' : 'Subscribe'}</span>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
