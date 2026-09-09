import React, { useState, useEffect, useCallback } from 'react';
import type { Product, StockLog, PaginationMeta } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLogs, setProductLogs] = useState<StockLog[]>([]);

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    initialStock: '0',
    minStockAlert: '10',
    location: '',
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    unitPrice: '',
    minStockAlert: '',
    location: '',
  });

  // Adjust Stock Form state
  const [adjustForm, setAdjustForm] = useState({
    quantity: '1',
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });

  const canManageStock = hasRole(['ADMIN', 'WAREHOUSE']);

  const fetchProducts = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      try {
        const res = await api.get<Product[]>('/products', {
          page,
          limit: pagination.limit,
          search: search || undefined,
          category: category || undefined,
          lowStockOnly: lowStockOnly ? 'true' : undefined,
        });
        setProducts(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load products', 'error');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, search, category, lowStockOnly, showToast]
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Handle Add Product
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        name: addForm.name,
        sku: addForm.sku,
        category: addForm.category,
        unitPrice: parseFloat(addForm.unitPrice),
        initialStock: parseInt(addForm.initialStock, 10) || 0,
        minStockAlert: parseInt(addForm.minStockAlert, 10) || 0,
        location: addForm.location || null,
      });
      showToast(`Product "${addForm.name}" created successfully!`, 'success');
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        sku: '',
        category: '',
        unitPrice: '',
        initialStock: '0',
        minStockAlert: '10',
        location: '',
      });
      fetchProducts(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create product', 'error');
    }
  };

  // Handle Edit Product
  const openEditModal = (p: Product) => {
    setSelectedProduct(p);
    setEditForm({
      name: p.name,
      category: p.category,
      unitPrice: String(p.unitPrice),
      minStockAlert: String(p.minStockAlert),
      location: p.location || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await api.put(`/products/${selectedProduct.id}`, {
        name: editForm.name,
        category: editForm.category,
        unitPrice: parseFloat(editForm.unitPrice),
        minStockAlert: parseInt(editForm.minStockAlert, 10) || 0,
        location: editForm.location || null,
      });
      showToast(`Product "${editForm.name}" updated!`, 'success');
      setIsEditModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to update product', 'error');
    }
  };

  // Handle Adjust Stock
  const openAdjustModal = (p: Product) => {
    setSelectedProduct(p);
    setAdjustForm({
      quantity: '5',
      movementType: 'IN',
      reason: '',
    });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await api.post(`/products/${selectedProduct.id}/stock`, {
        quantity: parseInt(adjustForm.quantity, 10),
        movementType: adjustForm.movementType,
        reason: adjustForm.reason,
      });
      showToast(
        `Stock adjusted (${adjustForm.movementType} ${adjustForm.quantity} units) for "${selectedProduct.name}"`,
        'success'
      );
      setIsAdjustModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    }
  };

  // Handle View Logs
  const openLogsModal = async (p: Product) => {
    setSelectedProduct(p);
    setIsLogsModalOpen(true);
    try {
      const res = await api.get<StockLog[]>(`/products/${p.id}/logs`);
      setProductLogs(res.data);
    } catch (err: any) {
      showToast('Failed to load stock movement audit log', 'error');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Products & Inventory Control</h2>
            <p className="card-subtitle">
              Manage product catalog and track verified physical inventory movements
            </p>
          </div>
          {canManageStock && (
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              + Add Product
            </button>
          )}
        </div>

        <div className="card-body">
          {/* Filters & Search Toolbar */}
          <div className="toolbar">
            <div className="filter-group">
              <input
                type="text"
                className="input search-input"
                placeholder="Search by name, SKU, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Fasteners">Fasteners</option>
                <option value="Bearings">Bearings</option>
                <option value="Adhesives">Adhesives</option>
                <option value="Gaskets">Gaskets</option>
                <option value="Tools">Tools</option>
              </select>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  fontWeight: 500,
                  color: lowStockOnly ? '#dc2626' : '#334155',
                }}
              >
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                ⚠️ Show Low Stock Only
              </label>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => fetchProducts(1)}>
              ↻ Refresh
            </button>
          </div>

          {/* Products Table */}
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Location</th>
                  <th>Min Alert</th>
                  <th>Current Stock</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLowStock = p.currentStock <= p.minStockAlert;
                    return (
                      <tr key={p.id}>
                        <td>
                          <code style={{ fontWeight: 600 }}>{p.sku}</code>
                        </td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>{p.category}</td>
                        <td>₹{parseFloat(String(p.unitPrice)).toFixed(2)}</td>
                        <td>{p.location || '—'}</td>
                        <td>{p.minStockAlert}</td>
                        <td>
                          {isLowStock ? (
                            <span className="stock-badge-low" title="Below minimum stock threshold!">
                              ⚠️ {p.currentStock} units
                            </span>
                          ) : (
                            <span className="stock-badge-normal">{p.currentStock} units</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '6px' }}
                            onClick={() => openLogsModal(p)}
                            title="Audit Log"
                          >
                            📜 Logs
                          </button>

                          {canManageStock && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ marginRight: '6px' }}
                                onClick={() => openEditModal(p)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openAdjustModal(p)}
                              >
                                ⇄ Stock
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

          <Pagination meta={pagination} onPageChange={fetchProducts} />
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Catalog Product"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Hex Head Cap Screw M10"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">SKU Code *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.sku}
                onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                placeholder="e.g. HEX-M10-100"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                placeholder="e.g. Fasteners"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                style={{ width: '100%' }}
                required
                value={addForm.unitPrice}
                onChange={(e) => setAddForm({ ...addForm, unitPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Stock</label>
              <input
                type="number"
                min="0"
                className="input"
                style={{ width: '100%' }}
                value={addForm.initialStock}
                onChange={(e) => setAddForm({ ...addForm, initialStock: e.target.value })}
              />
              <p className="form-hint">Automatically creates initial audited StockLog IN entry</p>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Min Stock Alert Level</label>
              <input
                type="number"
                min="0"
                className="input"
                style={{ width: '100%' }}
                value={addForm.minStockAlert}
                onChange={(e) => setAddForm({ ...addForm, minStockAlert: e.target.value })}
              />
              <p className="form-hint">Triggers red warning badge if stock reaches or drops below this</p>
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Location</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                placeholder="e.g. Rack A-12, Bin 3"
              />
            </div>
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
              Create Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Product (${selectedProduct?.sku})`}
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                required
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                style={{ width: '100%' }}
                required
                value={editForm.unitPrice}
                onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Min Stock Alert Level</label>
              <input
                type="number"
                min="0"
                className="input"
                style={{ width: '100%' }}
                value={editForm.minStockAlert}
                onChange={(e) => setEditForm({ ...editForm, minStockAlert: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Warehouse Location</label>
              <input
                type="text"
                className="input"
                style={{ width: '100%' }}
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#64748b',
              marginTop: '10px',
            }}
          >
            🔒 <strong>Inventory Integrity:</strong> Stock cannot be edited directly on catalog updates.
            To change stock, use the <strong>⇄ Stock</strong> button to create an audited IN/OUT movement.
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
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock — ${selectedProduct?.name}`}
      >
        <form onSubmit={handleAdjustSubmit}>
          <div style={{ marginBottom: '16px', padding: '12px', background: '#f1f5f9', borderRadius: '6px' }}>
            <div>
              SKU: <code>{selectedProduct?.sku}</code>
            </div>
            <div style={{ marginTop: '4px' }}>
              Current Physical Stock: <strong>{selectedProduct?.currentStock} units</strong>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Movement Direction *</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={adjustForm.movementType}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, movementType: e.target.value as 'IN' | 'OUT' })
                }
              >
                <option value="IN">📥 Stock IN (Increase)</option>
                <option value="OUT">📤 Stock OUT (Decrease)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input
                type="number"
                min="1"
                className="input"
                style={{ width: '100%' }}
                required
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Audit Reason *</label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              required
              placeholder="e.g. Received shipment PO-404, Quality sample test, Damaged in transit"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
            />
          </div>

          {/* New Stock preview */}
          {selectedProduct && (
            <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '14px', fontWeight: 500 }}>
              Resulting Stock: {selectedProduct.currentStock}{' '}
              {adjustForm.movementType === 'IN' ? '+' : '-'}{' '}
              {parseInt(adjustForm.quantity, 10) || 0} ={' '}
              <strong>
                {adjustForm.movementType === 'IN'
                  ? selectedProduct.currentStock + (parseInt(adjustForm.quantity, 10) || 0)
                  : selectedProduct.currentStock - (parseInt(adjustForm.quantity, 10) || 0)}{' '}
                units
              </strong>
            </div>
          )}

          <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm Stock Movement
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`Stock Audit History — ${selectedProduct?.name}`}
        size="large"
      >
        <div style={{ marginBottom: '14px', fontSize: '12px', color: '#64748b' }}>
          SKU: <code>{selectedProduct?.sku}</code> | Current Stock: <strong>{selectedProduct?.currentStock} units</strong>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Movement</th>
                <th>Qty</th>
                <th>Reason</th>
                <th>Initiated By</th>
              </tr>
            </thead>
            <tbody>
              {productLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                productLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: log.movementType === 'IN' ? '#dcfce7' : '#fee2e2',
                          color: log.movementType === 'IN' ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {log.movementType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {log.movementType === 'IN' ? `+${log.quantityChanged}` : `-${log.quantityChanged}`}
                    </td>
                    <td>{log.reason}</td>
                    <td>
                      {log.createdByUser?.name}{' '}
                      <small style={{ color: '#64748b' }}>({log.createdByUser?.role})</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-footer" style={{ margin: '20px -20px -20px' }}>
          <button className="btn btn-secondary" onClick={() => setIsLogsModalOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};
