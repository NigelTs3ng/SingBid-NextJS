import React, { useState, useCallback, useRef } from 'react'
import { X, Upload, Image as ImageIcon, Star, Move, Loader2 } from 'lucide-react'
import ImageService, { AuctionImage } from '../../../lib/imageService'
import Icon from '../../AppIcon'

interface ImageUploadProps {
  auctionId?: string
  initialImages?: AuctionImage[]
  onImagesChange: (images: AuctionImage[]) => void
  maxImages?: number
  disabled?: boolean
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  auctionId = 'temp',
  initialImages = [],
  onImagesChange,
  maxImages = 10,
  disabled = false
}) => {
  const [images, setImages] = useState<AuctionImage[]>(initialImages)
  const [uploading, setUploading] = useState<string[]>([]) // Track uploading files
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || disabled) return

    const fileArray = Array.from(files)
    const remainingSlots = maxImages - images.length
    const filesToUpload = fileArray.slice(0, remainingSlots)

    if (filesToUpload.length === 0) {
      alert(`Maximum ${maxImages} images allowed`)
      return
    }

    // Add files to uploading state
    const uploadingIds = filesToUpload.map(file => `temp-${Date.now()}-${Math.random()}`)
    setUploading(prev => [...prev, ...uploadingIds])

    try {
      const uploadPromises = filesToUpload.map(async (file, index) => {
        const uploadingId = uploadingIds[index]
        
        try {
          const result = await ImageService.uploadImage(file, auctionId, 'temp-user')
          
          if (result.success && result.image) {
            return {
              ...result.image,
              display_order: images.length + index,
              is_primary: images.length === 0 && index === 0, // First image is primary
              alt_text: file.name.split('.')[0]
            }
          }
          throw new Error(result.error || 'Upload failed')
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          return null
        } finally {
          // Remove from uploading state
          setUploading(prev => prev.filter(id => id !== uploadingId))
        }
      })

      const uploadedImages = await Promise.all(uploadPromises)
      const successfulUploads = uploadedImages.filter(Boolean) as AuctionImage[]

      if (successfulUploads.length > 0) {
        const newImages = [...images, ...successfulUploads]
        setImages(newImages)
        onImagesChange(newImages)
      }

      if (successfulUploads.length !== filesToUpload.length) {
        alert('Some images failed to upload. Please try again.')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploading([])
    }
  }, [images, auctionId, maxImages, disabled, onImagesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const removeImage = useCallback(async (index: number) => {
    if (disabled) return

    const imageToRemove = images[index]
    const newImages = [...images]
    newImages.splice(index, 1)

    // Reorder remaining images
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      display_order: idx,
      is_primary: idx === 0 // First image becomes primary
    }))

    setImages(reorderedImages)
    onImagesChange(reorderedImages)

    // Delete from storage if it has an ID (already saved)
    if (imageToRemove.id) {
      try {
        await ImageService.deleteImage(imageToRemove.id)
      } catch (error) {
        console.error('Failed to delete image:', error)
      }
    }
  }, [images, disabled, onImagesChange])

  const setPrimaryImage = useCallback((index: number) => {
    if (disabled) return

    const newImages = images.map((img, idx) => ({
      ...img,
      is_primary: idx === index
    }))

    setImages(newImages)
    onImagesChange(newImages)
  }, [images, disabled, onImagesChange])

  const moveImage = useCallback((fromIndex: number, toIndex: number) => {
    if (disabled || fromIndex === toIndex) return

    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)

    // Update display order
    const reorderedImages = newImages.map((img, idx) => ({
      ...img,
      display_order: idx
    }))

    setImages(reorderedImages)
    onImagesChange(reorderedImages)
  }, [images, disabled, onImagesChange])

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center space-y-2">
          <Icon name="Upload" size={32} className="text-muted-foreground" />
          <div>
            <p className="font-medium">Upload Images</p>
            <p className="text-sm text-muted-foreground">
              Drag and drop or click to select files
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum {maxImages} images, 5MB each. JPEG, PNG, WebP only.
            </p>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      {(images.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Existing Images */}
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className="relative group bg-card border border-border rounded-lg overflow-hidden aspect-square"
            >
              <img
                src={image.image_url}
                alt={image.alt_text || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex space-x-2">
                  {/* Primary Image Button */}
                  <button
                    onClick={() => setPrimaryImage(index)}
                    className={`
                      p-2 rounded-full transition-colors
                      ${image.is_primary 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }
                    `}
                    title={image.is_primary ? 'Primary image' : 'Set as primary'}
                    disabled={disabled}
                  >
                    <Icon name="Star" size={16} />
                  </button>
                  
                  {/* Move Left */}
                  {index > 0 && (
                    <button
                      onClick={() => moveImage(index, index - 1)}
                      className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                      title="Move left"
                      disabled={disabled}
                    >
                      <Icon name="ChevronLeft" size={16} />
                    </button>
                  )}
                  
                  {/* Move Right */}
                  {index < images.length - 1 && (
                    <button
                      onClick={() => moveImage(index, index + 1)}
                      className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                      title="Move right"
                      disabled={disabled}
                    >
                      <Icon name="ChevronRight" size={16} />
                    </button>
                  )}
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => removeImage(index)}
                    className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                    title="Remove image"
                    disabled={disabled}
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              </div>

              {/* Primary Badge */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                  <Icon name="Star" size={12} />
                  <span>Primary</span>
                </div>
              )}

              {/* Image Order */}
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                {index + 1}
              </div>
            </div>
          ))}

          {/* Uploading Placeholders */}
          {uploading.map((uploadingId) => (
            <div
              key={uploadingId}
              className="relative bg-muted border border-border rounded-lg overflow-hidden aspect-square flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Count */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          {images.length} of {maxImages} images
        </span>
        {images.length > 0 && (
          <span>
            Primary image will be shown in listings
          </span>
        )}
      </div>
    </div>
  )
}

export default ImageUpload