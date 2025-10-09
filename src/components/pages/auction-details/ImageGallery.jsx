import React, { useState } from 'react';
import Image from '../../AppImage';
import Icon from '../../AppIcon';

const ImageGallery = ({ images, title }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Ensure we have a valid images array
  const validImages = Array.isArray(images) && images.length > 0 
    ? images 
    : ["https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=300&fit=crop"];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % validImages?.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + validImages?.length) % validImages?.length);
  };

  const selectImage = (index) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative bg-card rounded-lg overflow-hidden border border-border">
        <div 
          className={`relative ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <Image
            src={validImages?.[currentImageIndex]}
            alt={`${title} - Image ${currentImageIndex + 1}`}
            className={`w-full transition-transform duration-300 ${
              isZoomed ? 'scale-150 transform-gpu' : 'scale-100'
            }`}
            style={{ height: '400px', objectFit: 'cover' }}
          />
          
          {/* Navigation Arrows */}
          {validImages?.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e?.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Icon name="ChevronLeft" size={20} />
              </button>
              <button
                onClick={(e) => {
                  e?.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all duration-200"
              >
                <Icon name="ChevronRight" size={20} />
              </button>
            </>
          )}

          {/* Image Counter */}
          {validImages?.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {currentImageIndex + 1} / {validImages?.length}
            </div>
          )}

          {/* Zoom Indicator */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full">
            <Icon name={isZoomed ? "ZoomOut" : "ZoomIn"} size={16} />
          </div>
        </div>
      </div>
      {/* Thumbnail Gallery */}
      {validImages?.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {validImages?.map((image, index) => (
            <button
              key={index}
              onClick={() => selectImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                index === currentImageIndex
                  ? 'border-primary shadow-md'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Image
                src={image}
                alt={`${title} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;