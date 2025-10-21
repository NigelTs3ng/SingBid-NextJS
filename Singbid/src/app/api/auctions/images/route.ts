import { NextRequest, NextResponse } from 'next/server'
import ImageService from '@/lib/imageService'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const auctionId = formData.get('auctionId') as string
    const userId = formData.get('userId') as string

    if (!file || !auctionId || !userId) {
      return NextResponse.json(
        { error: 'File, auction ID, and user ID are required' },
        { status: 400 }
      )
    }

    // Upload image to storage
    const uploadResult = await ImageService.uploadImage(file, auctionId, userId)

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      )
    }

    // Save image metadata to database if we have the image data
    if (uploadResult.image) {
      const saveResult = await ImageService.saveImageMetadata(uploadResult.image)
      
      if (saveResult.success) {
        return NextResponse.json({
          success: true,
          image: saveResult.image
        })
      }
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')

    if (!auctionId) {
      return NextResponse.json(
        { error: 'Auction ID is required' },
        { status: 400 }
      )
    }

    const images = await ImageService.getAuctionImages(auctionId)

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error fetching auction images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    const result = await ImageService.deleteImage(imageId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageId, updates } = body

    if (!imageId || !updates) {
      return NextResponse.json(
        { error: 'Image ID and updates are required' },
        { status: 400 }
      )
    }

    const result = await ImageService.updateImage(imageId, updates)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating image:', error)
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    )
  }
}