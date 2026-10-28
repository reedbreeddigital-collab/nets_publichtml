import { API_URL } from '../config/api'

export interface CloudinaryResource {
  asset_id?: string
  public_id: string
  format: string
  version?: number
  resource_type?: string
  type?: string
  created_at: string
  bytes: number
  width: number
  height: number
  url: string
  secure_url: string
}

export interface UploadResult {
  url: string
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  bytes?: number
  created_at?: string
}

class CloudinaryService {
  private defaultFolder = 'nets_blog'
  private cloudName = ''

  /**
   * Upload an image to Cloudinary via the Go backend relay (which holds CLOUDINARY_URL in backend/.env).
   */
  async uploadImage(
    file: File | Blob | string,
    options: { folder?: string } = {}
  ): Promise<UploadResult> {
    const folder = options.folder || this.defaultFolder

    const formData = new FormData()
    if (typeof file === 'string') {
      formData.append('file', file)
    } else {
      formData.append('file', file, (file as File).name || 'upload.jpg')
    }
    formData.append('folder', folder)

    const res = await fetch(`${API_URL}/cms/blog/upload-image`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Cloudinary upload failed via backend: ${errText}`)
    }

    const json = await res.json()
    if (json.data && (json.data.secure_url || json.data.url)) {
      return {
        url: json.data.url || json.data.secure_url,
        secure_url: json.data.secure_url || json.data.url,
        public_id: json.data.public_id,
        format: json.data.format || 'jpg',
        width: json.data.width || 0,
        height: json.data.height || 0,
        bytes: json.data.bytes || 0,
        created_at: json.data.created_at || new Date().toISOString(),
      }
    }

    throw new Error('Invalid upload response from backend')
  }

  /**
   * Fetch recent images from Cloudinary via the Go backend API.
   */
  async getImages(): Promise<CloudinaryResource[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/images`)
      if (res.ok) {
        const json = await res.json()
        const resources = json.data?.resources || json.resources
        if (Array.isArray(resources)) {
          return resources.map((r: any) => ({
            asset_id: r.asset_id,
            public_id: r.public_id,
            format: r.format,
            created_at: r.created_at,
            bytes: r.bytes,
            width: r.width,
            height: r.height,
            url: r.url,
            secure_url: r.secure_url,
          }))
        }
      }
    } catch (err) {
      console.warn('Could not fetch Cloudinary images from backend API:', err)
    }

    return []
  }

  /**
   * Delete an image from Cloudinary by public ID via the Go backend API.
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/images?public_id=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      })
      return res.ok
    } catch (err) {
      console.error('Failed to delete Cloudinary image via backend:', err)
      return false
    }
  }

  /**
   * Generates a transformed/optimized Cloudinary URL (e.g. thumbnails, responsive sizes).
   */
  getOptimizedUrl(
    urlOrPublicId: string,
    options: { width?: number; height?: number; crop?: string; quality?: string } = {}
  ): string {
    if (!urlOrPublicId) return ''

    // If it's already a full Cloudinary URL
    if (urlOrPublicId.includes('res.cloudinary.com')) {
      const parts: string[] = []
      if (options.quality) parts.push(`q_${options.quality}`)
      else parts.push('q_auto')
      parts.push('f_auto')

      if (options.width) parts.push(`w_${options.width}`)
      if (options.height) parts.push(`h_${options.height}`)
      if (options.crop) parts.push(`c_${options.crop}`)

      const transformStr = parts.join(',')
      return urlOrPublicId.replace('/upload/', `/upload/${transformStr}/`)
    }

    if (!this.cloudName) return urlOrPublicId

    const parts = ['f_auto', options.quality ? `q_${options.quality}` : 'q_auto']
    if (options.width) parts.push(`w_${options.width}`)
    if (options.height) parts.push(`h_${options.height}`)
    if (options.crop) parts.push(`c_${options.crop}`)

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${parts.join(',')}/${urlOrPublicId}`
  }
}

export const cloudinaryService = new CloudinaryService()
