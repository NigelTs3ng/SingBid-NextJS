import React, { useState } from 'react';
import Image from '../../AppImage';
import Button from '../../ui/Button';
import Icon from '../../AppIcon';

const SellerInfo = ({ seller, onFollow, isFollowing }) => {
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleFollow = async () => {
    setIsFollowLoading(true);
    try {
      await onFollow(seller?.id);
    } catch (error) {
      console.error('Failed to follow/unfollow seller:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars?.push(
        <Icon key={i} name="Star" size={16} className="text-warning fill-current" />
      );
    }

    if (hasHalfStar) {
      stars?.push(
        <Icon key="half" name="StarHalf" size={16} className="text-warning fill-current" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars?.push(
        <Icon key={`empty-${i}`} name="Star" size={16} className="text-muted-foreground" />
      );
    }

    return stars;
  };

  // Add null safety check for seller
  if (!seller) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Loading seller information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      {/* Seller Profile */}
      <div className="flex items-start space-x-4">
        <div className="relative">
          <Image
            src={seller?.avatar}
            alt={seller?.username}
            className="w-16 h-16 rounded-full object-cover"
          />
          {seller?.isVerified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center border-2 border-card">
              <Icon name="Check" size={12} color="white" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{seller?.username}</h3>
            {seller?.isPremium && (
              <div className="px-2 py-1 bg-accent/10 rounded-full">
                <span className="text-xs font-medium text-accent">Premium</span>
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex items-center space-x-1">
              {renderStars(seller?.rating || 0)}
            </div>
            <span className="text-sm font-medium text-foreground">{seller?.rating?.toFixed(1) || '0.0'}</span>
            <span className="text-sm text-muted-foreground">({seller?.totalReviews || 0} reviews)</span>
          </div>

          {/* Member Since */}
          <p className="text-sm text-muted-foreground">
            Member since {seller?.memberSince ? new Date(seller.memberSince)?.toLocaleDateString('en-SG', {
              month: 'long',
              year: 'numeric'
            }) : 'Unknown'}
          </p>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-muted rounded-lg p-3">
          <div className="text-lg font-bold text-foreground">{seller?.totalAuctions}</div>
          <div className="text-xs text-muted-foreground">Auctions</div>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <div className="text-lg font-bold text-foreground">{seller?.followers}</div>
          <div className="text-xs text-muted-foreground">Followers</div>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <div className="text-lg font-bold text-foreground">{seller?.successRate}%</div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
        </div>
      </div>
      {/* Badges */}
      {seller?.badges && seller?.badges?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Achievements</h4>
          <div className="flex flex-wrap gap-2">
            {seller?.badges?.map((badge, index) => (
              <div
                key={index}
                className="flex items-center space-x-1 px-2 py-1 bg-accent/10 rounded-full"
              >
                <Icon name={badge?.icon} size={12} className="text-accent" />
                <span className="text-xs font-medium text-accent">{badge?.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Bio */}
      {seller?.bio && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">About</h4>
          <p className="text-sm text-muted-foreground">{seller?.bio}</p>
        </div>
      )}
      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant={isFollowing ? "outline" : "default"}
          fullWidth
          loading={isFollowLoading}
          onClick={handleFollow}
          iconName={isFollowing ? "UserMinus" : "UserPlus"}
          iconPosition="left"
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/seller/${seller?.id}`}
            iconName="User"
            iconPosition="left"
          >
            View Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/messages/new?to=${seller?.id}`}
            iconName="MessageCircle"
            iconPosition="left"
          >
            Message
          </Button>
        </div>
      </div>
      {/* Trust Indicators */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Trust & Safety</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Icon 
              name={seller?.isVerified ? "CheckCircle" : "AlertCircle"} 
              size={16} 
              className={seller?.isVerified ? "text-success" : "text-warning"} 
            />
            <span className="text-sm text-muted-foreground">
              {seller?.isVerified ? 'Identity Verified' : 'Identity Not Verified'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon 
              name={seller?.isKYCVerified ? "Shield" : "ShieldAlert"} 
              size={16} 
              className={seller?.isKYCVerified ? "text-success" : "text-warning"} 
            />
            <span className="text-sm text-muted-foreground">
              {seller?.isKYCVerified ? 'KYC Verified' : 'KYC Pending'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Icon name="CreditCard" size={16} className="text-success" />
            <span className="text-sm text-muted-foreground">Payment Method Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerInfo;