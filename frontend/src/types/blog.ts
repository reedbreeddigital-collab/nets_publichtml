export interface BlogComment {
  id: string
  post_id: string
  user_name: string
  user_email?: string
  content: string
  status: 'PENDING' | 'APPROVED' | 'SPAM'
  parent_id?: string | null
  created_at: string
  updated_at?: string
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  createdAt?: string
  updatedAt?: string
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  createdAt?: string
  updatedAt?: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  cover_image?: string | null
  author_id?: string
  author: string
  category_id?: string | null
  category?: string
  status: 'DRAFT' | 'PUBLISHED'
  published_at?: string | null
  created_at: string
  updated_at?: string
  tags?: string
  comments?: BlogComment[]
}

export interface NewsletterSubscriber {
  id: string
  email: string
  status: 'ACTIVE' | 'UNSUBSCRIBED'
  created_at: string
  updated_at?: string
}
