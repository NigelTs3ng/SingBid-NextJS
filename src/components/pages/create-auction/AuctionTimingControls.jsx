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

  const durationOptions = [
    { value: '1', label: '1 Day' },
    { value: '3', label: '3 Days' },
    { value: '5', label: '5 Days' },
    { value: '7', label: '7 Days' },
    { value: '10', label: '10 Days' },
    { value: '14', label: '14 Days' },
    { value: '21', label: '21 Days' },
    { value: '30', label: '30 Days' }
  ];

  // Calculate end date/time when start date, time, or duration changes
  useEffect(() => {
    if (startDate && startTime && duration) {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + (parseInt(duration) * 24 * 60 * 60 * 1000));
      
      const options = {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      setEndDateTime(endDateTime?.toLocaleString('en-US', options));
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
      {/* Duration */}
      <Select
        label="Auction Duration"
        description="How long should the auction run?"
        options={durationOptions}
        value={duration}
        onChange={onDurationChange}
        error={errors?.duration}
        required
        placeholder="Select duration"
      />
      {/* Calculated End Time Display */}
      {endDateTime && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Calendar" size={16} className="text-primary" />
            <span className="font-medium text-foreground">Auction End Time</span>
          </div>
          <p className="text-foreground font-semibold">{endDateTime}</p>
          <p className="text-sm text-muted-foreground mt-1">Singapore Time (SGT)</p>
        </div>
      )}
      {/* Timing Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Timing Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Auctions can start immediately or be scheduled for later</li>
              <li>• Peak bidding hours are typically 7-10 PM SGT</li>
              <li>• Weekend auctions often receive more attention</li>
              <li>• Consider your target audience's availability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionTimingControls;