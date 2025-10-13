import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AuctionTimingControls = ({ 
  startDate, 
  startTime, 
  duration, 
  onStartDateChange, 
  onStartTimeChange, 
  onDurationChange,
  errors 
}) => {
  const [endDateTime, setEndDateTime] = useState('');
  const [durationType, setDurationType] = useState('days'); // 'minutes', 'hours', 'days'
  const [durationValue, setDurationValue] = useState('');

  // Enhanced duration options with different time units
  const durationOptions = {
    minutes: [
      { value: '5', label: '5 Minutes' },
      { value: '10', label: '10 Minutes' },
      { value: '15', label: '15 Minutes' },
      { value: '30', label: '30 Minutes' },
      { value: '45', label: '45 Minutes' }
    ],
    hours: [
      { value: '1', label: '1 Hour' },
      { value: '2', label: '2 Hours' },
      { value: '3', label: '3 Hours' },
      { value: '6', label: '6 Hours' },
      { value: '12', label: '12 Hours' },
      { value: '18', label: '18 Hours' }
    ],
    days: [
      { value: '1', label: '1 Day' },
      { value: '3', label: '3 Days' },
      { value: '5', label: '5 Days' },
      { value: '7', label: '7 Days' },
      { value: '10', label: '10 Days' },
      { value: '14', label: '14 Days' },
      { value: '21', label: '21 Days' },
      { value: '30', label: '30 Days' }
    ]
  };

  const durationTypeOptions = [
    { value: 'minutes', label: 'Minutes', icon: 'Clock' },
    { value: 'hours', label: 'Hours', icon: 'Clock' },
    { value: 'days', label: 'Days', icon: 'Calendar' }
  ];

  // Convert duration to days for backend compatibility
  const convertToHours = (value, type) => {
    switch (type) {
      case 'minutes':
        return parseFloat(value) / 60;
      case 'hours':
        return parseFloat(value);
      case 'days':
        return parseFloat(value) * 24;
      default:
        return parseFloat(value) * 24;
    }
  };

  // Parse existing duration on component mount
  useEffect(() => {
    if (duration) {
      const hours = parseFloat(duration) * 24; // duration comes in days
      
      if (hours < 1) {
        // Less than 1 hour - show in minutes
        setDurationType('minutes');
        setDurationValue((hours * 60).toString());
      } else if (hours < 24) {
        // Less than 24 hours - show in hours
        setDurationType('hours');
        setDurationValue(hours.toString());
      } else {
        // 24 hours or more - show in days
        setDurationType('days');
        setDurationValue((hours / 24).toString());
      }
    }
  }, []);

  // Handle duration type change
  const handleDurationTypeChange = (newType) => {
    setDurationType(newType);
    setDurationValue('');
    onDurationChange(''); // Clear the duration
  };

  // Handle duration value change
  const handleDurationValueChange = (value) => {
    setDurationValue(value);
    if (value) {
      const hoursTotal = convertToHours(value, durationType);
      const daysTotal = hoursTotal / 24;
      onDurationChange(daysTotal.toString());
    } else {
      onDurationChange('');
    }
  };

  // Calculate end date/time when start date, time, or duration changes
  useEffect(() => {
    if (startDate && startTime && duration) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const durationInMs = parseFloat(duration) * 24 * 60 * 60 * 1000; // duration is in days
      const endDateTime = new Date(startDateTime.getTime() + durationInMs);
      
      const options = {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      setEndDateTime(endDateTime?.toLocaleString('en-SG', options));
    } else {
      setEndDateTime('');
    }
  }, [startDate, startTime, duration]);

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today?.toISOString()?.split('T')?.[0];
  };

  // Get minimum time (current time if today is selected)
  const getMinTime = () => {
    const today = new Date();
    const selectedDate = new Date(startDate);
    
    if (selectedDate?.toDateString() === today?.toDateString()) {
      const hours = today?.getHours()?.toString()?.padStart(2, '0');
      const minutes = Math.ceil(today?.getMinutes() / 15) * 15; // Round up to next 15-minute interval
      return `${hours}:${minutes?.toString()?.padStart(2, '0')}`;
    }
    return '';
  };

  // Get duration recommendations based on type
  const getDurationRecommendations = () => {
    const recommendations = {
      minutes: "Perfect for flash sales, limited items, or urgent listings",
      hours: "Great for same-day auctions with time-sensitive items",
      days: "Ideal for most auctions, allows maximum bidder participation"
    };
    return recommendations[durationType];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Icon name="Clock" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Auction Timing</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e?.target?.value)}
          min={getMinDate()}
          error={errors?.startDate}
          required
          description="When should the auction begin?"
        />

        {/* Start Time */}
        <Input
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e?.target?.value)}
          min={startDate === getMinDate() ? getMinTime() : ''}
          error={errors?.startTime}
          required
          description="Singapore time (SGT)"
        />
      </div>

      {/* Duration Controls */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-foreground">
          Auction Duration *
        </label>
        
        {/* Duration Type Selector */}
        <div className="grid grid-cols-3 gap-2">
          {durationTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleDurationTypeChange(option.value)}
              className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all duration-200 ${
                durationType === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <Icon name={option.icon} size={16} />
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Duration Value Selector */}
        {durationType && (
          <Select
            label={`Duration in ${durationType.charAt(0).toUpperCase() + durationType.slice(1)}`}
            description={getDurationRecommendations()}
            options={durationOptions[durationType]}
            value={durationValue}
            onChange={handleDurationValueChange}
            error={errors?.duration}
            required
            placeholder={`Select ${durationType.slice(0, -1)} count`}
          />
        )}
      </div>

      {/* Calculated End Time Display */}
      {endDateTime && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Calendar" size={16} className="text-primary" />
            <span className="font-medium text-foreground">Auction End Time</span>
          </div>
          <p className="text-foreground font-semibold">{endDateTime}</p>
          <p className="text-sm text-muted-foreground mt-1">Singapore Time (SGT)</p>
          
          {/* Duration Summary */}
          {durationValue && durationType && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Duration: <span className="font-medium text-foreground">
                  {durationValue} {durationType === 'days' && parseInt(durationValue) === 1 ? 'day' : 
                   durationType === 'hours' && parseInt(durationValue) === 1 ? 'hour' :
                   durationType === 'minutes' && parseInt(durationValue) === 1 ? 'minute' : durationType}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Timing Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Timing Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>5-30 minutes:</strong> Flash sales, urgent items, limited quantity</li>
              <li>• <strong>1-12 hours:</strong> Same-day auctions, time-sensitive offers</li>
              <li>• <strong>1-7 days:</strong> Standard auctions, optimal for most items</li>
              <li>• <strong>7+ days:</strong> High-value items, collector pieces</li>
              <li>• Peak bidding hours are typically 7-10 PM SGT</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionTimingControls;