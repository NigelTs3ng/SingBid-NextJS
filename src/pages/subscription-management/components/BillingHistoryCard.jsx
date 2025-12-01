import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BillingHistoryCard = () => {
  const [showAll, setShowAll] = useState(false);

  const billingHistory = [
    {
      id: 'inv_001',
      date: '2024-09-01',
      amount: 19.99,
      status: 'paid',
      description: 'Premium Subscription - September 2024',
      invoiceUrl: '#'
    },
    {
      id: 'inv_002',
      date: '2024-08-01',
      amount: 19.99,
      status: 'paid',
      description: 'Premium Subscription - August 2024',
      invoiceUrl: '#'
    },
    {
      id: 'inv_003',
      date: '2024-07-01',
      amount: 19.99,
      status: 'paid',
      description: 'Premium Subscription - July 2024',
      invoiceUrl: '#'
    },
    {
      id: 'inv_004',
      date: '2024-06-01',
      amount: 19.99,
      status: 'failed',
      description: 'Premium Subscription - June 2024',
      invoiceUrl: '#'
    },
    {
      id: 'inv_005',
      date: '2024-05-01',
      amount: 19.99,
      status: 'paid',
      description: 'Premium Subscription - May 2024',
      invoiceUrl: '#'
    }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-SG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-success bg-success/10 border-success/20';
      case 'failed':
        return 'text-error bg-error/10 border-error/20';
      case 'pending':
        return 'text-warning bg-warning/10 border-warning/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-border';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return 'CheckCircle';
      case 'failed':
        return 'XCircle';
      case 'pending':
        return 'Clock';
      default:
        return 'Circle';
    }
  };

  const displayedHistory = showAll ? billingHistory : billingHistory?.slice(0, 3);

  const handleDownloadInvoice = (invoice) => {
    // Mock download functionality
    console.log(`Downloading invoice ${invoice?.id}`);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Billing History</h2>
          <p className="text-muted-foreground">View and download your past invoices</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          iconName="Download"
          iconPosition="left"
          onClick={() => console.log('Download all invoices')}
        >
          Download All
        </Button>
      </div>
      {billingHistory?.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="Receipt" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No billing history</h3>
          <p className="text-muted-foreground">Your billing history will appear here once you have transactions</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {displayedHistory?.map((invoice) => (
              <div key={invoice?.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Icon name="Receipt" size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{invoice?.description}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(invoice?.date)}
                      </span>
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice?.status)}`}>
                        <Icon name={getStatusIcon(invoice?.status)} size={12} />
                        <span className="capitalize">{invoice?.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold text-foreground">${invoice?.amount?.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">USD</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Download"
                    onClick={() => handleDownloadInvoice(invoice)}
                    disabled={invoice?.status === 'failed'}
                  />
                </div>
              </div>
            ))}
          </div>

          {billingHistory?.length > 3 && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAll(!showAll)}
                iconName={showAll ? "ChevronUp" : "ChevronDown"}
                iconPosition="right"
              >
                {showAll ? 'Show Less' : `Show ${billingHistory?.length - 3} More`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillingHistoryCard;