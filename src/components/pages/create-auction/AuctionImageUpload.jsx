import React, { useState, useRef, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import ImageService from '../../../lib/imageService';

const AuctionImageUpload = ({ 
  images, 
  onImagesChange, 
  error, 
  auctionId = 'temp',
  disabled = false,
  maxImages = 8 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(new Set());
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (e?.type === "dragenter" || e?.type === "dragover") {
      setDragActive(true);
    } else if (e?.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e?.dataTransfer?.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e?.target?.files);
    handleFiles(files);
    // Reset input value to allow selecting the same file again
    if (e.target) e.target.value = '';
  };

  const handleFiles = useCallback(async (files) => {
    if (!files?.length || disabled) return;

    const imageFiles = files.filter(file => file?.type?.startsWith('image/'));
    const remainingSlots = maxImages - images.length;
    const filesToUpload = imageFiles.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Create temporary image objects for immediate preview
    const tempImages = filesToUpload.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      uploading: true,
      display_order: images.length + index,
      is_primary: images.length === 0 && index === 0
    }));

    // Add temp images to state immediately for preview
    onImagesChange([...images, ...tempImages]);

    // Upload files to storage
    try {
      const uploadPromises = filesToUpload.map(async (file, index) => {
        const tempId = `temp-${Date.now()}-${index}`;
        setUploading(prev => new Set(prev).add(tempId));

        try {
          const result = await ImageService.uploadImage(file, auctionId, 'temp-user');
          
          if (result.success && result.image) {
            return {
              ...result.image,
              id: tempId, // Keep temp ID for now
              url: result.url,
              name: file.name,
              uploading: false,
              display_order: images.length + index,
              is_primary: images.length === 0 && index === 0,
              alt_text: file.name.split('.')[0]
            };
          }
          throw new Error(result.error || 'Upload failed');
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          return {
            id: tempId,
            error: true,
            name: file.name,
            uploading: false
          };
        } finally {
          setUploading(prev => {
            const newSet = new Set(prev);
            newSet.delete(tempId);
            return newSet;
          });
        }
      });

      const uploadResults = await Promise.all(uploadPromises);
      
      // Update images with upload results
      const updatedImages = images.concat(
        uploadResults.map((result, index) => {
          const tempImage = tempImages[index];
          if (result.error) {
            return { ...tempImage, error: true, uploading: false };
          }
          // Clean up object URL
          URL.revokeObjectURL(tempImage.url);
          return result;
        })
      );

      onImagesChange(updatedImages);

      // Show error message if some uploads failed
      const failedUploads = uploadResults.filter(result => result.error);
      if (failedUploads.length > 0) {
        alert(`${failedUploads.length} image(s) failed to upload. Please try again.`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Remove temp images on error
      onImagesChange(images);
    }
  }, [images, auctionId, maxImages, disabled, onImagesChange]);

  const removeImage = useCallback(async (imageIndex) => {
    if (disabled) return;

    const imageToRemove = images[imageIndex];
    const updatedImages = images.filter((_, index) => index !== imageIndex);
    
    // Reorder remaining images and update primary
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      display_order: index,
      is_primary: index === 0
    }));

    onImagesChange(reorderedImages);

    // Clean up object URL if it exists
    if (imageToRemove.url && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    // Delete from storage if it has a real ID (not temp)
    if (imageToRemove.id && !imageToRemove.id.startsWith('temp-') && imageToRemove.image_path) {
      try {
        await ImageService.deleteImage(imageToRemove.id);
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
      }
    }
  }, [images, disabled, onImagesChange]);

  const setPrimaryImage = useCallback((index) => {
    if (disabled) return;

    const updatedImages = images.map((img, idx) => ({
      ...img,
      is_primary: idx === index
    }));

    onImagesChange(updatedImages);
  }, [images, disabled, onImagesChange]);

  const reorderImages = useCallback((dragIndex, hoverIndex) => {
    if (disabled || dragIndex === hoverIndex) return;

    const newImages = [...images];
    const [draggedImage] = newImages.splice(dragIndex, 1);
    newImages.splice(hoverIndex, 0, draggedImage);
    
    // Update display order
    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      display_order: index
    }));

    onImagesChange(reorderedImages);
  }, [images, disabled, onImagesChange]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Auction Images</h3>
        <span className="text-sm text-muted-foreground">
          {images?.length}/{maxImages} images
        </span>
      </div>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : error 
              ? 'border-error bg-error/5' 
              : disabled
                ? 'border-muted bg-muted/20 opacity-50 cursor-not-allowed'
                : 'border-border hover:border-primary/50 cursor-pointer'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef?.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Icon name="Upload" size={24} className="text-muted-foreground" />
          </div>
          
          <div>
            <p className="text-foreground font-medium">
              {disabled ? 'Image upload disabled' : 'Drop images here or click to upload'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Support JPEG, PNG, WebP up to 5MB each. Maximum {maxImages} images.
            </p>
          </div>
          
          {!disabled && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef?.current?.click();
              }}
              iconName="Plus"
              iconPosition="left"
            >
              Choose Files
            </Button>
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-error flex items-center space-x-2">
          <Icon name="AlertCircle" size={16} />
          <span>{error}</span>
        </p>
      )}
      
      {/* Image Preview Grid */}
      {images?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images?.map((image, index) => (
            <div
              key={image?.id || index}
              className="relative group bg-card border border-border rounded-lg overflow-hidden aspect-square"
            >
              {/* Image */}
              <Image
                src={image?.url || image?.image_url}
                alt={image?.alt_text || `Auction image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Loading Overlay */}
              {image.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Icon name="Loader2" size={24} className="animate-spin mx-auto mb-2" />
                    <p className="text-sm">Uploading...</p>
                  </div>
                </div>
              )}
              
              {/* Error Overlay */}
              {image.error && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Icon name="AlertCircle" size={24} className="mx-auto mb-2" />
                    <p className="text-sm">Upload Failed</p>
                  </div>
                </div>
              )}
              
              {/* Primary Badge */}
              {image.is_primary && !image.uploading && !image.error && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium flex items-center space-x-1">
                  <Icon name="Star" size={12} />
                  <span>Primary</span>
                </div>
              )}
              
              {/* Controls */}
              {!image.uploading && !disabled && (
                <>
                  {/* Set Primary Button */}
                  {!image.is_primary && !image.error && (
                    <button
                      onClick={() => setPrimaryImage(index)}
                      className="absolute top-2 left-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
                      title="Set as primary image"
                    >
                      <Icon name="Star" size={14} />
                    </button>
                  )}
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-8 h-8 bg-error text-error-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-error/90"
                    title="Remove image"
                  >
                    <Icon name="X" size={16} />
                  </button>
                  
                  {/* Drag Handle */}
                  <div 
                    className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-move"
                    title="Drag to reorder"
                  >
                    <Icon name="Move" size={16} />
                  </div>
                </>
              )}
              
              {/* Image Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-white text-xs truncate">{image?.name}</p>
                {image?.file_size && (
                  <p className="text-white/70 text-xs">
                    {(image.file_size / 1024 / 1024).toFixed(1)}MB
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-2 flex items-center space-x-2">
          <Icon name="Lightbulb" size={16} />
          <span>Image Tips</span>
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• First image will be used as the main auction thumbnail</li>
          <li>• Use high-quality images with good lighting</li>
          <li>• Show different angles and important details</li>
          <li>• Avoid watermarks or text overlays</li>
          <li>• Click the star icon to set a different primary image</li>
        </ul>
      </div>
    </div>
  );
};

export default AuctionImageUpload;