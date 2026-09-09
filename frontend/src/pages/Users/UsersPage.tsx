import React, { useState, useEffect, useCallback } from 'react';
import type { User, Role } from '../../types';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES' as Role,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'SALES' as Role,
    password: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<User[]>('/users');
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load user directory', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const salesCount = users.filter((u) => u.role === 'SALES').length;
  const warehouseCount = users.filter((u) => u.role === 'WAREHOUSE').length;
  const accountsCount = users.filter((u) => u.role === 'ACCOUNTS').length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/users', {
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        role: addForm.role,
      });
      showToast(`User "${addForm.name}" created successfully!`, 'success');
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'SALES',
      });
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const payload: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await api.put(`/users/${selectedUser.id}`, payload);
      showToast(`User "${editForm.name}" updated successfully!`, 'success');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (u: User) => {
    setSelectedUser(u);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.delete(`/users/${selectedUser.id}`);
      showToast(`User "${selectedUser.name}" removed successfully`, 'success');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: Role) => {
    const config: Record<Role, { label: string; className: string }> = {
      ADMIN: { label: 'Administrator', className: 'role-badge role-badge-admin' },
      SALES: { label: 'Sales', className: 'role-badge role-badge-sales' },
      WAREHOUSE: { label: 'Warehouse', className: 'role-badge role-badge-warehouse' },
      ACCOUNTS: { label: 'Accounts', className: 'role-badge role-badge-accounts' },
    };
    const c = config[role] || { label: role, className: 'role-badge' };
    return <span className={c.className}>{c.label}</span>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Manage team accounts, assign roles, and provision new credentials.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add User
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Users</div>
          <div className="kpi-value">{totalUsers}</div>
          <div className="kpi-subtitle">Active accounts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Administrators</div>
          <div className="kpi-value" style={{ color: '#4338ca' }}>
            {adminCount}
          </div>
          <div className="kpi-subtitle">Full system access</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Sales</div>
          <div className="kpi-value" style={{ color: '#15803d' }}>
            {salesCount}
          </div>
          <div className="kpi-subtitle">CRM & Challans</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Warehouse</div>
          <div className="kpi-value" style={{ color: '#b45309' }}>
            {warehouseCount}
          </div>
          <div className="kpi-subtitle">Inventory & Dispatch</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Accounts</div>
          <div className="kpi-value" style={{ color: '#475569' }}>
            {accountsCount}
          </div>
          <div className="kpi-subtitle">Read-only audit</div>
        </div>
      </div>

      {/* Filters + Table Card */}
      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search by name or email..."
                className="input search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ minWidth: '160px' }}
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Administrator</option>
                <option value="SALES">Sales</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="ACCOUNTS">Accounts</option>
              </select>
            </div>
            {(search || roleFilter) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Users Table */}
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Activity</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const challanCount = u._count?.challansCreated ?? 0;
                    const stockCount = u._count?.stockLogs ?? 0;
                    const hasActivity = challanCount > 0 || stockCount > 0;

                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar">
                              {getInitials(u.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {u.name}
                                {isSelf && (
                                  <span style={{ fontSize: '10px', color: '#6366f1', marginLeft: '6px' }}>
                                    (You)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#475569' }}>{u.email}</span>
                        </td>
                        <td>{getRoleBadge(u.role)}</td>
                        <td>
                          {hasActivity ? (
                            <span style={{ fontSize: '12px', color: '#334155' }}>
                              <strong>{challanCount}</strong> challan(s) · <strong>{stockCount}</strong> log(s)
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>No activity</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '6px' }}
                            onClick={() => openEditModal(u)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger-outline btn-sm"
                            disabled={isSelf}
                            onClick={() => openDeleteModal(u)}
                            title={isSelf ? 'Cannot delete yourself' : 'Delete'}
                            style={{ opacity: isSelf ? 0.4 : 1 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        size="normal"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              required
              placeholder="e.g. Vikram Sharma"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="input"
              style={{ width: '100%' }}
              required
              placeholder="e.g. vikram@operations.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password * (min 6 characters)</label>
            <input
              type="password"
              className="input"
              style={{ width: '100%' }}
              required
              minLength={6}
              placeholder="••••••••"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
            />
            <p className="form-hint">
              User will sign in with this password alongside their email.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Role *</label>
            <select
              className="select"
              style={{ width: '100%' }}
              required
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role })}
            >
              <option value="SALES">Sales - CRM, Customers & Draft Challans</option>
              <option value="WAREHOUSE">Warehouse - Inventory & Dispatch</option>
              <option value="ACCOUNTS">Accounts - Read-only Audit Access</option>
              <option value="ADMIN">Administrator - Full System Access</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit - ${selectedUser?.name}`}
        size="normal"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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

          <div className="form-group">
            <label className="form-label">Role *</label>
            <select
              className="select"
              style={{ width: '100%' }}
              required
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
            >
              <option value="ADMIN">Administrator</option>
              <option value="SALES">Sales</option>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="ACCOUNTS">Accounts</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Reset Password (leave blank to keep unchanged)</label>
            <input
              type="password"
              className="input"
              style={{ width: '100%' }}
              minLength={6}
              placeholder="New password (optional)"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="normal"
      >
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete{' '}
            <strong>{selectedUser?.name}</strong> (<span style={{ color: '#64748b' }}>{selectedUser?.email}</span>)?
          </p>

          {((selectedUser?._count?.challansCreated ?? 0) > 0 || (selectedUser?._count?.stockLogs ?? 0) > 0) && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fee2e2',
                color: '#991b1b',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <strong>Warning:</strong> This user has authored challans or stock logs. Accounts with audit trails cannot be deleted - consider reassigning their role instead.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={submitting}
            onClick={handleDeleteSubmit}
          >
            {submitting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
