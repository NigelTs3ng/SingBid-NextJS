import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function TestBidder() {
  const { user, loading } = useAuth();
  const [bids, setBids] = useState([]);
  const [bidData, setBidData] = useState(null);
  const [testResults, setTestResults] = useState({});

  const runTests = async () => {
    if (!user) {
      setTestResults({ error: 'No user logged in' });
      return;
    }

    console.log('Testing with user:', user.id);
    
    const results = {};

    // Test 1: Fetch bids via API
    try {
      const response = await fetch(`/api/bids?user_id=${user.id}`);
      results.apiStatus = response.status;
      results.apiOk = response.ok;
      
      if (response.ok) {
        const data = await response.json();
        results.bidsCount = data.bids?.length || 0;
        results.bidsData = data.bids;
        setBids(data.bids || []);
      } else {
        const errorText = await response.text();
        results.apiError = errorText;
      }
    } catch (error) {
      results.apiError = error.message;
    }

    // Test 2: Fetch via test endpoint
    try {
      const response = await fetch(`/api/test-bids?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        results.testBidsCount = data.count;
        results.testBidsData = data.bids;
      }
    } catch (error) {
      results.testError = error.message;
    }

    setTestResults(results);
  };

  useEffect(() => {
    if (!loading && user) {
      runTests();
    }
  }, [user, loading]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Bidder Test - Not Logged In</h1>
        <p>Please log in to test bidder functionality.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bidder Dashboard Test</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">User Info</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <button 
            onClick={runTests}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Run Tests
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Results</h2>
        <div className="bg-gray-100 p-4 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>

      {bids.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Bids Found ({bids.length})</h2>
          <div className="space-y-2">
            {bids.map((bid) => (
              <div key={bid.id} className="bg-white border p-4 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Auction:</strong> {bid.auctions?.title || 'Unknown'}</p>
                    <p><strong>Amount:</strong> ${bid.amount}</p>
                    <p><strong>Status:</strong> {bid.status}</p>
                  </div>
                  <div>
                    <p><strong>Auth Status:</strong> {bid.authorization_status}</p>
                    <p><strong>Created:</strong> {new Date(bid.created_at).toLocaleString()}</p>
                    <p><strong>Payment ID:</strong> {bid.stripe_payment_intent_id?.substring(0, 20)}...</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
        <div className="space-x-4">
          <button 
            onClick={() => window.location.href = '/dashboard/bidder'}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Go to Real Dashboard
          </button>
          <button 
            onClick={() => window.location.href = '/auction-listings'}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Browse Auctions
          </button>
        </div>
      </div>
    </div>
  );
}