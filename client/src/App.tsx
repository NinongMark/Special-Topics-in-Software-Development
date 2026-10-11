import { useState, useEffect, FormEvent } from 'react';
import Login from './pages/Login';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subscribers' | 'service-accounts' | 'billing' | 'collections'>('dashboard');

  // State data
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [serviceAccounts, setServiceAccounts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // SOA Modal State
  const [soaData, setSoaData] = useState<any | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [targetEmail, setTargetEmail] = useState('globalstrike69@gmail.com');

  // Edit Subscriber Modal State
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Subscriber Form state
  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');

  // Service Account Form state
  const [saSubId, setSaSubId] = useState('');
  const [saAccNumber, setSaAccNumber] = useState('');
  const [saType, setSaType] = useState<'CABLE' | 'INTERNET' | 'COMBO'>('INTERNET');
  const [saMonthlyFee, setSaMonthlyFee] = useState('1500.00');

  // Bill Generation Form state
  const [serviceAccountId, setServiceAccountId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('2026-10');
  const [amountDue, setAmountDue] = useState('1500.00');
  const [dueDate, setDueDate] = useState('2026-10-31');

  // Payment Collection Form state
  const [selectedBillId, setSelectedBillId] = useState('');
  const [orNumber, setOrNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('1500.00');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const subRes = await fetch('http://localhost:3001/api/subscribers');
      if (subRes.ok) setSubscribers(await subRes.json());

      const saRes = await fetch('http://localhost:3001/api/subscribers/service-accounts');
      if (saRes.ok) setServiceAccounts(await saRes.json());

      const billRes = await fetch('http://localhost:3001/api/billing');
      if (billRes.ok) setBills(await billRes.json());

      const payRes = await fetch('http://localhost:3001/api/billing/payments');
      if (payRes.ok) setPaymentsList(await payRes.json());
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const openSOA = async (subId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/api/billing/soa/${subId}`);
      const data = await res.json();
      if (res.ok) {
        setSoaData(data);
        const subEmail = data.subscriber.email || (data.subscriber.contactNumber?.includes('@') ? data.subscriber.contactNumber : 'globalstrike69@gmail.com');
        setTargetEmail(subEmail);
      }
    } catch (err) {
      alert('Failed to load Statement of Account');
    }
  };

  const handleOpenEdit = (sub: any) => {
    setEditingSub(sub);
    setEditName(sub.fullName || sub.name || '');
    setEditEmail(sub.email || sub.contactNumber || '');
    setEditAddress(sub.address || 'Maramag, Bukidnon');
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    try {
      const res = await fetch(`http://localhost:3001/api/subscribers/${editingSub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editName,
          email: editEmail,
          contactNumber: editEmail,
          address: editAddress,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Subscriber details updated!`);
        setEditingSub(null);
        fetchData();
      } else {
        alert(`Failed to update subscriber: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Network error updating subscriber: ${err.message}`);
    }
  };

  const handleDeleteSubscriber = async (subId: number, subName: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove subscriber "${subName}" (ID #${subId})? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3001/api/subscribers/${subId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || `Subscriber "${subName}" removed.`);
        fetchData();
      } else {
        alert(`Failed to delete subscriber: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Network error deleting subscriber: ${err.message}`);
    }
  };

  const handleConfirmSendEmail = async () => {
    if (!soaData || !targetEmail || !targetEmail.includes('@')) {
      alert('Please enter a valid target email address.');
      return;
    }

    setEmailSending(true);
    try {
      const res = await fetch('http://localhost:3001/api/billing/send-soa', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          subscriberId: soaData.subscriber.id, 
          email: targetEmail 
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Success: ${data.message}`);
        setShowEmailPrompt(false);
      } else {
        alert(`Delivery Failed: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Network Error connecting to server: ${err.message}`);
    } finally {
      setEmailSending(false);
    }
  };

  const handleAddSubscriber = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName: newSubName, 
          email: newSubEmail, 
          contactNumber: newSubEmail, 
          address: 'Maramag, Bukidnon' 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Subscriber "${newSubName}" successfully added!`);
        setNewSubName('');
        setNewSubEmail('');
        fetchData();
      } else {
        alert(`Failed to add subscriber: ${data.message || 'Validation error'}`);
      }
    } catch (err: any) {
      alert(`Network error adding subscriber: ${err.message}`);
    }
  };

  const handleCreateServiceAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!saSubId) {
      alert('Please select a subscriber.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/subscribers/service-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscriberId: Number(saSubId), 
          accountNumber: saAccNumber || `SA-${Date.now().toString().slice(-4)}`, 
          serviceType: saType, 
          monthlyFee: saMonthlyFee 
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Service Account #${data.id} (${data.accountNumber}) registered!`);
        setSaSubId('');
        setSaAccNumber('');
        fetchData();
      } else {
        alert(`Error registering service account: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleCreateBill = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/billing/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serviceAccountId: Number(serviceAccountId), 
          billingPeriod, 
          amountDue, 
          dueDate 
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Bill #${data.id} successfully created!`);
        setServiceAccountId('');
        fetchData();
      } else {
        alert(`Failed to generate bill: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error connecting to server: ${err.message}`);
    }
  };

  const handleProcessPayment = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/billing/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billId: Number(selectedBillId), 
          cashierId: 1, 
          orNumber: orNumber.trim() || undefined, 
          amountPaid, 
          paymentMethod: 'CASH' 
        }),
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Payment recorded! Official Receipt #${data.orNumber} generated for Bill #${selectedBillId}`);
        setSelectedBillId('');
        setOrNumber('');
        fetchData();
      } else {
        alert(`Payment processing failed: ${data.message}`);
      }
    } catch (err: any) {
      alert(`Error connecting to server: ${err.message}`);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <Login onLoginSuccess={(newToken, userObj) => { setToken(newToken); setUser(userObj); }} />
      </div>
    );
  }

  const totalCollected = paymentsList.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const totalInvoiced = bills.reduce((sum, b) => sum + Number(b.amountDue || 0), 0);
  const totalOutstanding = totalInvoiced - totalCollected;

  const inputStyle: React.CSSProperties = {
    padding: '0.7rem 0.9rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Executive Header */}
      <header style={{ backgroundColor: '#1e293b', padding: '0.9rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            BCIS <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.9rem', marginLeft: '0.5rem' }}>| Billing & Collection Platform</span>
          </h1>

          <nav style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#0f172a', padding: '0.25rem', borderRadius: '10px', border: '1px solid #334155' }}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'subscribers', label: 'Subscribers' },
              { id: 'service-accounts', label: 'Service Accounts' },
              { id: 'billing', label: 'Billing & Invoices' },
              { id: 'collections', label: 'Collections Log' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: 'none', backgroundColor: activeTab === tab.id ? '#2563eb' : 'transparent', color: activeTab === tab.id ? '#ffffff' : '#94a3b8', fontWeight: activeTab === tab.id ? 600 : 500, fontSize: '0.875rem', cursor: 'pointer' }}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logged in as</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>{user?.username || 'Admin'}</div>
          </div>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ padding: '2rem 2.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        {loading && <div style={{ color: '#38bdf8', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 500 }}>Syncing live backend ledger...</div>}

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '1.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Management Overview</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Real-time telemetry and revenue performance tracking.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Invoiced</span>
                <h3 style={{ margin: '0.5rem 0 0 0', color: '#38bdf8', fontSize: '1.75rem', fontWeight: 700 }}>PHP {totalInvoiced.toFixed(2)}</h3>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Collected</span>
                <h3 style={{ margin: '0.5rem 0 0 0', color: '#34d399', fontSize: '1.75rem', fontWeight: 700 }}>PHP {totalCollected.toFixed(2)}</h3>
              </div>

              <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Outstanding</span>
                <h3 style={{ margin: '0.5rem 0 0 0', color: '#f87171', fontSize: '1.75rem', fontWeight: 700 }}>PHP {totalOutstanding.toFixed(2)}</h3>
              </div>
            </div>
          </div>
        )}

        {/* SUBSCRIBERS */}
        {activeTab === 'subscribers' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Subscriber Directory</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Manage accounts, update personal info, and generate statements.</p>
            </div>

            <form onSubmit={handleAddSubscriber} style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '12px', border: '1px solid #334155', alignItems: 'center' }}>
              <input type="text" placeholder="Full Name" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} required style={{ ...inputStyle, flex: 1 }} />
              <input type="email" placeholder="Email Address" value={newSubEmail} onChange={(e) => setNewSubEmail(e.target.value)} required style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" style={{ padding: '0.7rem 1.5rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                Add Subscriber
              </button>
            </form>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>ID</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Account #</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Name</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Contact / Email</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '1rem 1.25rem', color: '#38bdf8', fontWeight: 600 }}>#{s.id}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#f8fafc' }}>{s.accountNumber || 'N/A'}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>{s.fullName || s.name}</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#cbd5e1' }}>{s.email || s.contactNumber || 'N/A'}</td>
                      <td style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => openSOA(s.id)} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                          View SOA
                        </button>
                        <button onClick={() => handleOpenEdit(s)} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#eab308', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteSubscriber(s.id, s.fullName || s.name)} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SERVICE ACCOUNTS */}
        {activeTab === 'service-accounts' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Service Accounts</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Provision Fiber and Cable lines to registered subscribers.</p>
            </div>

            <form onSubmit={handleCreateServiceAccount} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              
              <select value={saSubId} onChange={(e) => setSaSubId(e.target.value)} required style={inputStyle}>
                <option value="">-- Select Subscriber --</option>
                {subscribers.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.fullName || s.name} ({s.accountNumber})
                  </option>
                ))}
              </select>

              <input type="text" placeholder="Service Account Number (Optional, e.g. SA-1002)" value={saAccNumber} onChange={(e) => setSaAccNumber(e.target.value)} style={inputStyle} />
              <select value={saType} onChange={(e) => setSaType(e.target.value as any)} style={inputStyle}>
                <option value="INTERNET">INTERNET (Fiber)</option>
                <option value="CABLE">CABLE</option>
                <option value="COMBO">COMBO</option>
              </select>
              <input type="number" step="0.01" value={saMonthlyFee} onChange={(e) => setSaMonthlyFee(e.target.value)} required style={inputStyle} />
              <button type="submit" style={{ padding: '0.8rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Register Service Account
              </button>
            </form>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Service Account ID</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Subscriber ID</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Account Number</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Type</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Monthly Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceAccounts.map((sa) => (
                    <tr key={sa.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#38bdf8' }}>#{sa.id}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>#{sa.subscriberId}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>{sa.accountNumber}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>{sa.serviceType}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#34d399' }}>PHP {sa.monthlyFee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BILLING & INVOICES */}
        {activeTab === 'billing' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Billing & Invoices</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Issue invoices and collect subscriber payments.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Form 1: Generate Bill */}
              <form onSubmit={handleCreateBill} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>Generate New Bill</h3>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Service Account ID or Subscriber ID</label>
                  <input type="number" placeholder="e.g. 4" value={serviceAccountId} onChange={(e) => setServiceAccountId(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Billing Period</label>
                  <input type="text" placeholder="e.g. 2026-10" value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Amount Due (PHP)</label>
                  <input type="number" step="0.01" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" style={{ padding: '0.8rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}>
                  Generate Invoice
                </button>
              </form>

              {/* Form 2: Process Payment */}
              <form onSubmit={handleProcessPayment} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>Record Collection / Payment</h3>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Bill ID to Pay</label>
                  <input type="number" placeholder="e.g. 1" value={selectedBillId} onChange={(e) => setSelectedBillId(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Official Receipt (OR) # (Leave blank for auto-number)</label>
                  <input type="text" placeholder="e.g. OR-0003" value={orNumber} onChange={(e) => setOrNumber(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Amount Paid (PHP)</label>
                  <input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" style={{ padding: '0.8rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>
                  Process Payment
                </button>
              </form>

            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Bill ID</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Service Account ID</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Period</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Amount Due</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '1rem 1.25rem', color: '#38bdf8', fontWeight: 600 }}>#{b.id}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>#{b.serviceAccountId}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>{b.billingPeriod}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>PHP {b.amountDue}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: b.status === 'PAID' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)', color: b.status === 'PAID' ? '#34d399' : '#f87171', border: `1px solid ${b.status === 'PAID' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'}` }}>
                          {b.status || 'UNPAID'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COLLECTIONS LOG */}
        {activeTab === 'collections' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Collections Log</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Official payment transactions and receipt numbers.</p>
            </div>

            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Receipt (OR) #</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Bill ID</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Method</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Amount Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#38bdf8' }}>{p.orNumber}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>#{p.billId}</td>
                      <td style={{ padding: '1rem 1.25rem' }}>{p.paymentMethod || 'CASH'}</td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#34d399' }}>PHP {p.amountPaid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* EDIT SUBSCRIBER MODAL */}
      {editingSub && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <form onSubmit={handleSaveEdit} style={{ backgroundColor: '#1e293b', color: '#f8fafc', width: '450px', padding: '2rem', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>Edit Subscriber #{editingSub.id}</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Full Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Email / Contact</label>
              <input type="text" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.3rem' }}>Address</label>
              <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setEditingSub(null)} style={{ padding: '0.6rem 1.25rem', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '0.6rem 1.25rem', backgroundColor: '#eab308', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STATEMENT OF ACCOUNT MODAL */}
      {soaData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', color: '#111827', width: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', borderRadius: '12px' }}>
            
            <div style={{ borderBottom: '2px solid #111827', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase' }}>Statement of Account</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#4b5563', fontSize: '0.9rem' }}>BCIS Internet & Cable Services | Maramag, Bukidnon</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Subscriber Name</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600 }}>{soaData.subscriber.fullName}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</span>
                <p style={{ margin: '0.2rem 0 0 0', fontWeight: 600 }}>{soaData.subscriber.accountNumber}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Address</span>
                <p style={{ margin: '0.2rem 0 0 0' }}>{soaData.subscriber.address || 'Maramag, Bukidnon'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Statement Date</span>
                <p style={{ margin: '0.2rem 0 0 0' }}>{soaData.statementDate}</p>
              </div>
            </div>

            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Ledger Breakdown</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.6rem' }}>Period</th>
                  <th style={{ padding: '0.6rem' }}>Description</th>
                  <th style={{ padding: '0.6rem', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.6rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {soaData.bills.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af' }}>No billed invoices found.</td></tr>
                ) : (
                  soaData.bills.map((b: any) => {
                    const isPaid = b.status === 'PAID';
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                        <td style={{ padding: '0.6rem' }}>{b.billingPeriod}</td>
                        <td style={{ padding: '0.6rem' }}>Invoice #{b.id}</td>
                        <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 600 }}>PHP {b.amountDue}</td>
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: isPaid ? '#d1fae5' : '#fee2e2', color: isPaid ? '#047857' : '#b91c1c' }}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
              <button onClick={() => window.print()} style={{ padding: '0.6rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Print Statement
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowEmailPrompt(true)} style={{ padding: '0.6rem 1.25rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  Send SOA Email
                </button>
                <button onClick={() => setSoaData(null)} style={{ padding: '0.6rem 1.25rem', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM EMAIL PROMPT MODAL */}
      {showEmailPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: '#1e293b', color: '#f8fafc', width: '450px', padding: '2rem', borderRadius: '12px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700 }}>Send Statement of Account</h3>
            <p style={{ margin: '0 0 1.25rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              Enter the target recipient email address for <strong>{soaData?.subscriber?.fullName}</strong>:
            </p>
            <input 
              type="email" 
              value={targetEmail} 
              onChange={(e) => setTargetEmail(e.target.value)} 
              placeholder="e.g. globalstrike69@gmail.com"
              style={{ ...inputStyle, width: '100%', marginBottom: '1.25rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setShowEmailPrompt(false)} style={{ padding: '0.6rem 1.25rem', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConfirmSendEmail} disabled={emailSending} style={{ padding: '0.6rem 1.25rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                {emailSending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}