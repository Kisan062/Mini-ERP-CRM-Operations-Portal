import React, { useState, useEffect, useCallback } from 'react';
import type { Challan, Customer, Product, PaginationMeta } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';

interface NewItemRow {
  productId: string;
  quantity: number | string;
}

export const ChallansPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [challans, setChallans] = useState<Challan[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  // Data for creation dropdowns
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);

  // Create form state
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<NewItemRow[]>([{ productId: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  const canCreateOrConfirm = hasRole(['ADMIN', 'SALES', 'WAREHOUSE']);

  const fetchChallans = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const res = await api.get<Challan[]>('/challans', {
          page,
          limit: pagination.limit,
          status: statusFilter || undefined,
          search: search || undefined,
        });
        setChallans(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load challans', 'error');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, statusFilter, search, showToast]
  );

  useEffect(() => {
    fetchChallans(1);
  }, [fetchChallans]);

  // Load active customers and products when create modal is opened
  const openCreateModal = async () => {
    setIsCreateModalOpen(true);
    setCustomerId('');
    setItems([{ productId: '', quantity: 1 }]);

    try {
      const [custRes, prodRes] = await Promise.all([
        api.get<Customer[]>('/customers', { limit: 100 }),
        api.get<Product[]>('/products', { limit: 100 }),
      ]);
      setCustomersList(custRes.data);
      setProductsList(prodRes.data);
      if (custRes.data.length > 0) {
        setCustomerId(custRes.data[0].id);
      }
    } catch (err: any) {
      showToast('Failed to load customers or products for challan creation', 'error');
    }
  };

  // Add line item row
  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  // Remove line item row
  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Update item row
  const updateItemRow = (index: number, field: keyof NewItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (
    e: React.FormEvent,
    targetStatus: 'DRAFT' | 'CONFIRMED' = 'DRAFT'
  ) => {
    e.preventDefault();

    if (!customerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    // Validate that all rows have a product selected and positive integer quantity
    const parsedItems: { productId: string; quantity: number }[] = [];
    for (const item of items) {
      if (!item.productId) {
        showToast('Please select a product for all line items', 'error');
        return;
      }
      const qty = parseInt(String(item.quantity), 10);
      if (isNaN(qty) || qty <= 0) {
        showToast('Quantity must be greater than zero for all line items', 'error');
        return;
      }
      parsedItems.push({
        productId: item.productId,
        quantity: qty,
      });
    }

    setSubmitting(true);
    try {
      const res = await api.post<Challan>('/challans', {
        customerId,
        items: parsedItems,
        status: targetStatus,
      });

      showToast(
        `Challan ${res.data.challanNumber} saved as ${targetStatus}!`,
        'success'
      );
      setIsCreateModalOpen(false);
      fetchChallans(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create challan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Confirm Challan (The high-scrutiny transaction)
  const handleConfirmChallan = async (challan: Challan) => {
    if (!window.confirm(`Are you sure you want to CONFIRM delivery challan "${challan.challanNumber}"?\nThis will decrement physical inventory.`)) {
      return;
    }

    try {
      const res = await api.patch<Challan>(`/challans/${challan.id}/confirm`);
      showToast(`✔ Success: Challan ${res.data.challanNumber} confirmed! Stock decremented.`, 'success');
      fetchChallans(pagination.page);
    } catch (err: any) {
      // Clear prominent error toast on stock shortage naming which products are short
      const errorMsg = err.message || 'Confirmation failed';
      showToast(`❌ Confirmation Aborted:\n${errorMsg}`, 'error');
    }
  };

  // Handle Cancel Challan
  const handleCancelChallan = async (challan: Challan) => {
    const promptMsg =
      challan.status === 'CONFIRMED'
        ? `Cancel CONFIRMED challan "${challan.challanNumber}"?\nThis will reverse stock movements back to inventory.`
        : `Cancel DRAFT challan "${challan.challanNumber}"?`;

    if (!window.confirm(promptMsg)) return;

    try {
      const res = await api.patch<Challan>(`/challans/${challan.id}/cancel`);
      showToast(
        challan.status === 'CONFIRMED'
          ? `Challan ${res.data.challanNumber} cancelled. Stock restored to inventory.`
          : `Challan ${res.data.challanNumber} cancelled.`,
        'info'
      );
      fetchChallans(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Cancellation failed', 'error');
    }
  };

  // View Challan Details
  const openDetailModal = async (c: Challan) => {
    try {
      const res = await api.get<Challan>(`/challans/${c.id}`);
      setSelectedChallan(res.data);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      showToast('Failed to load challan details', 'error');
    }
  };

  // Calculate live total quantity in creation modal
  const totalDraftQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Delivery Challans & Dispatch Operations</h2>
            <p className="card-subtitle">
              Issue and confirm verified goods dispatch challans with atomic stock verification
            </p>
          </div>
          {canCreateOrConfirm && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Create Delivery Challan
            </button>
          )}
        </div>

        <div className="card-body">
          {/* Filters Toolbar */}
          <div className="toolbar">
            <div className="filter-group">
              <input
                type="text"
                className="input search-input"
                placeholder="Search by challan number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div style={{ display: 'flex', gap: '4px' }}>
                {['', 'DRAFT', 'CONFIRMED', 'CANCELLED'].map((st) => (
                  <button
                    key={st || 'ALL'}
                    className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st || 'All Statuses'}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => fetchChallans(1)}>
              ↻ Refresh
            </button>
          </div>

          {/* Challans Table */}
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Created Date</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Issued By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      Loading challans...
                    </td>
                  </tr>
                ) : challans.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      No delivery challans found matching your query.
                    </td>
                  </tr>
                ) : (
                  challans.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ color: '#1e40af' }}>{c.challanNumber}</strong>
                      </td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div>
                          <strong>{c.customer?.businessName}</strong>
                        </div>
                        <small style={{ color: '#64748b' }}>{c.customer?.name}</small>
                      </td>
                      <td>
                        <strong>{c.totalQuantity}</strong> units
                      </td>
                      <td>{c.items?.length || 0} line(s)</td>
                      <td>
                        <Badge status={c.status} />
                      </td>
                      <td>
                        {c.createdByUser?.name}{' '}
                        <small style={{ color: '#64748b' }}>({c.createdByUser?.role})</small>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginRight: '6px' }}
                          onClick={() => openDetailModal(c)}
                        >
                          👁 View
                        </button>

                        {canCreateOrConfirm && c.status === 'DRAFT' && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ marginRight: '6px' }}
                            onClick={() => handleConfirmChallan(c)}
                            title="Lock stock and mark CONFIRMED"
                          >
                            ✓ Confirm
                          </button>
                        )}

                        {canCreateOrConfirm && c.status !== 'CANCELLED' && (
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => handleCancelChallan(c)}
                            title={c.status === 'CONFIRMED' ? 'Cancel & reverse stock' : 'Cancel draft'}
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination meta={pagination} onPageChange={fetchChallans} />
        </div>
      </div>

      {/* Create Challan Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Delivery Challan (DRAFT)"
        size="large"
      >
        <form onSubmit={handleCreateSubmit}>
          <div className="form-group">
            <label className="form-label">Select Customer *</label>
            <select
              className="select"
              style={{ width: '100%' }}
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="" disabled>
                -- Choose Customer --
              </option>
              {customersList.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.businessName} — {cust.name} ({cust.customerType})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '18px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Line Items (Products to Dispatch) *
              </label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
                + Add Another Product
              </button>
            </div>
            <p className="form-hint">
              Product name and current unit price are captured as immutable snapshots at creation.
            </p>
          </div>

          <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>Product</th>
                  <th style={{ width: '25%' }}>Quantity</th>
                  <th style={{ width: '15%' }}>Snapshot Price</th>
                  <th style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const selectedProd = productsList.find((p) => p.id === row.productId);
                  return (
                    <tr key={idx}>
                      <td>
                        <select
                          className="select"
                          style={{ width: '100%' }}
                          required
                          value={row.productId}
                          onChange={(e) => updateItemRow(idx, 'productId', e.target.value)}
                        >
                          <option value="" disabled>
                            -- Choose Product --
                          </option>
                          {productsList.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.name} ({prod.sku}) — Stock: {prod.currentStock} units
                            </option>
                          ))}
                        </select>
                        {selectedProd && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            Available Stock: <strong>{selectedProd.currentStock}</strong> | Location:{' '}
                            {selectedProd.location || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          style={{ width: '100%' }}
                          required
                          value={row.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td>
                        {selectedProd ? `₹${parseFloat(String(selectedProd.unitPrice)).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={() => removeItemRow(idx)}
                            title="Remove line item"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: '#eff6ff',
              borderRadius: '4px',
              marginTop: '16px',
              fontSize: '13px',
            }}
          >
            <span>
              Total Dispatch Quantity: <strong>{totalDraftQuantity} units</strong> across {items.length} line(s)
            </span>
            <span style={{ color: '#1e40af', fontSize: '11px' }}>
              ℹ Choose <strong>Save as Draft</strong> (no stock deducted) or <strong>Save & Confirm</strong> (immediate stock deduction).
            </span>
          </div>

          <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={(e) => handleCreateSubmit(e, 'DRAFT')}
            >
              {submitting ? 'Saving...' : '💾 Save as Draft'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={(e) => handleCreateSubmit(e, 'CONFIRMED')}
            >
              {submitting ? 'Confirming...' : '✅ Save & Confirm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Challan Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Delivery Challan: ${selectedChallan?.challanNumber}`}
        size="large"
      >
        {selectedChallan && (
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
                <span style={{ color: '#64748b' }}>Status:</span>{' '}
                <Badge status={selectedChallan.status} />
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Challan Date:</span>{' '}
                <strong>{new Date(selectedChallan.createdAt).toLocaleDateString()}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Issued By:</span>{' '}
                <strong>{selectedChallan.createdByUser?.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Total Quantity:</span>{' '}
                <strong>{selectedChallan.totalQuantity} units</strong>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                Customer Information
              </h4>
              <div style={{ fontSize: '13px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <div>
                  <strong>{selectedChallan.customer?.businessName}</strong> ({selectedChallan.customer?.name})
                </div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>
                  Mobile: {selectedChallan.customer?.mobile} | Email: {selectedChallan.customer?.email}
                </div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>
                  Address: {selectedChallan.customer?.address}
                </div>
                {selectedChallan.customer?.gstNumber && (
                  <div style={{ color: '#64748b', marginTop: '2px' }}>
                    GSTIN: {selectedChallan.customer.gstNumber}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                Immutable Snapshot Line Items
              </h4>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product Name (Snapshot)</th>
                      <th>Quantity</th>
                      <th>Unit Price (Snapshot)</th>
                      <th>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChallan.items?.map((item) => {
                      const price = parseFloat(String(item.unitPriceSnapshot));
                      const total = price * item.quantity;
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 500 }}>{item.productNameSnapshot}</td>
                          <td>
                            <strong>{item.quantity}</strong> units
                          </td>
                          <td>₹{price.toFixed(2)}</td>
                          <td>₹{total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
              {canCreateOrConfirm && selectedChallan.status === 'DRAFT' && (
                <button
                  className="btn btn-success"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleConfirmChallan(selectedChallan);
                  }}
                >
                  ✓ Confirm Challan (Deduct Stock)
                </button>
              )}
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
