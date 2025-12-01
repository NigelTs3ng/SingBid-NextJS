import React from 'react';
import Icon from '../../../components/AppIcon';

const PaymentStats = ({ stats }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    })?.format(amount);
  };

  const statCards = [
    {
      title: 'Total Earnings',
      value: formatAmount(stats?.totalEarnings),
      change: stats?.earningsChange,
      icon: 'TrendingUp',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      title: 'Pending Payouts',
      value: formatAmount(stats?.pendingPayouts),
      change: stats?.pendingChange,
      icon: 'Clock',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      title: 'Platform Fees',
      value: formatAmount(stats?.platformFees),
      change: stats?.feesChange,
      icon: 'Receipt',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Active Disputes',
      value: stats?.activeDisputes,
      change: stats?.disputesChange,
      icon: 'AlertTriangle',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    }
  ];

  const getChangeColor = (change) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return 'TrendingUp';
    if (change < 0) return 'TrendingDown';
    return 'Minus';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards?.map((stat, index) => (
        <div key={index} className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${stat?.bgColor}`}>
              <Icon name={stat?.icon} size={20} className={stat?.color} />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${getChangeColor(stat?.change)}`}>
              <Icon name={getChangeIcon(stat?.change)} size={14} />
              <span>{Math.abs(stat?.change)}%</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1">{stat?.value}</h3>
            <p className="text-sm text-muted-foreground">{stat?.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaymentStats;