import { supabase } from './supabase'

export interface RaffleImage {
  id?: string
  raffle_id: string
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
  image?: RaffleImage
  error?: string
  url?: string
  path?: string
}

export class RaffleImageService {
  // Reuse existing bucket to avoid new infra steps; store under raffles/<id>/
  private static readonly STORAGE_BUCKET = 'auction-images'
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  static async uploadImage(
    file: File,
    raffleId: string,
    _userId: string
  ): Promise<ImageUploadResult> {
    try {
      const validation = this.validateFile(file)
      if (!validation.isValid) return { success: false, error: validation.error }

      const fileExt = file.name.split('.').pop()
      const fileName = `raffles/${raffleId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        return { success: false, error: 'Failed to upload image' }
      }

      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) return { success: false, error: 'Failed to get image URL' }

      const dimensions = await this.getImageDimensions(file)

      return {
        success: true,
        url: urlData.publicUrl,
        path: fileName,
        image: {
          raffle_id: raffleId,
          image_url: urlData.publicUrl,
          image_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          width: dimensions.width,
          height: dimensions.height,
        }
      }
    } catch (e) {
      console.error('Raffle image upload error:', e)
      return { success: false, error: 'Failed to upload image' }
    }
  }

  static async saveImageMetadata(imageData: RaffleImage): Promise<{ success: boolean; image?: RaffleImage & { id: string }; error?: string }>{
    try {
      const { data, error } = await supabase
        .from('raffle_images')
        .insert(imageData)
        .select()
        .single()
      if (error) {
        console.error('Raffle image DB save error:', error)
        return { success: false, error: 'Failed to save raffle image' }
      }
      return { success: true, image: data }
    } catch (e) {
      console.error('Raffle metadata save error:', e)
      return { success: false, error: 'Failed to save raffle image' }
    }
  }

  static async deleteImage(imageId: string): Promise<{ success: boolean; error?: string }>{
    try {
      const { data: row, error: getErr } = await supabase
        .from('raffle_images')
        .select('image_path')
        .eq('id', imageId)
        .single()
      if (getErr) return { success: false, error: 'Image not found' }
      if (row?.image_path) {
        await supabase.storage.from(this.STORAGE_BUCKET).remove([row.image_path])
      }
      const { error } = await supabase.from('raffle_images').delete().eq('id', imageId)
      if (error) return { success: false, error: 'Failed to delete image' }
      return { success: true }
    } catch (e) {
      console.error('Raffle image delete error:', e)
      return { success: false, error: 'Failed to delete image' }
    }
  }

  private static validateFile(file: File): { isValid: boolean; error?: string } {
    if (!file) return { isValid: false, error: 'No file provided' }
    if (file.size > this.MAX_FILE_SIZE) return { isValid: false, error: 'Max 5MB allowed' }
    if (!this.ALLOWED_TYPES.includes(file.type)) return { isValid: false, error: 'Invalid file type' }
    return { isValid: true }
  }

  private static getImageDimensions(file: File): Promise<{ width: number; height: number }>{
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }) }
      img.src = url
    })
  }
}

export default RaffleImageService
