import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PayoutManagement = ({ payouts }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })?.format(new Date(date));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10';
      case 'pending':
        return 'text-warning bg-warning/10';
      case 'disputed':
        return 'text-destructive bg-destructive/10';
      case 'processing':
        return 'text-primary bg-primary/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getCountdownDays = (releaseDate) => {
    const today = new Date();
    const release = new Date(releaseDate);
    const diffTime = release - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Payout Management</h2>
        <Button
          variant="outline"
          size="sm"
          iconName="Download"
          iconPosition="left"
        >
          Export Report
        </Button>
      </div>
      <div className="space-y-4">
        {payouts?.map((payout) => (
          <div key={payout?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-foreground mb-1">{payout?.auction}</h3>
                <p className="text-sm text-muted-foreground">Payout ID: {payout?.id}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout?.status)}`}>
                {payout?.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Gross Amount</p>
                <p className="font-semibold text-foreground">{formatAmount(payout?.grossAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Platform Fee (5%)</p>
                <p className="font-semibold text-error">-{formatAmount(payout?.platformFee)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Net Payout</p>
                <p className="font-semibold text-success">{formatAmount(payout?.netAmount)}</p>
              </div>
            </div>

            {payout?.status === 'pending' && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={16} className="text-warning" />
                  <span className="text-sm font-medium text-warning">
                    Holding Period: {getCountdownDays(payout?.releaseDate)} days remaining
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Funds will be released on {formatDate(payout?.releaseDate)}
                </p>
              </div>
            )}

            {payout?.status === 'disputed' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertTriangle" size={16} className="text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Payout Paused - Dispute Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dispute reason: {payout?.disputeReason}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {payout?.status === 'completed' ? (
                  <span>Paid on {formatDate(payout?.paidDate)}</span>
                ) : (
                  <span>Expected: {formatDate(payout?.releaseDate)}</span>
                )}
              </div>
              <div className="flex space-x-2">
                {payout?.status === 'disputed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="MessageSquare"
                    iconPosition="left"
                  >
                    View Dispute
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="ExternalLink"
                  iconPosition="right"
                  onClick={() => window.location.href = '/auction-details'}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {payouts?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Wallet" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Payouts Yet</h3>
          <p className="text-muted-foreground mb-4">
            Your auction payouts will appear here once transactions are completed.
          </p>
          <Button
            variant="outline"
            iconName="Plus"
            iconPosition="left"
            onClick={() => window.location.href = '/create-auction'}
          >
            Create Your First Auction
          </Button>
        </div>
      )}
    </div>
  );
};

export default PayoutManagement;