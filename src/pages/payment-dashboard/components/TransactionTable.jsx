import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TransactionTable = ({ transactions, onSort, sortConfig }) => {
  const [expandedRow, setExpandedRow] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10';
      case 'pending':
        return 'text-warning bg-warning/10';
      case 'failed':
        return 'text-error bg-error/10';
      case 'disputed':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })?.format(new Date(date));
  };

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return <Icon name="ArrowUpDown" size={16} className="text-muted-foreground" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={16} className="text-primary" />
      : <Icon name="ArrowDown" size={16} className="text-primary" />;
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-4">
                <button
                  onClick={() => onSort('auction')}
                  className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>Auction</span>
                  {getSortIcon('auction')}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => onSort('amount')}
                  className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>Amount</span>
                  {getSortIcon('amount')}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => onSort('status')}
                  className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>Status</span>
                  {getSortIcon('status')}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => onSort('date')}
                  className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>Date</span>
                  {getSortIcon('date')}
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => onSort('payout')}
                  className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-colors"
                >
                  <span>Payout</span>
                  {getSortIcon('payout')}
                </button>
              </th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((transaction) => (
              <tr key={transaction?.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div>
                    <div className="font-medium text-foreground">{transaction?.auction}</div>
                    <div className="text-sm text-muted-foreground">ID: {transaction?.id}</div>
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <div className="font-medium text-foreground">{formatAmount(transaction?.amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      Fee: {formatAmount(transaction?.platformFee)}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction?.status)}`}>
                    {transaction?.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm text-foreground">{formatDate(transaction?.date)}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    {transaction?.payoutDate ? (
                      <span className="text-success">
                        {formatDate(transaction?.payoutDate)}
                      </span>
                    ) : (
                      <span className="text-warning">
                        {transaction?.holdingPeriod} days remaining
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="ExternalLink"
                    iconPosition="right"
                    onClick={() => window.location.href = '/auction-details'}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="lg:hidden">
        {transactions?.map((transaction) => (
          <div key={transaction?.id} className="border-b border-border last:border-b-0">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground mb-1">{transaction?.auction}</h3>
                  <p className="text-sm text-muted-foreground">ID: {transaction?.id}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction?.status)}`}>
                  {transaction?.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-foreground">{formatAmount(transaction?.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Fee</p>
                  <p className="font-medium text-foreground">{formatAmount(transaction?.platformFee)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="text-sm text-foreground">{formatDate(transaction?.date)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconName={expandedRow === transaction?.id ? "ChevronUp" : "ChevronDown"}
                  iconPosition="right"
                  onClick={() => setExpandedRow(expandedRow === transaction?.id ? null : transaction?.id)}
                >
                  Details
                </Button>
              </div>

              {expandedRow === transaction?.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Payout Status:</span>
                      <span className="text-sm text-foreground">
                        {transaction?.payoutDate ? (
                          <span className="text-success">
                            Paid on {formatDate(transaction?.payoutDate)}
                          </span>
                        ) : (
                          <span className="text-warning">
                            {transaction?.holdingPeriod} days remaining
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Payment Method:</span>
                      <span className="text-sm text-foreground">{transaction?.paymentMethod}</span>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        iconName="ExternalLink"
                        iconPosition="right"
                        onClick={() => window.location.href = '/auction-details'}
                      >
                        View Auction Details
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionTable;