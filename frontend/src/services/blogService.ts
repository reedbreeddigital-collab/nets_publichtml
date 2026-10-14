import { API_URL } from '../config/api'
import { BlogPost, BlogCategory, BlogTag, BlogComment, NewsletterSubscriber } from '../types/blog'

const SEED_CATEGORIES: BlogCategory[] = [
  { id: 'cat-interstate', name: 'Interstate Travel', slug: 'interstate-travel' },
  { id: 'cat-corporate', name: 'Corporate Mobility', slug: 'corporate-mobility' },
  { id: 'cat-fleet', name: 'Fleet Safety', slug: 'fleet-safety' },
  { id: 'cat-guides', name: 'Travel Guides', slug: 'travel-guides' },
]

const SEED_TAGS: BlogTag[] = [
  { id: 'tag-transit', name: 'Transit', slug: 'transit' },
  { id: 'tag-luxury', name: 'Luxury Travel', slug: 'luxury-travel' },
  { id: 'tag-lagos', name: 'Lagos', slug: 'lagos' },
  { id: 'tag-safety', name: 'Safety First', slug: 'safety-first' },
  { id: 'tag-executive', name: 'Executive', slug: 'executive' },
]

const SEED_POSTS: BlogPost[] = [
  {
    id: 'post-interstate-safe-travel',
    title: 'Safe Interstate Travel in Nigeria: How Modern Fleets are Redefining Road Transit',
    slug: 'safe-interstate-travel-in-nigeria',
    excerpt: 'Discover how speed limiting, scheduled maintenance, and executive chauffeur vetting are changing the standard of intercity travel across Lagos, Abuja, and Benin.',
    content: `
      <p>Long-distance highway travel across Nigeria demands uncompromising attention to vehicle maintenance, professional route intelligence, and experienced chauffeurs. At New Era Transport Services (NETS), we believe road transit should be as smooth, reliable, and secure as executive aviation.</p>
      <h2>The Core Pillars of Fleet Reliability</h2>
      <p>Every commercial vehicle in our interstate fleet undergoes stringent multipoint diagnostics before departure. We evaluate tyre pressure telemetry, brake pad thickness, cooling systems, and cabin air purification to ensure journeys between hubs like Lagos, Ibadan, and Abuja proceed without hitches.</p>
      <blockquote>Safety is not an optional feature—it is the bedrock upon which trust is built on Nigerian highways.</blockquote>
      <p>With real-time satellite tracking and dual-driver rotations for journeys exceeding six hours, NETS passengers enjoy punctual arrivals and supreme cabin comfort. Whether renting a Toyota Coaster for wedding delegations or booking a private executive HiAce, you travel with absolute confidence.</p>
      <h2>What to Look for When Booking Charter Buses</h2>
      <ul>
        <li><strong>Commercial Licensing & Insurance:</strong> Ensure comprehensive coverage and valid interstate carriage permits.</li>
        <li><strong>Experienced Chauffeurs:</strong> Drivers trained in defensive tactics, customer courtesy, and route navigation.</li>
        <li><strong>Clean, Climate-Controlled Interiors:</strong> High-output dual air conditioning and ergonomic reclining seating.</li>
      </ul>
    `,
    cover_image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    author: 'NETS Mobility Insights',
    category_id: 'cat-interstate',
    category: 'Interstate Travel',
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    tags: 'Transit, Safety First, Lagos',
    comments: [
      {
        id: 'cmt-001',
        post_id: 'post-interstate-safe-travel',
        user_name: 'Babatunde Alabi',
        user_email: 'babatunde@example.com',
        content: 'Travelled with the NETS Coaster from Lagos to Ibadan last weekend with our executive team. Absolutely immaculate vehicle and punctual driver.',
        status: 'APPROVED',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      }
    ]
  },
  {
    id: 'post-corporate-staff-commute',
    title: 'Optimizing Corporate Commutes: Why Leading Enterprises Choose Dedicated Shuttles',
    slug: 'optimizing-corporate-commutes',
    excerpt: 'Employee punctuality, reduced stress, and lower carbon footprints: exploring the return on investment of dedicated corporate shuttle buses.',
    content: `
      <p>Traffic congestion in major metropolitan centres like Lagos places enormous strain on workforce productivity and employee morale. Dedicated corporate shuttle transport bridges the gap between suburban residential hubs and commercial centres in Victoria Island, Ikeja, and Lekki.</p>
      <h2>Enhancing Workplace Culture from Door to Door</h2>
      <p>Providing air-conditioned, reliable commuter buses allows team members to recharge, catch up on morning communications via onboard Wi-Fi, and arrive at the office revitalized. Organisations using our Toyota Coaster and HiAce fleets report measurable reductions in morning absenteeism.</p>
      <h2>Operational Flexibility for Growing Teams</h2>
      <p>From flexible monthly lease arrangements to fully managed route operations with dedicated drivers, NETS handles everything so human resource leaders can focus on company growth.</p>
    `,
    cover_image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80',
    author: 'Corporate Logistics Desk',
    category_id: 'cat-corporate',
    category: 'Corporate Mobility',
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    tags: 'Executive, Transit',
    comments: []
  },
  {
    id: 'post-airport-transfers-guide',
    title: 'Executive Airport Transfers in Lagos: The Ultimate Smooth Landing Protocol',
    slug: 'executive-airport-transfers-in-lagos',
    excerpt: 'From flight tracking to flight-delay protection, here is what makes a private executive transfer frictionless at Murtala Muhammed International Airport.',
    content: `
      <p>Navigating airport pickups in Ikeja requires precision timing. Our flight monitoring systems synchronize chauffeur dispatches with real-time runway touchdowns, guaranteeing zero kerbside waiting time for arriving dignitaries and business leaders.</p>
      <h2>The Executive Fleet Advantage</h2>
      <p>With luxury SUVs and executive minivans equipped with privacy glass, leather upholstery, and chilled refreshments, your transition from flight cabin to executive suite is instantaneous.</p>
      <p>Contact our concierge desk today to arrange bespoke airport meet-and-greet services tailored to your flight schedule.</p>
    `,
    cover_image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
    author: 'NETS Concierge Team',
    category_id: 'cat-fleet',
    category: 'Fleet Safety',
    status: 'PUBLISHED',
    published_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    tags: 'Luxury Travel, Executive, Lagos',
    comments: []
  }
]

class BlogService {
  private localKey = 'nets_blog_posts'
  private catKey = 'nets_blog_categories'
  private tagKey = 'nets_blog_tags'
  private subKey = 'nets_blog_subscribers'
  private commentKey = 'nets_blog_comments'

  private getStoredPosts(): BlogPost[] {
    try {
      const data = localStorage.getItem(this.localKey)
      if (data) return JSON.parse(data)
    } catch {}
    return SEED_POSTS
  }

  private setStoredPosts(posts: BlogPost[]) {
    try {
      localStorage.setItem(this.localKey, JSON.stringify(posts))
    } catch {}
  }

  private getStoredCategories(): BlogCategory[] {
    try {
      const data = localStorage.getItem(this.catKey)
      if (data) return JSON.parse(data)
    } catch {}
    return SEED_CATEGORIES
  }

  private setStoredCategories(cats: BlogCategory[]) {
    try {
      localStorage.setItem(this.catKey, JSON.stringify(cats))
    } catch {}
  }

  private getStoredTags(): BlogTag[] {
    try {
      const data = localStorage.getItem(this.tagKey)
      if (data) return JSON.parse(data)
    } catch {}
    return SEED_TAGS
  }

  private setStoredTags(tags: BlogTag[]) {
    try {
      localStorage.setItem(this.tagKey, JSON.stringify(tags))
    } catch {}
  }

  private getStoredComments(): BlogComment[] {
    try {
      const data = localStorage.getItem(this.commentKey)
      if (data) return JSON.parse(data)
    } catch {}
    const c: BlogComment[] = []
    SEED_POSTS.forEach(p => {
      if (p.comments) c.push(...p.comments)
    })
    return c
  }

  private setStoredComments(comments: BlogComment[]) {
    try {
      localStorage.setItem(this.commentKey, JSON.stringify(comments))
    } catch {}
  }

  private getStoredSubscribers(): NewsletterSubscriber[] {
    try {
      const data = localStorage.getItem(this.subKey)
      if (data) return JSON.parse(data)
    } catch {}
    return [
      { id: 'sub-01', email: 'corporate@dangotelng.com', status: 'ACTIVE', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
      { id: 'sub-02', email: 'traveldesk@gtbankplc.com', status: 'ACTIVE', created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
    ]
  }

  private setStoredSubscribers(subs: NewsletterSubscriber[]) {
    try {
      localStorage.setItem(this.subKey, JSON.stringify(subs))
    } catch {}
  }

  // --- POSTS ---
  async getPosts(): Promise<BlogPost[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/posts`)
      if (res.ok) {
        const json = await res.json()
        const posts = Array.isArray(json) ? json : (json.data || [])
        if (Array.isArray(posts) && posts.length > 0) {
          this.setStoredPosts(posts)
          return posts
        }
      }
    } catch (err) {
      console.warn('[BlogService] Fetching from backend failed, using local storage cache:', err)
    }
    return this.getStoredPosts()
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/posts/${slug}`)
      if (res.ok) {
        const json = await res.json()
        const post = json.data || json
        if (post && post.id) return post
      }
    } catch (err) {
      console.warn('[BlogService] Fetch post by slug error, using local fallback:', err)
    }
    const posts = this.getStoredPosts()
    return posts.find(p => p.slug === slug || p.id === slug) || null
  }

  async createPost(payload: Partial<BlogPost>): Promise<BlogPost | null> {
    const localId = 'post_' + Math.random().toString(36).substring(2, 9)
    const slug = payload.slug || (payload.title ? payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + localId.slice(-4) : localId)
    const now = new Date().toISOString()
    const newPost: BlogPost = {
      id: localId,
      title: payload.title || 'Untitled Post',
      slug,
      excerpt: payload.excerpt || '',
      content: payload.content || '',
      cover_image: payload.cover_image || null,
      author: payload.author || 'NETS Team',
      category_id: payload.category_id || null,
      category: payload.category || '',
      status: payload.status || 'PUBLISHED',
      published_at: payload.status === 'PUBLISHED' ? now : null,
      created_at: now,
      updated_at: now,
      tags: payload.tags || '',
      comments: []
    }

    try {
      const res = await fetch(`${API_URL}/cms/blog/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const json = await res.json()
        const created = json.data || json
        if (created && created.id) {
          const list = [created, ...this.getStoredPosts().filter(p => p.id !== created.id)]
          this.setStoredPosts(list)
          return created
        }
      }
    } catch (err) {
      console.warn('[BlogService] Create post backend error, saving to local store:', err)
    }

    const current = this.getStoredPosts()
    this.setStoredPosts([newPost, ...current])
    return newPost
  }

  async updatePost(payload: Partial<BlogPost>): Promise<BlogPost | null> {
    if (!payload.id) return null

    try {
      const res = await fetch(`${API_URL}/cms/blog/posts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const json = await res.json()
        const updated = json.data || json
        if (updated && updated.id) {
          const list = this.getStoredPosts().map(p => p.id === updated.id ? { ...p, ...updated } : p)
          this.setStoredPosts(list)
          return updated
        }
      }
    } catch (err) {
      console.warn('[BlogService] Update post backend error, updating local store:', err)
    }

    const list = this.getStoredPosts().map(p => p.id === payload.id ? { ...p, ...payload, updated_at: new Date().toISOString() } : p)
    this.setStoredPosts(list as BlogPost[])
    return list.find(p => p.id === payload.id) || null
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/posts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        await fetch(`${API_URL}/cms/blog/posts?id=${id}`, { method: 'DELETE' })
      }
    } catch (err) {
      console.warn('[BlogService] Delete post backend error:', err)
    }
    const filtered = this.getStoredPosts().filter(p => p.id !== id)
    this.setStoredPosts(filtered)
    return true
  }

  // --- CATEGORIES ---
  async getCategories(): Promise<BlogCategory[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/categories`)
      if (res.ok) {
        const json = await res.json()
        const cats = Array.isArray(json) ? json : (json.data || [])
        if (Array.isArray(cats) && cats.length > 0) {
          this.setStoredCategories(cats)
          return cats
        }
      }
    } catch {}
    return this.getStoredCategories()
  }

  async createCategory(name: string): Promise<BlogCategory | null> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const cat: BlogCategory = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      name,
      slug
    }
    try {
      const res = await fetch(`${API_URL}/cms/blog/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      })
      if (res.ok) {
        const json = await res.json()
        const created = json.data || json
        if (created && created.id) {
          const list = [...this.getStoredCategories(), created]
          this.setStoredCategories(list)
          return created
        }
      }
    } catch {}
    const list = [...this.getStoredCategories(), cat]
    this.setStoredCategories(list)
    return cat
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      await fetch(`${API_URL}/cms/blog/categories/${id}`, { method: 'DELETE' })
    } catch {}
    const list = this.getStoredCategories().filter(c => c.id !== id)
    this.setStoredCategories(list)
    return true
  }

  // --- TAGS ---
  async getTags(): Promise<BlogTag[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/tags`)
      if (res.ok) {
        const json = await res.json()
        const tags = Array.isArray(json) ? json : (json.data || [])
        if (Array.isArray(tags) && tags.length > 0) {
          this.setStoredTags(tags)
          return tags
        }
      }
    } catch {}
    return this.getStoredTags()
  }

  async createTag(name: string): Promise<BlogTag | null> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const tag: BlogTag = {
      id: 'tag_' + Math.random().toString(36).substring(2, 9),
      name,
      slug
    }
    try {
      const res = await fetch(`${API_URL}/cms/blog/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug })
      })
      if (res.ok) {
        const json = await res.json()
        const created = json.data || json
        if (created && created.id) {
          const list = [...this.getStoredTags(), created]
          this.setStoredTags(list)
          return created
        }
      }
    } catch {}
    const list = [...this.getStoredTags(), tag]
    this.setStoredTags(list)
    return tag
  }

  async deleteTag(id: string): Promise<boolean> {
    try {
      await fetch(`${API_URL}/cms/blog/tags/${id}`, { method: 'DELETE' })
    } catch {}
    const list = this.getStoredTags().filter(t => t.id !== id)
    this.setStoredTags(list)
    return true
  }

  // --- COMMENTS ---
  async getComments(): Promise<BlogComment[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/comments`)
      if (res.ok) {
        const json = await res.json()
        const list = Array.isArray(json) ? json : (json.data || [])
        if (Array.isArray(list) && list.length > 0) {
          this.setStoredComments(list)
          return list
        }
      }
    } catch {}
    return this.getStoredComments()
  }

  async createComment(payload: { post_id: string; name: string; email?: string; content: string; parent_id?: string | null }): Promise<BlogComment | null> {
    const comment: BlogComment = {
      id: 'cmt_' + Math.random().toString(36).substring(2, 9),
      post_id: payload.post_id,
      user_name: payload.name,
      user_email: payload.email,
      content: payload.content,
      status: 'APPROVED',
      parent_id: payload.parent_id || null,
      created_at: new Date().toISOString()
    }
    try {
      const res = await fetch(`${API_URL}/cms/blog/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const json = await res.json()
        const created = json.data || json
        if (created && created.id) {
          const list = [...this.getStoredComments(), created]
          this.setStoredComments(list)
          return created
        }
      }
    } catch {}
    const list = [...this.getStoredComments(), comment]
    this.setStoredComments(list)
    return comment
  }

  async updateCommentStatus(id: string, status: 'APPROVED' | 'PENDING' | 'SPAM'): Promise<boolean> {
    try {
      await fetch(`${API_URL}/cms/blog/comments/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
    } catch {}
    const list = this.getStoredComments().map(c => c.id === id ? { ...c, status } : c)
    this.setStoredComments(list)
    return true
  }

  async deleteComment(id: string): Promise<boolean> {
    try {
      await fetch(`${API_URL}/cms/blog/comments/delete?id=${id}`, { method: 'DELETE' })
    } catch {}
    const list = this.getStoredComments().filter(c => c.id !== id && c.parent_id !== id)
    this.setStoredComments(list)
    return true
  }

  // --- SUBSCRIBERS ---
  async getSubscribers(): Promise<NewsletterSubscriber[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/subscribe`)
      if (res.ok) {
        const json = await res.json()
        const list = Array.isArray(json) ? json : (json.data || [])
        if (Array.isArray(list) && list.length > 0) {
          this.setStoredSubscribers(list)
          return list
        }
      }
    } catch {}
    return this.getStoredSubscribers()
  }

  async subscribe(email: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        const list = [{ id: 'sub_' + Math.random().toString(36).substring(2, 9), email, status: 'ACTIVE' as const, created_at: new Date().toISOString() }, ...this.getStoredSubscribers()]
        this.setStoredSubscribers(list)
        return true
      }
    } catch {}
    const list = [{ id: 'sub_' + Math.random().toString(36).substring(2, 9), email, status: 'ACTIVE' as const, created_at: new Date().toISOString() }, ...this.getStoredSubscribers()]
    this.setStoredSubscribers(list)
    return true
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    try {
      await fetch(`${API_URL}/cms/blog/subscribe/delete?id=${id}`, { method: 'DELETE' })
    } catch {}
    const list = this.getStoredSubscribers().filter(s => s.id !== id)
    this.setStoredSubscribers(list)
    return true
  }
}

export const blogService = new BlogService()
