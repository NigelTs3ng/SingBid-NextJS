import React, { useState, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';

const CountdownTimer = ({ endTime, status }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()?.getTime();
      const end = new Date(endTime)?.getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const getStatusColor = () => {
    if (status === 'ended' || isExpired) return 'text-muted-foreground';
    if (timeLeft?.days === 0 && timeLeft?.hours < 1) return 'text-error';
    if (timeLeft?.days === 0 && timeLeft?.hours < 24) return 'text-warning';
    return 'text-success';
  };

  const getStatusBg = () => {
    if (status === 'ended' || isExpired) return 'bg-muted';
    if (timeLeft?.days === 0 && timeLeft?.hours < 1) return 'bg-error/10';
    if (timeLeft?.days === 0 && timeLeft?.hours < 24) return 'bg-warning/10';
    return 'bg-success/10';
  };

  const formatTime = (time) => {
    return time?.toString()?.padStart(2, '0');
  };

  if (status === 'ended' || isExpired) {
    return (
      <div className="bg-muted border border-border rounded-lg p-6 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Icon name="Clock" size={24} className="text-muted-foreground" />
          <h3 className="text-xl font-bold text-muted-foreground">Auction Ended</h3>
        </div>
        <p className="text-muted-foreground">This auction has concluded</p>
      </div>
    );
  }

  return (
    <div className={`${getStatusBg()} border border-border rounded-lg p-6`}>
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Icon name="Clock" size={20} className={getStatusColor()} />
          <h3 className="text-lg font-semibold">Time Remaining</h3>
        </div>
        {timeLeft?.days === 0 && timeLeft?.hours < 1 && (
          <p className="text-sm text-error font-medium">Ending Soon!</p>
        )}
      </div>
      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatTime(timeLeft?.days)}
          </div>
          <div className="text-xs text-muted-foreground font-medium">DAYS</div>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatTime(timeLeft?.hours)}
          </div>
          <div className="text-xs text-muted-foreground font-medium">HOURS</div>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatTime(timeLeft?.minutes)}
          </div>
          <div className="text-xs text-muted-foreground font-medium">MINS</div>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border">
          <div className={`text-2xl font-bold ${getStatusColor()}`}>
            {formatTime(timeLeft?.seconds)}
          </div>
          <div className="text-xs text-muted-foreground font-medium">SECS</div>
        </div>
      </div>
      {timeLeft?.days === 0 && timeLeft?.hours < 1 && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-center space-x-2 text-error">
            <Icon name="AlertTriangle" size={16} />
            <span className="text-sm font-medium">Auction ending in less than 1 hour!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;