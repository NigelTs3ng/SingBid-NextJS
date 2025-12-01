import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import PaymentStats from './components/PaymentStats';
import TransactionTable from './components/TransactionTable';
import PaymentFilters from './components/PaymentFilters';
import PayoutManagement from './components/PayoutManagement';
import DisputeManagement from './components/DisputeManagement';
import BankAccountManagement from './components/BankAccountManagement';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const PaymentDashboard = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    earningsChange: 0,
    pendingPayouts: 0,
    pendingChange: 0,
    platformFees: 0,
    feesChange: 0,
    activeDisputes: 0,
    disputesChange: 0
  });
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      const res = await fetch('/api/seller/payouts');
      if (res.ok) {
        const data = await res.json();
        const totalFees = data.payouts?.reduce((sum, p) => {
          const platformFee = (p.amount_total || 0) * 0.05;
          return sum + platformFee;
        }, 0) || 0;
        
        setStats({
          totalEarnings: data.summary?.total_completed || 0,
          earningsChange: 12.5,
          pendingPayouts: data.summary?.available || 0,
          pendingChange: -5.2,
          platformFees: totalFees,
          feesChange: 8.1,
          activeDisputes: 0,
          disputesChange: 0
        });
        setPayouts(data.payouts || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const mockTransactions = [];
  
  // Transform payouts into transactions
  const transformedTransactions = payouts.map(p => ({
    id: p.id,
    auction: `Auction ${p.id.substring(0, 8)}`,
    amount: p.amount_total,
    platformFee: (p.amount_total || 0) * 0.05,
    status: p.status,
    date: p.requested_at,
    payoutDate: p.paid_at,
    paymentMethod: "Stripe Transfer",
    holdingPeriod: 0
  }));

  const mockDisputes = [
    {
      id: "DIS-2025-001",
      auction: "Limited Edition Sneakers",
      amount: 450.00,
      reason: "Item not as described",
      description: "The sneakers received were not in the condition described in the auction listing. There are visible scuffs and wear that were not mentioned.",
      status: "open",
      priority: "high",
      filedDate: "2025-01-13T10:00:00Z",
      responseDate: "2025-01-18T10:00:00Z",
      filedBy: "buyer",
      messageCount: 3,
      lastUpdate: "2025-01-14T15:30:00Z"
    },
    {
      id: "DIS-2025-002",
      auction: "Vintage Watch Collection",
      amount: 1200.00,
      reason: "Payment processing issue",
      description: "Payment was charged twice for the same auction. Requesting refund for the duplicate charge.",
      status: "under_review",
      priority: "medium",
      filedDate: "2025-01-11T14:20:00Z",
      responseDate: "2025-01-16T14:20:00Z",
      filedBy: "buyer",
      messageCount: 5,
      lastUpdate: "2025-01-15T09:45:00Z"
    }
  ];


  useEffect(() => {
    setFilteredTransactions(transformedTransactions);
  }, [transformedTransactions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-medium text-foreground">Loading...</h2>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedTransactions = [...filteredTransactions]?.sort((a, b) => {
      if (key === 'amount') {
        return direction === 'asc' ? a?.amount - b?.amount : b?.amount - a?.amount;
      }
      if (key === 'date') {
        return direction === 'asc' 
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      if (key === 'auction') {
        return direction === 'asc' 
          ? a?.auction?.localeCompare(b?.auction)
          : b?.auction?.localeCompare(a?.auction);
      }
      if (key === 'status') {
        return direction === 'asc' 
          ? a?.status?.localeCompare(b?.status)
          : b?.status?.localeCompare(a?.status);
      }
      return 0;
    });

    setFilteredTransactions(sortedTransactions);
  };

  const handleFilterChange = (filters) => {
    let filtered = [...transformedTransactions];

    if (filters?.searchTerm) {
      filtered = filtered?.filter(transaction =>
        transaction?.auction?.toLowerCase()?.includes(filters?.searchTerm?.toLowerCase()) ||
        transaction?.id?.toLowerCase()?.includes(filters?.searchTerm?.toLowerCase())
      );
    }

    if (filters?.status) {
      filtered = filtered?.filter(transaction => transaction?.status === filters?.status);
    }

    if (filters?.minAmount) {
      filtered = filtered?.filter(transaction => transaction?.amount >= parseFloat(filters?.minAmount));
    }

    if (filters?.maxAmount) {
      filtered = filtered?.filter(transaction => transaction?.amount <= parseFloat(filters?.maxAmount));
    }

    setFilteredTransactions(filtered);
  };

  const handleExport = () => {
    console.log('Exporting payment data...');
    // Mock export functionality
  };

  const tabs = [
    { id: 'transactions', label: 'Transactions', icon: 'Receipt' },
    { id: 'payouts', label: 'Payouts', icon: 'Wallet' },
    { id: 'disputes', label: 'Disputes', icon: 'AlertTriangle' },
    { id: 'accounts', label: 'Bank Accounts', icon: 'Building2' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your auction payments, payouts, and financial transactions
          </p>
        </div>

        <PaymentStats stats={stats} />

        {/* Tab Navigation */}
        <div className="bg-card rounded-lg border border-border mb-6">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs?.map((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab?.id
                      ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Icon name={tab?.icon} size={16} />
                  <span>{tab?.label}</span>
                  {tab?.id === 'disputes' && 0 > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                      0
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'transactions' && (
              <div>
                <PaymentFilters 
                  onFilterChange={handleFilterChange}
                  onExport={handleExport}
                />
                <TransactionTable
                  transactions={filteredTransactions}
                  onSort={handleSort}
                  sortConfig={sortConfig}
                />
              </div>
            )}

            {activeTab === 'payouts' && (
              <PayoutManagement payouts={payouts.map(p => ({
                id: p.id,
                auction: `Auction ${p.id.substring(0, 8)}`,
                grossAmount: p.amount_total,
                platformFee: (p.amount_total || 0) * 0.05,
                netAmount: (p.amount_total || 0) * 0.95,
                status: p.status,
                releaseDate: p.requested_at,
                paidDate: p.paid_at
              }))} />
            )}

            {activeTab === 'disputes' && (
              <DisputeManagement disputes={[]} />
            )}

            {activeTab === 'accounts' && (
              <BankAccountManagement 
                bankAccounts={[]}
                paymentMethods={[]}
              />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              fullWidth
              iconName="Plus"
              iconPosition="left"
              onClick={() => window.location.href = '/create-auction'}
            >
              Create New Auction
            </Button>
            <Button
              variant="outline"
              fullWidth
              iconName="Crown"
              iconPosition="left"
              onClick={() => window.location.href = '/subscription-management'}
            >
              Upgrade Subscription
            </Button>
            <Button
              variant="outline"
              fullWidth
              iconName="Download"
              iconPosition="left"
              onClick={handleExport}
            >
              Download Tax Report
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentDashboard;