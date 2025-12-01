import React, { useState, useEffect } from 'react';
import Image from '../../../../components/AppImage';
import Icon from '../../../../components/AppIcon';

const BidHistory = ({ auctionId, initialBids = [] }) => {
  const [bids, setBids] = useState(initialBids);
  const [isLoading, setIsLoading] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(price);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    return date?.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Simulate real-time bid updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real app, this would be a Supabase Realtime subscription
      // For now, we'll simulate occasional new bids
      if (Math.random() > 0.95) {
        const newBid = {
          id: Date.now(),
          bidder: {
            username: `bidder_${Math.floor(Math.random() * 1000)}`,
            avatar: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 50)}.jpg`,
            isVerified: Math.random() > 0.5
          },
          amount: (bids?.[0]?.amount || 100) + Math.floor(Math.random() * 50) + 1,
          timestamp: new Date()?.toISOString(),
          isNew: true
        };
        
        setBids(prev => [newBid, ...prev]);
        
        // Remove the "new" flag after animation
        setTimeout(() => {
          setBids(prev => prev?.map(bid => 
            bid?.id === newBid?.id ? { ...bid, isNew: false } : bid
          ));
        }, 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [bids]);

  const getBidStatus = (bid, index) => {
    if (index === 0) return 'highest';
    if (index < 3) return 'recent';
    return 'normal';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'highest': return 'text-success';
      case 'recent': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'highest': return 'Crown';
      case 'recent': return 'TrendingUp';
      default: return 'User';
    }
  };

  if (bids?.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center">
          <Icon name="MessageSquare" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Bids Yet</h3>
          <p className="text-muted-foreground">Be the first to place a bid on this auction!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Icon name="Activity" size={20} />
            <span>Bid History</span>
          </h3>
          <span className="text-sm text-muted-foreground">{bids?.length} bids</span>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Loading bid history...</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {bids?.map((bid, index) => {
              const status = getBidStatus(bid, index);
              return (
                <div
                  key={bid?.id}
                  className={`p-4 transition-all duration-500 ${
                    bid?.isNew ? 'bg-success/10 animate-pulse' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Image
                          src={bid?.bidder?.avatar}
                          alt={bid?.bidder?.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {bid?.bidder?.isVerified && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                            <Icon name="Check" size={10} color="white" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground">
                            {bid?.bidder?.username}
                          </span>
                          {status === 'highest' && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-success/10 rounded-full">
                              <Icon name="Crown" size={12} className="text-success" />
                              <span className="text-xs font-medium text-success">Highest</span>
                            </div>
                          )}
                          {bid?.isNew && (
                            <div className="px-2 py-1 bg-accent/10 rounded-full">
                              <span className="text-xs font-medium text-accent">New</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Icon name={getStatusIcon(status)} size={12} className={getStatusColor(status)} />
                          <span>{formatTime(bid?.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        status === 'highest' ? 'text-success' : 'text-foreground'
                      }`}>
                        {formatPrice(bid?.amount)}
                      </div>
                      {bid?.isAutoBid && (
                        <div className="text-xs text-muted-foreground flex items-center space-x-1">
                          <Icon name="Zap" size={10} />
                          <span>Auto Bid</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {bids?.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {Math.min(bids?.length, 10)} of {bids?.length} bids
            </span>
            {bids?.length > 10 && (
              <button className="text-primary hover:text-primary/80 font-medium">
                View All Bids
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BidHistory;