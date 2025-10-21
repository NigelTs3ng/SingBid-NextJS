import { supabase } from './supabase'

export interface AuctionImage {
  id?: string
  auction_id: string
  image_url: string
  image_path?: string | null
  display_order?: number
  is_primary?: boolean
  alt_text?: string | null
  file_size?: number | null
  mime_type?: string | null
  width?: number | null
  height?: number | null
}

export interface ImageUploadResult {
  success: boolean
  image?: AuctionImage
  error?: string
  url?: string
  path?: string
}

export class ImageService {
  private static readonly STORAGE_BUCKET = 'auction-images'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  // Upload image to Supabase storage
  static async uploadImage(
    file: File,
    auctionId: string,
    userId: string
  ): Promise<ImageUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${auctionId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return { success: false, error: 'Failed to upload image' }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        return { success: false, error: 'Failed to get image URL' }
      }

      // Get image dimensions
      const dimensions = await this.getImageDimensions(file)

      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        image: {
          auction_id: auctionId,
          image_url: urlData.publicUrl,
          image_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          width: dimensions.width,
          height: dimensions.height,
        }
      }
    } catch (error) {
      console.error('Image upload error:', error)
      return { success: false, error: 'Failed to upload image' }
    }
  }

  // Save image metadata to database
  static async saveImageMetadata(imageData: AuctionImage): Promise<{
    success: boolean
    image?: AuctionImage & { id: string }
    error?: string
  }> {
    try {
      const { data, error } = await supabase
        .from('auction_images')
        .insert(imageData)
        .select()
        .single()

      if (error) {
        console.error('Database save error:', error)
        return { success: false, error: 'Failed to save image data' }
      }

      return { success: true, image: data }
    } catch (error) {
      console.error('Image metadata save error:', error)
      return { success: false, error: 'Failed to save image data' }
    }
  }

  // Get images for an auction
  static async getAuctionImages(auctionId: string): Promise<AuctionImage[]> {
    try {
      const { data, error } = await supabase
        .from('auction_images')
        .select('*')
        .eq('auction_id', auctionId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching auction images:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching auction images:', error)
      return []
    }
  }

  // Update image metadata
  static async updateImage(
    imageId: string, 
    updates: Partial<AuctionImage>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('auction_images')
        .update(updates)
        .eq('id', imageId)

      if (error) {
        console.error('Error updating image:', error)
        return { success: false, error: 'Failed to update image' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating image:', error)
      return { success: false, error: 'Failed to update image' }
    }
  }

  // Delete image
  static async deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get image path for storage deletion
      const { data: imageData, error: fetchError } = await supabase
        .from('auction_images')
        .select('image_path')
        .eq('id', imageId)
        .single()

      if (fetchError) {
        console.error('Error fetching image data:', fetchError)
        return { success: false, error: 'Image not found' }
      }

      // Delete from storage if path exists
      if (imageData.image_path) {
        const { error: storageError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([imageData.image_path])

        if (storageError) {
          console.error('Storage deletion error:', storageError)
          // Continue with database deletion even if storage fails
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('auction_images')
        .delete()
        .eq('id', imageId)

      if (dbError) {
        console.error('Database deletion error:', dbError)
        return { success: false, error: 'Failed to delete image' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting image:', error)
      return { success: false, error: 'Failed to delete image' }
    }
  }

  // Set primary image
  static async setPrimaryImage(
    imageId: string, 
    auctionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First unset all primary images for this auction
      await supabase
        .from('auction_images')
        .update({ is_primary: false })
        .eq('auction_id', auctionId)

      // Then set the new primary image
      const { error } = await supabase
        .from('auction_images')
        .update({ is_primary: true })
        .eq('id', imageId)

      if (error) {
        console.error('Error setting primary image:', error)
        return { success: false, error: 'Failed to set primary image' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error setting primary image:', error)
      return { success: false, error: 'Failed to set primary image' }
    }
  }

  // Reorder images
  static async reorderImages(
    imageUpdates: { id: string; display_order: number }[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updatePromises = imageUpdates.map(({ id, display_order }) =>
        supabase
          .from('auction_images')
          .update({ display_order })
          .eq('id', id)
      )

      const results = await Promise.all(updatePromises)
      const hasError = results.some(result => result.error)

      if (hasError) {
        return { success: false, error: 'Failed to reorder images' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error reordering images:', error)
      return { success: false, error: 'Failed to reorder images' }
    }
  }

  // Validate file
  private static validateFile(file: File): { isValid: boolean; error?: string } {
    if (!file) {
      return { isValid: false, error: 'No file provided' }
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size too large. Maximum 5MB allowed.' }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }
    }

    return { isValid: true }
  }

  // Get image dimensions
  private static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve({ width: 0, height: 0 })
      }
      
      img.src = objectUrl
    })
  }

  // Generate optimized image URL (for future use with image transformations)
  static getOptimizedImageUrl(
    imageUrl: string,
    options: {
      width?: number
      height?: number
      quality?: number
      format?: 'webp' | 'jpeg' | 'png'
    } = {}
  ): string {
    // For now, return original URL
    // In production, you might want to use Supabase's image transformations
    // or integrate with a service like Cloudinary or ImageKit
    return imageUrl
  }
}

export default ImageService