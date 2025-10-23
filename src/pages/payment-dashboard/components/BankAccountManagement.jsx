import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const BankAccountManagement = ({ bankAccounts, paymentMethods }) => {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    routingNumber: ''
  });
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const handleAddAccount = () => {
    // Mock account addition
    console.log('Adding bank account:', newAccount);
    setShowAddAccount(false);
    setNewAccount({
      bankName: '',
      accountNumber: '',
      accountName: '',
      routingNumber: ''
    });
  };

  const handleAddCard = () => {
    // Mock card addition
    console.log('Adding payment method:', newCard);
    setShowAddCard(false);
    setNewCard({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: ''
    });
  };

  const maskAccountNumber = (accountNumber) => {
    return `****${accountNumber?.slice(-4)}`;
  };

  const maskCardNumber = (cardNumber) => {
    return `**** **** **** ${cardNumber?.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Bank Accounts Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Bank Accounts</h2>
          <Button
            variant="outline"
            size="sm"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowAddAccount(true)}
          >
            Add Account
          </Button>
        </div>

        {/* Add Account Form */}
        {showAddAccount && (
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-foreground mb-4">Add New Bank Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Bank Name"
                type="text"
                placeholder="Enter bank name"
                value={newAccount?.bankName}
                onChange={(e) => setNewAccount({...newAccount, bankName: e?.target?.value})}
                required
              />
              <Input
                label="Account Name"
                type="text"
                placeholder="Enter account holder name"
                value={newAccount?.accountName}
                onChange={(e) => setNewAccount({...newAccount, accountName: e?.target?.value})}
                required
              />
              <Input
                label="Account Number"
                type="text"
                placeholder="Enter account number"
                value={newAccount?.accountNumber}
                onChange={(e) => setNewAccount({...newAccount, accountNumber: e?.target?.value})}
                required
              />
              <Input
                label="Routing Number"
                type="text"
                placeholder="Enter routing number"
                value={newAccount?.routingNumber}
                onChange={(e) => setNewAccount({...newAccount, routingNumber: e?.target?.value})}
                required
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="default"
                size="sm"
                iconName="Check"
                iconPosition="left"
                onClick={handleAddAccount}
              >
                Add Account
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAccount(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Bank Accounts List */}
        <div className="space-y-4">
          {bankAccounts?.map((account) => (
            <div key={account?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon name="Building2" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{account?.bankName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {maskAccountNumber(account?.accountNumber)} • {account?.accountName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {account?.isDefault && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      Default
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account?.verified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {account?.verified ? 'Verified' : 'Pending'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="MoreHorizontal"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Payment Methods Section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Payment Methods</h2>
          <Button
            variant="outline"
            size="sm"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowAddCard(true)}
          >
            Add Card
          </Button>
        </div>

        {/* Add Card Form */}
        {showAddCard && (
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-foreground mb-4">Add New Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <Input
                  label="Cardholder Name"
                  type="text"
                  placeholder="Enter cardholder name"
                  value={newCard?.cardholderName}
                  onChange={(e) => setNewCard({...newCard, cardholderName: e?.target?.value})}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Card Number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={newCard?.cardNumber}
                  onChange={(e) => setNewCard({...newCard, cardNumber: e?.target?.value})}
                  required
                />
              </div>
              <Input
                label="Expiry Date"
                type="text"
                placeholder="MM/YY"
                value={newCard?.expiryDate}
                onChange={(e) => setNewCard({...newCard, expiryDate: e?.target?.value})}
                required
              />
              <Input
                label="CVV"
                type="text"
                placeholder="123"
                value={newCard?.cvv}
                onChange={(e) => setNewCard({...newCard, cvv: e?.target?.value})}
                required
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="default"
                size="sm"
                iconName="Check"
                iconPosition="left"
                onClick={handleAddCard}
              >
                Add Card
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCard(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Payment Methods List */}
        <div className="space-y-4">
          {paymentMethods?.map((method) => (
            <div key={method?.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon name="CreditCard" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {method?.brand?.toUpperCase()} {maskCardNumber(method?.cardNumber)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Expires {method?.expiryDate} • {method?.cardholderName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method?.isDefault && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      Default
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="MoreHorizontal"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BankAccountManagement;