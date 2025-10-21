import React, { useState } from 'react';
import Icon from '../../AppIcon';

const ExpandableSection = ({ title, children, defaultExpanded = false, icon }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors duration-200"
      >
        <div className="flex items-center space-x-2">
          {icon && <Icon name={icon} size={20} className="text-muted-foreground" />}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <Icon
          name="ChevronDown"
          size={20}
          className={`text-muted-foreground transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      
      {isExpanded && (
        <div className="border-t border-border p-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

export default ExpandableSection;