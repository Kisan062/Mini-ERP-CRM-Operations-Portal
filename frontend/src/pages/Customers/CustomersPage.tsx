import React, { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerType, CustomerStatus, PaginationMeta } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';

export const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'WHOLESALE' as CustomerType,
    address: '',
    status: 'LEAD' as CustomerStatus,
    followUpDate: '',
    notes: '',
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'WHOLESALE' as CustomerType,
    address: '',
    status: 'ACTIVE' as CustomerStatus,
    followUpDate: '',
    notes: '',
  });

  // Follow-Up Form state
  const [followUpForm, setFollowUpForm] = useState({
    notes: '',
    followUpDate: '',
    status: 'ACTIVE' as CustomerStatus,
  });

  const canManageCustomers = hasRole(['ADMIN', 'SALES']);

  const fetchCustomers = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const res = await api.get<Customer[]>('/customers', {
          page,
          limit: pagination.limit,
          search: search || undefined,
          status: statusFilter || undefined,
          customerType: typeFilter || undefined,
        });
        setCustomers(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load customers', 'error');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, statusFilter, typeFilter, showToast]
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  // Handle Add Customer
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', {
        name: addForm.name,
        mobile: addForm.mobile,
        email: addForm.email,
        businessName: addForm.businessName,
        gstNumber: addForm.gstNumber || null,
        customerType: addForm.customerType,
        address: addForm.address,
        status: addForm.status,
        followUpDate: addForm.followUpDate ? new Date(addForm.followUpDate).toISOString() : null,
        notes: addForm.notes || null,
      });

      showToast(`Customer "${addForm.businessName}" created successfully!`, 'success');
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        mobile: '',
        email: '',
        businessName: '',
        gstNumber: '',
        customerType: 'WHOLESALE',
        address: '',
        status: 'LEAD',
        followUpDate: '',
        notes: '',
      });
      fetchCustomers(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create customer', 'error');
    }
  };

  // Open Edit Modal
  const openEditModal = (c: Customer) => {
    setSelectedCustomer(c);
    setEditForm({
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      businessName: c.businessName,
      gstNumber: c.gstNumber || '',
      customerType: c.customerType,
      address: c.address,
      status: c.status,
      followUpDate: c.followUpDate ? c.followUpDate.split('T')[0] : '',
      notes: c.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.put(`/customers/${selectedCustomer.id}`, {
        name: editForm.name,
        mobile: editForm.mobile,
        email: editForm.email,
        businessName: editForm.businessName,
        gstNumber: editForm.gstNumber || null,
        customerType: editForm.customerType,
        address: editForm.address,
        status: editForm.status,
        followUpDate: editForm.followUpDate ? new Date(editForm.followUpDate).toISOString() : null,
        notes: editForm.notes || null,
      });

      showToast(`Customer "${editForm.businessName}" updated!`, 'success');
      setIsEditModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to update customer', 'error');
    }
  };

  // Open Follow-Up Modal
  const openFollowUpModal = (c: Customer) => {
    setSelectedCustomer(c);
    setFollowUpForm({
      notes: '',
      followUpDate: '',
      status: c.status,
    });
    setIsFollowUpModalOpen(true);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.post(`/customers/${selectedCustomer.id}/followups`, {
        notes: followUpForm.notes,
        followUpDate: followUpForm.followUpDate
          ? new Date(followUpForm.followUpDate).toISOString()
          : null,
        status: followUpForm.status,
      });

      showToast(`Follow-up recorded for "${selectedCustomer.businessName}"!`, 'success');
      setIsFollowUpModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to record follow-up', 'error');
    }
  };

  // Open Detail Modal
  const openDetailModal = async (c: Customer) => {
    try {
      const res = await api.get<Customer>(`/customers/${c.id}`);
      setSelectedCustomer(res.data);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      showToast('Failed to load customer details', 'error');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Customer Relationship Management (CRM)</h2>
            <p className="card-subtitle">
              Manage distributor/wholesale accounts, contact directories, and CRM follow-up logs
            </p>
          </div>
          {canManageCustomers && (
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              + Add Customer
            </button>
          )}
        </div>

        <div className="card-body">
          {/* Toolbar */}
          <div className="toolbar">
            <div className="filter-group">
              <input
                type="text"
                className="input search-input"
                placeholder="Search business, contact, mobile, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>

              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => fetchCustomers(1)}>
              ↻ Refresh
            </button>
          </div>

          {/* Customer Table */}
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Contact Person</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Next Follow-Up</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const isDue =
                      c.followUpDate && new Date(c.followUpDate).getTime() < Date.now();
                    return (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.businessName}</strong>
                          {c.gstNumber && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              GSTIN: {c.gstNumber}
                            </div>
                          )}
                        </td>
                        <td>{c.name}</td>
                        <td>{c.mobile}</td>
                        <td>{c.email}</td>
                        <td>
                          <Badge status={c.customerType} />
                        </td>
                        <td>
                          <Badge status={c.status} />
                        </td>
                        <td>
                          {c.followUpDate ? (
                            <span style={{ color: isDue ? '#dc2626' : '#334155', fontWeight: isDue ? 600 : 400 }}>
                              {isDue && '⚠️ '}
                              {new Date(c.followUpDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '6px' }}
                            onClick={() => openDetailModal(c)}
                          >
                            👁 View
                          </button>
                          {canManageCustomers && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ marginRight: '6px' }}
                                onClick={() => openEditModal(c)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openFollowUpModal(c)}
                              >
                                📞 Follow-Up
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination meta={pagination} onPageChange={fetchCustomers} />
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer / Business Lead"
        size="large"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.businessName}
                onChange={(e) => setAddForm({ ...addForm, businessName: e.target.value })}
                placeholder="e.g. Acme Industrial Traders Ltd"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person Name *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Mobile Number *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.mobile}
                onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="contact@business.com"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Customer Type *</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={addForm.customerType}
                onChange={(e) =>
                  setAddForm({ ...addForm, customerType: e.target.value as CustomerType })
                }
              >
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="RETAIL">Retail</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={addForm.status}
                onChange={(e) =>
                  setAddForm({ ...addForm, status: e.target.value as CustomerStatus })
                }
              >
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">GSTIN / Tax Number (Optional)</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={addForm.gstNumber}
                onChange={(e) => setAddForm({ ...addForm, gstNumber: e.target.value })}
                placeholder="e.g. 27AAAAA0000A1Z5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Next Follow-Up Date (Optional)</label>
              <input
                type="date"
                className="input"
                style={{ width: '100%' }}
                value={addForm.followUpDate}
                onChange={(e) => setAddForm({ ...addForm, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Address *</label>
            <textarea
              className="textarea"
              style={{ width: '100%', minHeight: '60px' }}
              required
              value={addForm.address}
              onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
              placeholder="Plot / Street / City / State / PIN"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Notes / CRM Context</label>
            <textarea
              className="textarea"
              style={{ width: '100%', minHeight: '60px' }}
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
              placeholder="e.g. Inquiry source, credit requirements, product interests"
            />
          </div>

          <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Customer — ${selectedCustomer?.businessName}`}
        size="large"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={editForm.businessName}
                onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Person Name *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Mobile *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={editForm.mobile}
                onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="input"
                style={{ width: '100%' }}
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Customer Type</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={editForm.customerType}
                onChange={(e) =>
                  setEditForm({ ...editForm, customerType: e.target.value as CustomerType })
                }
              >
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="RETAIL">Retail</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value as CustomerStatus })
                }
              >
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={editForm.gstNumber}
                onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Next Follow-Up Date</label>
              <input
                type="date"
                className="input"
                style={{ width: '100%' }}
                value={editForm.followUpDate}
                onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <textarea
              className="textarea"
              style={{ width: '100%', minHeight: '60px' }}
              required
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Follow-Up Modal */}
      <Modal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        title={`Log CRM Follow-Up: ${selectedCustomer?.businessName}`}
      >
        <form onSubmit={handleFollowUpSubmit}>
          <div className="form-group">
            <label className="form-label">Interaction / Discussion Notes *</label>
            <textarea
              className="textarea"
              style={{ width: '100%', minHeight: '90px' }}
              required
              placeholder="e.g. Called client: confirmed order requirement for 50 units. Scheduled demo next Tuesday."
              value={followUpForm.notes}
              onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
            />
            <p className="form-hint">
              Notes are automatically timestamped with your name and saved to the customer's history.
            </p>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Next Follow-Up Date</label>
              <input
                type="date"
                className="input"
                style={{ width: '100%' }}
                value={followUpForm.followUpDate}
                onChange={(e) =>
                  setFollowUpForm({ ...followUpForm, followUpDate: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={followUpForm.status}
                onChange={(e) =>
                  setFollowUpForm({ ...followUpForm, status: e.target.value as CustomerStatus })
                }
              >
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active (Converted)</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFollowUpModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Follow-Up
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Customer Profile: ${selectedCustomer?.businessName}`}
        size="large"
      >
        {selectedCustomer && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '14px',
                background: '#f8fafc',
                borderRadius: '6px',
                marginBottom: '18px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Account Type:</span>{' '}
                <Badge status={selectedCustomer.customerType} />
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Status:</span>{' '}
                <Badge status={selectedCustomer.status} />
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Contact:</span>{' '}
                <strong>{selectedCustomer.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Phone:</span> <strong>{selectedCustomer.mobile}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Email:</span> <strong>{selectedCustomer.email}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>GSTIN:</span>{' '}
                <strong>{selectedCustomer.gstNumber || 'N/A'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Delivery Address
              </h4>
              <div style={{ fontSize: '13px', padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                {selectedCustomer.address}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                CRM Notes & Follow-Up History
              </h4>
              <div
                style={{
                  fontSize: '12px',
                  padding: '12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  color: '#334155',
                }}
              >
                {selectedCustomer.notes || 'No notes logged yet.'}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Recent Delivery Challans Issued
              </h4>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Challan Number</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Total Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedCustomer.challans || selectedCustomer.challans.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '16px' }}>
                          No challans recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      selectedCustomer.challans.map((ch) => (
                        <tr key={ch.id}>
                          <td>
                            <strong>{ch.challanNumber}</strong>
                          </td>
                          <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
                          <td>
                            <Badge status={ch.status} />
                          </td>
                          <td>{ch.totalQuantity} units</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
              <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
