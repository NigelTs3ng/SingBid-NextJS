import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';

const Toast = ({ 
  message, 
  type = 'info', // 'info', 'success', 'error', 'warning'
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-success/10',
          border: 'border-success',
          text: 'text-success',
          icon: 'CheckCircle2'
        };
      case 'error':
        return {
          bg: 'bg-error/10',
          border: 'border-error',
          text: 'text-error',
          icon: 'AlertCircle'
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning',
          text: 'text-warning',
          icon: 'AlertTriangle'
        };
      default: // info
        return {
          bg: 'bg-primary/10',
          border: 'border-primary',
          text: 'text-primary',
          icon: 'Info'
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`fixed bottom-6 right-6 max-w-md z-50 animate-in fade-in slide-in-from-bottom-4`}>
      <div className={`${styles.bg} border ${styles.border} rounded-lg p-4 shadow-lg`}>
        <div className="flex items-start gap-3">
          <Icon 
            name={styles.icon} 
            size={20} 
            className={`${styles.text} mt-0.5 flex-shrink-0`} 
          />
          <div className="flex-1">
            <p className={`${styles.text} text-sm font-medium`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              if (onClose) onClose();
            }}
            className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0`}
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
