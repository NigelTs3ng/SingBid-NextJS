import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DisputeManagement = ({ disputes }) => {
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
      case 'open':
        return 'text-warning bg-warning/10';
      case 'under_review':
        return 'text-primary bg-primary/10';
      case 'resolved':
        return 'text-success bg-success/10';
      case 'escalated':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Dispute Management</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            iconName="Filter"
            iconPosition="left"
          >
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
          >
            Export
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {disputes?.map((dispute) => (
          <div key={dispute?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-foreground">{dispute?.auction}</h3>
                  <span className={`text-xs font-medium ${getPriorityColor(dispute?.priority)}`}>
                    {dispute?.priority?.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Dispute ID: {dispute?.id}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispute?.status)}`}>
                {dispute?.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-foreground mb-2">
                <span className="font-medium">Reason:</span> {dispute?.reason}
              </p>
              <p className="text-sm text-muted-foreground">
                "{dispute?.description}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Disputed Amount</p>
                <p className="font-semibold text-foreground">{formatAmount(dispute?.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Filed Date</p>
                <p className="text-sm text-foreground">{formatDate(dispute?.filedDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Response Due</p>
                <p className="text-sm text-foreground">{formatDate(dispute?.responseDate)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Icon name="User" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Filed by: {dispute?.filedBy}
                  </span>
                </div>
                {dispute?.lastUpdate && (
                  <div className="flex items-center space-x-2">
                    <Icon name="Clock" size={16} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Updated: {formatDate(dispute?.lastUpdate)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="MessageSquare"
                  iconPosition="left"
                >
                  Messages ({dispute?.messageCount})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  iconName="ExternalLink"
                  iconPosition="right"
                >
                  View Details
                </Button>
              </div>
            </div>

            {dispute?.status === 'open' && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    iconName="Check"
                    iconPosition="left"
                  >
                    Accept Resolution
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="MessageCircle"
                    iconPosition="left"
                  >
                    Respond
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    iconName="AlertTriangle"
                    iconPosition="left"
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {disputes?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Shield" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Active Disputes</h3>
          <p className="text-muted-foreground">
            All your transactions are running smoothly. Disputes will appear here if any issues arise.
          </p>
        </div>
      )}
    </div>
  );
};

export default DisputeManagement;