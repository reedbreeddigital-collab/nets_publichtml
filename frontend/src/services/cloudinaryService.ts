import { API_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config/api'

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

// Browser SHA-1 helper for direct client-side fallback signing
async function sha1(str: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(str)
  const hashBuf = await crypto.subtle.digest('SHA-1', data)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('')
}

class CloudinaryService {
  private cloudName = CLOUDINARY_CLOUD_NAME
  private apiKey = CLOUDINARY_API_KEY
  private apiSecret = CLOUDINARY_API_SECRET
  private defaultFolder = 'nets_blog'

  /**
   * Upload an image to Cloudinary.
   * Tries Go backend relay first; falls back to direct browser signed upload if backend is unreachable.
   */
  async uploadImage(
    file: File | Blob | string,
    options: { folder?: string } = {}
  ): Promise<UploadResult> {
    const folder = options.folder || this.defaultFolder

    // 1. Attempt Backend Upload Endpoint
    try {
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

      if (res.ok) {
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
      }
      console.warn('Backend upload returned non-OK or empty, trying direct Cloudinary signed upload...')
    } catch (err) {
      console.warn('Backend upload failed, attempting direct Cloudinary signed fallback:', err)
    }

    // 2. Direct Signed Cloudinary Upload Fallback
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signString = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`
    const signature = await sha1(signString)

    const directFormData = new FormData()
    if (typeof file === 'string') {
      directFormData.append('file', file)
    } else {
      directFormData.append('file', file, (file as File).name || 'upload.jpg')
    }
    directFormData.append('api_key', this.apiKey)
    directFormData.append('timestamp', timestamp)
    directFormData.append('folder', folder)
    directFormData.append('signature', signature)

    const cldRes = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: 'POST',
        body: directFormData,
      }
    )

    if (!cldRes.ok) {
      const errText = await cldRes.text()
      throw new Error(`Cloudinary upload failed: ${errText}`)
    }

    const cldJson = await cldRes.json()
    return {
      url: cldJson.url || cldJson.secure_url,
      secure_url: cldJson.secure_url || cldJson.url,
      public_id: cldJson.public_id,
      format: cldJson.format,
      width: cldJson.width,
      height: cldJson.height,
      bytes: cldJson.bytes,
      created_at: cldJson.created_at,
    }
  }

  /**
   * Fetch recent images from Cloudinary.
   */
  async getImages(): Promise<CloudinaryResource[]> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/images`)
      if (res.ok) {
        const json = await res.json()
        if (json.resources && Array.isArray(json.resources)) {
          return json.resources.map((r: any) => ({
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
   * Delete an image from Cloudinary by public ID.
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/cms/blog/images?public_id=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      })
      if (res.ok) return true
    } catch (err) {
      console.warn('Backend delete failed, trying direct signed delete:', err)
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const signString = `public_id=${publicId}&timestamp=${timestamp}${this.apiSecret}`
      const signature = await sha1(signString)

      const formData = new FormData()
      formData.append('public_id', publicId)
      formData.append('api_key', this.apiKey)
      formData.append('timestamp', timestamp)
      formData.append('signature', signature)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
        method: 'POST',
        body: formData,
      })
      return res.ok
    } catch (err) {
      console.error('Failed to delete Cloudinary image:', err)
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

    // If it's a public_id
    const parts = ['f_auto', options.quality ? `q_${options.quality}` : 'q_auto']
    if (options.width) parts.push(`w_${options.width}`)
    if (options.height) parts.push(`h_${options.height}`)
    if (options.crop) parts.push(`c_${options.crop}`)

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${parts.join(',')}/${urlOrPublicId}`
  }
}

export const cloudinaryService = new CloudinaryService()
