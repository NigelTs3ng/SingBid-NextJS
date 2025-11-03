import React, { useState, useCallback, useRef } from 'react'
import Icon from '../AppIcon'
import RaffleImageService, { RaffleImage } from '../../lib/raffleImageService'

interface Props {
  raffleId?: string
  initialImages?: RaffleImage[]
  onImagesChange: (images: RaffleImage[]) => void
  maxImages?: number
  disabled?: boolean
}

const RaffleImageUpload: React.FC<Props> = ({
  raffleId = 'temp',
  initialImages = [],
  onImagesChange,
  maxImages = 8,
  disabled = false,
}) => {
  const [images, setImages] = useState<RaffleImage[]>(initialImages)
  const [uploading, setUploading] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || disabled) return
    const fileArray = Array.from(files)
    const remaining = maxImages - images.length
    const filesToUpload = fileArray.slice(0, remaining)
    if (filesToUpload.length === 0) { alert(`Maximum ${maxImages} images allowed`); return }

    const uploadingIds = filesToUpload.map(() => `temp-${Date.now()}-${Math.random()}`)
    setUploading(prev => [...prev, ...uploadingIds])

    try {
      const uploaded = await Promise.all(filesToUpload.map(async (file, idx) => {
        const id = uploadingIds[idx]
        try {
          const res = await RaffleImageService.uploadImage(file, raffleId, 'temp-user')
          if (res.success && res.image) {
            return {
              ...res.image,
              display_order: images.length + idx,
              is_primary: images.length === 0 && idx === 0,
              alt_text: file.name.split('.')[0],
            } as RaffleImage
          }
          throw new Error(res.error || 'Upload failed')
        } finally {
          setUploading(prev => prev.filter(x => x !== id))
        }
      }))

      const newImages = [...images, ...uploaded.filter(Boolean) as RaffleImage[]]
      setImages(newImages)
      onImagesChange(newImages)
    } catch (e) {
      console.error('Raffle upload error:', e)
      setUploading([])
    }
  }, [images, raffleId, maxImages, disabled, onImagesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
        onDrop={handleDrop}
        onDragOver={(e)=>{e.preventDefault(); setDragOver(true)}}
        onDragLeave={(e)=>{e.preventDefault(); setDragOver(false)}}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e)=>handleFileSelect(e.target.files)} disabled={disabled} />
        <div className="flex flex-col items-center space-y-2">
          <Icon name="Upload" size={32} className="text-muted-foreground" />
          <div>
            <p className="font-medium">Upload Raffle Images</p>
            <p className="text-sm text-muted-foreground">Drag and drop or click to select files</p>
            <p className="text-xs text-muted-foreground mt-1">Max {maxImages} images, 5MB each</p>
          </div>
        </div>
      </div>

      {(images.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, index) => (
            <div key={img.id || index} className="relative group bg-card border border-border rounded-lg overflow-hidden aspect-square">
              <img src={img.image_url} alt={img.alt_text || `Image ${index+1}`} className="w-full h-full object-cover" />
              {img.is_primary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                  <Icon name="Star" size={12} />
                  <span>Primary</span>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">{index+1}</div>
            </div>
          ))}
          {uploading.map((id)=> (
            <div key={id} className="relative bg-muted border border-border rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 animate-spin border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground flex justify-between">
        <span>{images.length} of {maxImages} images</span>
        {images.length>0 && <span>Primary image appears in listings</span>}
      </div>
    </div>
  )
}

export default RaffleImageUpload
