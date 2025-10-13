import React from 'react';
import Icon from '../AppIcon';
import Button from './Button';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = 'info', // 'info', 'warning', 'error', 'success'
  showCloseButton = true,
  actions = null,
  size = 'md' // 'sm', 'md', 'lg', 'xl'
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    info: {
      iconName: 'Info',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    warning: {
      iconName: 'AlertTriangle',
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    error: {
      iconName: 'AlertCircle',
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    success: {
      iconName: 'CheckCircle',
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  };

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const currentType = typeStyles[type];

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-xl ${sizeStyles[size]} w-full animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className={`flex items-start justify-between p-6 ${currentType.bgColor} ${currentType.borderColor} border-b rounded-t-lg`}>
          <div className="flex items-center space-x-3">
            <Icon name={currentType.iconName} size={24} className={currentType.iconColor} />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icon name="X" size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;