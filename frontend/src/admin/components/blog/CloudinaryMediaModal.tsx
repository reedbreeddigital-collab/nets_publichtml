import React, { useState, useEffect, useRef } from 'react'
import {
  X, UploadCloud, Image as ImageIcon, Loader2, Check,
  Trash2, RefreshCw, Link as LinkIcon, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cloudinaryService, CloudinaryResource } from '../../../services/cloudinaryService'

interface CloudinaryMediaModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (url: string, resource?: CloudinaryResource) => void
  title?: string
}

export function CloudinaryMediaModal({
  isOpen,
  onClose,
  onSelectImage,
  title = 'Cloudinary Media Gallery & Uploader',
}: CloudinaryMediaModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'library' | 'url'>('upload')
  const [images, setImages] = useState<CloudinaryResource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState<string>('')
  const [manualUrl, setManualUrl] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMedia = async () => {
    setIsLoading(true)
    try {
      const list = await cloudinaryService.getImages()
      setImages(list)
    } catch (err) {
      console.error('Failed to load Cloudinary media:', err)
      toast.error('Could not fetch Cloudinary images')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadMedia()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP, SVG)')
      return
    }

    setIsUploading(true)
    const toastId = toast.loading(`Uploading "${file.name}" to Cloudinary...`)

    try {
      const result = await cloudinaryService.uploadImage(file)
      toast.success('Image successfully uploaded to Cloudinary!', { id: toastId })
      // Auto select the newly uploaded image
      onSelectImage(result.secure_url)
      onClose()
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error(err.message || 'Cloudinary upload failed', { id: toastId })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (e: React.MouseEvent, publicId: string) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this image from Cloudinary?')) return

    const toastId = toast.loading('Deleting image from Cloudinary...')
    const ok = await cloudinaryService.deleteImage(publicId)
    if (ok) {
      toast.success('Image deleted from Cloudinary', { id: toastId })
      setImages(images.filter(img => img.public_id !== publicId))
      if (selectedUrl.includes(publicId)) {
        setSelectedUrl('')
      }
    } else {
      toast.error('Failed to delete image', { id: toastId })
    }
  }

  const handleApplySelection = () => {
    if (!selectedUrl) {
      toast.error('Please choose or upload an image first')
      return
    }
    const found = images.find(img => img.secure_url === selectedUrl || img.url === selectedUrl)
    onSelectImage(selectedUrl, found)
    onClose()
  }

  const handleManualApply = () => {
    if (!manualUrl.trim()) {
      toast.error('Please enter an image URL')
      return
    }
    onSelectImage(manualUrl.trim())
    onClose()
  }

  const filteredImages = images.filter(img => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return img.public_id.toLowerCase().includes(q) || img.format.toLowerCase().includes(q)
  })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: '#E0E7FF',
                color: '#4338CA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UploadCloud size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{title}</div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                Cloudinary Cloud: <strong style={{ color: '#4338CA' }}>wnmabxiy</strong> (auto CDN &amp; optimization)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'upload' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'upload' ? '#2563EB' : '#64748B',
            }}
          >
            <UploadCloud size={15} />
            Upload New File
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'library' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'library' ? '#2563EB' : '#64748B',
            }}
          >
            <ImageIcon size={15} />
            Media Library ({images.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'url' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'url' ? '#2563EB' : '#64748B',
            }}
          >
            <LinkIcon size={15} />
            Paste External URL
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  handleFileUpload(e.dataTransfer.files)
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  border: '2px dashed #93C5FD',
                  borderRadius: '10px',
                  background: '#F0F7FF',
                  padding: '3rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  style={{ display: 'none' }}
                  onChange={e => handleFileUpload(e.target.files)}
                  disabled={isUploading}
                />

                {isUploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <Loader2 size={36} className="animate-spin" color="#2563EB" />
                    <div style={{ fontWeight: 600, color: '#1E40AF', fontSize: '15px' }}>
                      Uploading directly to Cloudinary...
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      Optimizing and generating secure CDN URLs
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: '#DBEAFE',
                        color: '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UploadCloud size={26} />
                    </div>
                    <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '16px' }}>
                      Drag &amp; drop an image here, or click to browse
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                      Supports PNG, JPG, JPEG, WebP, SVG (High resolution auto-optimized)
                    </div>
                    <button
                      type="button"
                      style={{
                        marginTop: '0.5rem',
                        padding: '8px 20px',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Select File from Device
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA LIBRARY */}
          {activeTab === 'library' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Filter images by name or format..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={loadMedia}
                  disabled={isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                  }}
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '8px', color: '#64748B' }}>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Loading images from Cloudinary...</span>
                </div>
              ) : filteredImages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B', background: '#F8FAFC', borderRadius: '8px' }}>
                  <ImageIcon size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, color: '#334155' }}>No images found in Cloudinary</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Upload New File" to add images to your Cloudinary storage.</div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {filteredImages.map(img => {
                    const isSelected = selectedUrl === img.secure_url || selectedUrl === img.url
                    return (
                      <div
                        key={img.public_id}
                        onClick={() => setSelectedUrl(img.secure_url)}
                        style={{
                          position: 'relative',
                          border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#F8FAFC',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', paddingTop: '75%', overflow: 'hidden' }}>
                          <img
                            src={img.secure_url || img.url}
                            alt={img.public_id}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: '#2563EB',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={14} />
                            </div>
                          )}
                        </div>

                        <div style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px', fontWeight: 600, color: '#334155' }}>
                            {img.public_id.split('/').pop()}
                          </div>
                          <button
                            type="button"
                            title="Delete from Cloudinary"
                            onClick={e => handleDelete(e, img.public_id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE URL */}
          {activeTab === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  External Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {manualUrl && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '0.5rem' }}>Live Preview:</div>
                  <img
                    src={manualUrl}
                    alt="Preview"
                    onError={() => toast.error('Failed to load image preview')}
                    style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <a
            href="https://console.cloudinary.com/console/c-wnmabxiy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              color: '#4338CA',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <ExternalLink size={13} />
            Cloudinary Console
          </a>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            {activeTab === 'library' && (
              <button
                type="button"
                onClick={handleApplySelection}
                disabled={!selectedUrl}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedUrl ? '#2563EB' : '#94A3B8',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: selectedUrl ? 'pointer' : 'not-allowed',
                }}
              >
                Use Selected Image
              </button>
            )}

            {activeTab === 'url' && (
              <button
                type="button"
                onClick={handleManualApply}
                disabled={!manualUrl.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: manualUrl.trim() ? '#2563EB' : '#94A3B8',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: manualUrl.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Insert Image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
