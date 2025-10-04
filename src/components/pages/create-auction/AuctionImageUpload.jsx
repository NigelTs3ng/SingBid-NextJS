import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const AuctionImageUpload = ({ images, onImagesChange, error }) => {
  const [dragActive, setDragActive] = useState(false);
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
  };

  const handleFiles = (files) => {
    const imageFiles = files?.filter(file => file?.type?.startsWith('image/'));
    const newImages = imageFiles?.map(file => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file?.name
    }));
    
    onImagesChange([...images, ...newImages]?.slice(0, 8)); // Max 8 images
  };

  const removeImage = (imageId) => {
    const updatedImages = images?.filter(img => img?.id !== imageId);
    onImagesChange(updatedImages);
  };

  const reorderImages = (dragIndex, hoverIndex) => {
    const draggedImage = images?.[dragIndex];
    const newImages = [...images];
    newImages?.splice(dragIndex, 1);
    newImages?.splice(hoverIndex, 0, draggedImage);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Auction Images</h3>
        <span className="text-sm text-muted-foreground">{images?.length}/8 images</span>
      </div>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : error 
              ? 'border-error bg-error/5' :'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Icon name="Upload" size={24} className="text-muted-foreground" />
          </div>
          
          <div>
            <p className="text-foreground font-medium">Drop images here or click to upload</p>
            <p className="text-sm text-muted-foreground mt-1">
              Support JPG, PNG, GIF up to 10MB each. Maximum 8 images.
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fileInputRef?.current?.click()}
            iconName="Plus"
            iconPosition="left"
          >
            Choose Files
          </Button>
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
              key={image?.id}
              className="relative group bg-card border border-border rounded-lg overflow-hidden aspect-square"
            >
              <Image
                src={image?.url}
                alt={`Auction image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                  Primary
                </div>
              )}
              
              {/* Remove Button */}
              <button
                onClick={() => removeImage(image?.id)}
                className="absolute top-2 right-2 w-8 h-8 bg-error text-error-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-error/90"
              >
                <Icon name="X" size={16} />
              </button>
              
              {/* Drag Handle */}
              <div className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-move">
                <Icon name="Move" size={16} />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                <p className="text-white text-xs truncate">{image?.name}</p>
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
        </ul>
      </div>
    </div>
  );
};

export default AuctionImageUpload;