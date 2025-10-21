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

  // Mock data
  const mockStats = {
    totalEarnings: 15420.50,
    earningsChange: 12.5,
    pendingPayouts: 2340.75,
    pendingChange: -5.2,
    platformFees: 771.03,
    feesChange: 8.1,
    activeDisputes: 2,
    disputesChange: 0
  };

  const mockTransactions = [
    {
      id: "TXN-2025-001",
      auction: "Vintage Rolex Submariner",
      amount: 8500.00,
      platformFee: 425.00,
      status: "completed",
      date: "2025-01-15T10:30:00Z",
      payoutDate: "2025-01-20T14:00:00Z",
      paymentMethod: "Visa ****1234",
      holdingPeriod: 0
    },
    {
      id: "TXN-2025-002",
      auction: "Antique Ming Dynasty Vase",
      amount: 3200.00,
      platformFee: 160.00,
      status: "pending",
      date: "2025-01-14T16:45:00Z",
      payoutDate: null,
      paymentMethod: "Mastercard ****5678",
      holdingPeriod: 3
    },
    {
      id: "TXN-2025-003",
      auction: "Limited Edition Sneakers",
      amount: 450.00,
      platformFee: 22.50,
      status: "disputed",
      date: "2025-01-12T09:15:00Z",
      payoutDate: null,
      paymentMethod: "PayPal",
      holdingPeriod: 0
    },
    {
      id: "TXN-2025-004",
      auction: "Collectible Comic Book",
      amount: 1200.00,
      platformFee: 60.00,
      status: "completed",
      date: "2025-01-10T13:20:00Z",
      payoutDate: "2025-01-15T11:30:00Z",
      paymentMethod: "Visa ****9012",
      holdingPeriod: 0
    },
    {
      id: "TXN-2025-005",
      auction: "Vintage Guitar Amplifier",
      amount: 2100.00,
      platformFee: 105.00,
      status: "pending",
      date: "2025-01-13T11:00:00Z",
      payoutDate: null,
      paymentMethod: "Mastercard ****3456",
      holdingPeriod: 2
    }
  ];

  const mockPayouts = [
    {
      id: "PO-2025-001",
      auction: "Vintage Rolex Submariner",
      grossAmount: 8500.00,
      platformFee: 425.00,
      netAmount: 8075.00,
      status: "completed",
      releaseDate: "2025-01-20T14:00:00Z",
      paidDate: "2025-01-20T14:00:00Z"
    },
    {
      id: "PO-2025-002",
      auction: "Antique Ming Dynasty Vase",
      grossAmount: 3200.00,
      platformFee: 160.00,
      netAmount: 3040.00,
      status: "pending",
      releaseDate: "2025-01-19T16:45:00Z"
    },
    {
      id: "PO-2025-003",
      auction: "Limited Edition Sneakers",
      grossAmount: 450.00,
      platformFee: 22.50,
      netAmount: 427.50,
      status: "disputed",
      releaseDate: "2025-01-17T09:15:00Z",
      disputeReason: "Item not as described"
    }
  ];

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

  const mockBankAccounts = [
    {
      id: "BA-001",
      bankName: "DBS Bank",
      accountNumber: "1234567890",
      accountName: "John Doe",
      isDefault: true,
      verified: true
    },
    {
      id: "BA-002",
      bankName: "OCBC Bank",
      accountNumber: "0987654321",
      accountName: "John Doe",
      isDefault: false,
      verified: false
    }
  ];

  const mockPaymentMethods = [
    {
      id: "PM-001",
      brand: "visa",
      cardNumber: "4111111111111111",
      expiryDate: "12/26",
      cardholderName: "John Doe",
      isDefault: true
    },
    {
      id: "PM-002",
      brand: "mastercard",
      cardNumber: "5555555555554444",
      expiryDate: "08/25",
      cardholderName: "John Doe",
      isDefault: false
    }
  ];

  useEffect(() => {
    setFilteredTransactions(mockTransactions);
  }, []);

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
    let filtered = [...mockTransactions];

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

        <PaymentStats stats={mockStats} />

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
                  {tab?.id === 'disputes' && mockDisputes?.length > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                      {mockDisputes?.length}
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
              <PayoutManagement payouts={mockPayouts} />
            )}

            {activeTab === 'disputes' && (
              <DisputeManagement disputes={mockDisputes} />
            )}

            {activeTab === 'accounts' && (
              <BankAccountManagement 
                bankAccounts={mockBankAccounts}
                paymentMethods={mockPaymentMethods}
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