import React, { useState } from 'react';
import Button from './ui/Button';
import Icon from './AppIcon';

const SellerAuctionActions = ({ auction, currentUser, onAuctionUpdated }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if current user is the seller
  const isOwner = currentUser && auction && (
    currentUser.id === auction.seller_id || 
    currentUser.id === auction.seller?.id
  );

  // Don't show actions if not the owner
  if (!isOwner) return null;

  // Check if auction can be edited (no bids and hasn't started)
  const canEdit = !auction.has_bids && new Date() < new Date(auction.start_time);
  
  // Auction can always be deleted (but with proper bid handling)
  const canDelete = true;

  const handleEdit = () => {
    // Navigate to edit page or open edit modal
    window.location.href = `/edit-auction/${auction.id}`;
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/auctions/${auction.id}/manage`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete auction');
      }

      // Success
      alert(result.message || 'Auction deleted successfully');
      
      // Notify parent component or redirect
      if (onAuctionUpdated) {
        onAuctionUpdated('deleted', auction.id);
      } else {
        // Redirect to seller dashboard
        window.location.href = '/dashboard/seller';
      }

    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete auction: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getBidInfo = () => {
    if (auction.total_bids > 0) {
      return `${auction.total_bids} bid(s) placed`;
    }
    return 'No bids yet';
  };

  const getAuctionStatus = () => {
    const now = new Date();
    const startTime = new Date(auction.start_time);
    const endTime = new Date(auction.end_time);

    if (now < startTime) return 'Not started';
    if (now >= startTime && now < endTime) return 'Active';
    return 'Ended';
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Icon name="Settings" size={16} className="text-blue-600" />
        <h3 className="font-medium text-blue-900">Auction Management</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-blue-700 font-medium">Status:</span>
          <span className="ml-2 text-blue-800">{getAuctionStatus()}</span>
        </div>
        <div>
          <span className="text-blue-700 font-medium">Bids:</span>
          <span className="ml-2 text-blue-800">{getBidInfo()}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        {canEdit ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            iconName="Edit"
            iconPosition="left"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            Edit Auction
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            iconName="Lock"
            iconPosition="left"
            className="border-gray-300 text-gray-500"
            title="Cannot edit auction with bids or that has started"
          >
            Edit Locked
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteClick}
          iconName="Trash2"
          iconPosition="left"
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          Delete Auction
        </Button>
      </div>

      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Icon name="Info" size={16} className="text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">Edit Restrictions:</p>
              <p>• Cannot edit auctions with bids</p>
              <p>• Cannot edit auctions that have started</p>
              <p>• Deletion will cancel all bids and refund bidders</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Icon name="AlertTriangle" size={20} className="text-red-500" />
              <h3 className="text-lg font-semibold text-foreground">Delete Auction</h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-slate-700">
                Are you sure you want to delete this auction?
              </p>
              
              {auction.total_bids > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This auction has {auction.total_bids} bid(s). 
                    Deleting will:
                  </p>
                  <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside">
                    <li>Cancel all payment authorizations</li>
                    <li>Refund all bidders immediately</li>
                    <li>Remove the auction permanently</li>
                  </ul>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  loading={isDeleting}
                  fullWidth
                  iconName="Trash2"
                  iconPosition="left"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Auction'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerAuctionActions;