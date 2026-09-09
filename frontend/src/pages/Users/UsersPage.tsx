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
    switch (role) {
      case 'ADMIN':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#e0e7ff',
              color: '#4338ca',
            }}
          >
            👑 Administrator
          </span>
        );
      case 'SALES':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#dcfce7',
              color: '#15803d',
            }}
          >
            💼 Sales
          </span>
        );
      case 'WAREHOUSE':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#fef3c7',
              color: '#b45309',
            }}
          >
            🏭 Warehouse
          </span>
        );
      case 'ACCOUNTS':
        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#475569',
            }}
          >
            📊 Accounts
          </span>
        );
      default:
        return <span>{role}</span>;
    }
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management & Permissions</h1>
          <p className="page-subtitle">
            Manage enterprise team accounts, assign RBAC access roles, and provision new credentials.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add New User
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Total Staff Accounts</div>
          <div className="kpi-value">{totalUsers}</div>
          <div className="kpi-subtitle">Active provisioned users</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Administrators</div>
          <div className="kpi-value" style={{ color: '#4338ca' }}>
            {adminCount}
          </div>
          <div className="kpi-subtitle">Full system control</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Sales Executives</div>
          <div className="kpi-value" style={{ color: '#15803d' }}>
            {salesCount}
          </div>
          <div className="kpi-subtitle">CRM & Draft Challans</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Warehouse Staff</div>
          <div className="kpi-value" style={{ color: '#b45309' }}>
            {warehouseCount}
          </div>
          <div className="kpi-subtitle">Inventory & Dispatch</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Accounts / Audit</div>
          <div className="kpi-value" style={{ color: '#475569' }}>
            {accountsCount}
          </div>
          <div className="kpi-subtitle">Read-only ledger audit</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '20px 0' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '240px' }}
        />
        <select
          className="select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Administrators</option>
          <option value="SALES">Sales Executives</option>
          <option value="WAREHOUSE">Warehouse Staff</option>
          <option value="ACCOUNTS">Accounts / Audit</option>
        </select>
        {(search || roleFilter) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearch('');
              setRoleFilter('');
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Staff Member</th>
              <th style={{ width: '25%' }}>Email Address</th>
              <th style={{ width: '18%' }}>System Role</th>
              <th style={{ width: '15%' }}>Audit Activity</th>
              <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading staff directory...
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
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '12px',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {u.name} {isSelf && <span style={{ fontSize: '10px', color: '#6366f1' }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Added {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '13px' }}>{u.email}</code>
                    </td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#334155' }}>
                        {hasActivity ? (
                          <span>
                            <strong>{challanCount}</strong> challan(s) · <strong>{stockCount}</strong> log(s)
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No activity yet</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginRight: '6px' }}
                        onClick={() => openEditModal(u)}
                        title="Edit User"
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: isSelf ? '#94a3b8' : '#dc2626',
                          cursor: isSelf ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isSelf}
                        onClick={() => openDeleteModal(u)}
                        title={isSelf ? 'Cannot delete yourself' : 'Delete User'}
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

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Staff User"
        size="normal"
      >
        <form onSubmit={handleAddSubmit}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
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

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Corporate Email Address *</label>
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

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Initial Password * (min 6 chars)</label>
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
            <p className="form-hint" style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              The employee will use this password alongside their email to authenticate.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">System Role & Permissions *</label>
            <select
              className="select"
              style={{ width: '100%' }}
              required
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role })}
            >
              <option value="SALES">Sales Executive - CRM, Customer Directory & Draft Challans</option>
              <option value="WAREHOUSE">Warehouse Staff - Inventory Adjustments & Dispatch Confirmation</option>
              <option value="ACCOUNTS">Accounts / Auditor - Read-only Financial Ledger & Audit Access</option>
              <option value="ADMIN">Administrator - Unrestricted Master System Access</option>
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
              {submitting ? 'Creating User...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User - ${selectedUser?.name}`}
        size="normal"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
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

          <div className="form-group" style={{ marginBottom: '14px' }}>
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

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Assigned Role *</label>
            <select
              className="select"
              style={{ width: '100%' }}
              required
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
            >
              <option value="ADMIN">Administrator (Full Access)</option>
              <option value="SALES">Sales Executive</option>
              <option value="WAREHOUSE">Warehouse Staff</option>
              <option value="ACCOUNTS">Accounts / Auditor</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Reset Password (Leave blank to keep unchanged)</label>
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
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm User Account Deletion"
        size="normal"
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete staff member{' '}
            <strong>{selectedUser?.name}</strong> (<code>{selectedUser?.email}</code>)?
          </p>

          {((selectedUser?._count?.challansCreated ?? 0) > 0 || (selectedUser?._count?.stockLogs ?? 0) > 0) && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                border: '1px solid #fee2e2',
                color: '#991b1b',
                fontSize: '12px',
              }}
            >
              ⚠️ <strong>Audit Notice:</strong> This user has authored delivery challans or stock adjustment logs. Under enterprise accounting rules, accounts with historical audit trails cannot be deleted. You can reassign their role instead.
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
            className="btn btn-primary"
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
            disabled={submitting}
            onClick={handleDeleteSubmit}
          >
            {submitting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
