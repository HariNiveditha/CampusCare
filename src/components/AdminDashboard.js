import React, { useState, useContext, useMemo, useEffect, useCallback } from 'react';
import { ComplaintContext } from '../context/ComplaintContext';
import { authAPI, auditLogAPI } from '../api/api';
import ComplaintCard from './ComplaintCard';
import NotificationBell from './NotificationBell';
import FlowManagement from './FlowManagement';
import KnowledgeBaseAdmin from './KnowledgeBaseAdmin';
import AnalyticsDashboard from './AnalyticsDashboard';

const AdminDashboard = ({ user, onLogout }) => {
  const {
    complaints,
    loading,
    error,
    updateComplaintStatus,
    updateComplaintPriority,
    assignComplaint,
    addWorkNote,
    fetchAllComplaints,
  } = useContext(ComplaintContext);

  const [activeTab, setActiveTab] = useState('complaints'); // 'complaints' or 'audit'
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Load complaints whenever activeTab switches to 'complaints' and on initial mount
  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchAllComplaints();
    }
  }, [activeTab, fetchAllComplaints]);

  // Periodic background polling for real-time ticket sync (every 20 seconds)
  useEffect(() => {
    if (activeTab !== 'complaints') return;
    const interval = setInterval(() => {
      fetchAllComplaints();
    }, 20000);
    return () => clearInterval(interval);
  }, [activeTab, fetchAllComplaints]);

  // Fetch admin users for assignment dropdown
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await authAPI.getAdmins();
        setAdminUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch admin users:', err);
      }
    };
    fetchAdmins();
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (page = 1, action = '') => {
    try {
      setAuditLoading(true);
      const params = { page, limit: 15 };
      if (action) params.action = action;
      const res = await auditLogAPI.getAuditLogs(params);
      setAuditLogs(res.data.logs);
      setAuditPage(res.data.page);
      setAuditTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs(auditPage, auditActionFilter);
    }
  }, [activeTab, auditPage, auditActionFilter, fetchAuditLogs]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(complaints.map((c) => c.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [complaints]);

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const statusMatch = filterStatus === 'All' || c.status === filterStatus;
      const priorityMatch = filterPriority === 'All' || c.priority === filterPriority;
      const categoryMatch = filterCategory === 'All' || c.category === filterCategory;
      const term = searchTerm.toLowerCase().trim();
      const searchMatch =
        term === '' ||
        (c.ticketNumber && c.ticketNumber.toLowerCase().includes(term)) ||
        (c.title && c.title.toLowerCase().includes(term)) ||
        (c.description && c.description.toLowerCase().includes(term)) ||
        (c.location && c.location.toLowerCase().includes(term)) ||
        (c.category && c.category.toLowerCase().includes(term)) ||
        (c.userName && c.userName.toLowerCase().includes(term)) ||
        (c.studentName && c.studentName.toLowerCase().includes(term)) ||
        (c.assignedToName && c.assignedToName.toLowerCase().includes(term)) ||
        (c.userId && String(typeof c.userId === 'object' ? (c.userId._id || c.userId.id) : c.userId).toLowerCase().includes(term));

      return statusMatch && priorityMatch && categoryMatch && searchMatch;
    });
  }, [complaints, filterStatus, filterPriority, filterCategory, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: complaints.length,
      submitted: complaints.filter((c) => c.status === 'Submitted' || c.status === 'Pending').length,
      inProgress: complaints.filter((c) => c.status === 'In Progress').length,
      resolved: complaints.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length,
      critical: complaints.filter((c) => c.priority === 'Critical').length,
    };
  }, [complaints]);

  const formatTimestamp = (ts) => {
    try {
      return new Date(ts).toLocaleString('en-IN', {
        dateStyle: 'short',
        timeStyle: 'medium',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>⚙️ Service Operations Workspace</h1>
          <p>Administrator: <strong>{user.username}</strong> | College Facilities & Infrastructure</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          <button
            onClick={() => fetchAllComplaints()}
            disabled={loading}
            style={{
              padding: '8px 14px',
              background: '#FFF0E6',
              border: '1px solid #FF9F5A',
              color: '#FF7A29',
              borderRadius: '5px',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: '600',
            }}
          >
            {loading ? '⏳ Syncing...' : '↻ Refresh'}
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #FFE5CC' }}>
          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'complaints' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'complaints' ? 'white' : '#333',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🎫 Ticket Management ({complaints.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'audit' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'audit' ? 'white' : '#333',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📜 Audit Logging Trail
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('flows')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'flows' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'flows' ? 'white' : '#333',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ⚡ Flow Engine & Automation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kb')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'kb' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'kb' ? 'white' : '#333',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📚 Knowledge Base
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'analytics' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'analytics' ? 'white' : '#333',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📊 Reports & Analytics
          </button>
        </div>

        {activeTab === 'complaints' && (
          <>
            {/* KPI Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '15px',
                marginBottom: '25px',
              }}
            >
              <div style={{ background: '#FF9F5A', color: 'white', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '28px', margin: 0 }}>{stats.total}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Total Tickets</p>
              </div>
              <div style={{ background: '#FFA87D', color: 'white', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '28px', margin: 0 }}>{stats.submitted}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Submitted / Pending</p>
              </div>
              <div style={{ background: '#3B82F6', color: 'white', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '28px', margin: 0 }}>{stats.inProgress}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>In Progress</p>
              </div>
              <div style={{ background: '#10B981', color: 'white', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '28px', margin: 0 }}>{stats.resolved}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Resolved / Closed</p>
              </div>
              <div style={{ background: '#EF4444', color: 'white', padding: '16px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '28px', margin: 0 }}>{stats.critical}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Critical Priority</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
              <div className="filter-group">
                <label htmlFor="statusFilter">Status</label>
                <select
                  id="statusFilter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="priorityFilter">Priority</label>
                <select
                  id="priorityFilter"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="categoryFilter">Category</label>
                <select
                  id="categoryFilter"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group" style={{ flex: 1, minWidth: '220px' }}>
                <label htmlFor="searchInput">Search Tickets</label>
                <input
                  id="searchInput"
                  type="text"
                  placeholder="Ticket #, location, student, keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #F87171',
                  color: '#991B1B',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>⚠️ {error}</span>
                <button
                  onClick={() => fetchAllComplaints()}
                  style={{
                    padding: '6px 12px',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Complaint Cards List */}
            <h2 style={{ marginBottom: '15px', color: '#1F2937', fontSize: '18px' }}>
              Active Tickets ({filteredComplaints.length})
            </h2>

            {loading && complaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '18px' }}>Loading tickets from database...</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>Retrieving active complaints across all campus facilities.</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="empty-state">
                <h3>No tickets match your filters</h3>
                <p>Try resetting filters or clear search term</p>
              </div>
            ) : (
              <div className="complaints-container">
                {filteredComplaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint._id}
                    complaint={complaint}
                    isAdmin={true}
                    adminUsers={adminUsers}
                    onStatusChange={(newStatus, adminResponse) =>
                      updateComplaintStatus(complaint._id, newStatus, adminResponse)
                    }
                    onPriorityChange={(priority) =>
                      updateComplaintPriority(complaint._id, priority)
                    }
                    onAssign={(assignedTo) =>
                      assignComplaint(complaint._id, assignedTo)
                    }
                    onAddWorkNote={(note) =>
                      addWorkNote(complaint._id, note)
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1F2937', fontSize: '20px' }}>🛡️ Security & Operations Audit Trail</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                  Immutable log of security-sensitive operations, ticket state transitions, and administrative actions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                >
                  <option value="">All Actions</option>
                  <option value="COMPLAINT_CREATED">COMPLAINT_CREATED</option>
                  <option value="COMPLAINT_STATUS_UPDATED">COMPLAINT_STATUS_UPDATED</option>
                  <option value="COMPLAINT_PRIORITY_UPDATED">COMPLAINT_PRIORITY_UPDATED</option>
                  <option value="COMPLAINT_ASSIGNED">COMPLAINT_ASSIGNED</option>
                  <option value="WORK_NOTE_ADDED">WORK_NOTE_ADDED</option>
                  <option value="ADMIN_RESPONSE_ADDED">ADMIN_RESPONSE_ADDED</option>
                  <option value="USER_LOGIN">USER_LOGIN</option>
                  <option value="USER_REGISTERED">USER_REGISTERED</option>
                </select>
                <button
                  onClick={() => fetchAuditLogs(auditPage, auditActionFilter)}
                  style={{
                    padding: '8px 12px',
                    background: '#F3F4F6',
                    border: '1px solid #D1D5DB',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  Refresh Logs
                </button>
              </div>
            </div>

            {auditLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="empty-state">
                <h3>No audit logs found</h3>
                <p>System actions will be recorded here automatically.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', color: '#4B5563' }}>
                      <th style={{ padding: '10px' }}>Timestamp</th>
                      <th style={{ padding: '10px' }}>Action</th>
                      <th style={{ padding: '10px' }}>Performed By</th>
                      <th style={{ padding: '10px' }}>Role</th>
                      <th style={{ padding: '10px' }}>Entity</th>
                      <th style={{ padding: '10px' }}>Details / Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', color: '#6B7280' }}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              background:
                                log.action.includes('CREATED')
                                  ? '#DEF7EC'
                                  : log.action.includes('UPDATED') || log.action.includes('ASSIGNED')
                                  ? '#E1EFFE'
                                  : log.action.includes('NOTE')
                                  ? '#FDF6B2'
                                  : '#F3F4F6',
                              color:
                                log.action.includes('CREATED')
                                  ? '#03543F'
                                  : log.action.includes('UPDATED') || log.action.includes('ASSIGNED')
                                  ? '#1E429F'
                                  : log.action.includes('NOTE')
                                  ? '#723B13'
                                  : '#374151',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: '500', color: '#111827' }}>
                          {log.username || 'System'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              background: log.role === 'admin' ? '#EDE9FE' : '#F3F4F6',
                              color: log.role === 'admin' ? '#6D28D9' : '#4B5563',
                              fontWeight: '600',
                            }}
                          >
                            {log.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#4B5563' }}>
                          {log.entityType} {log.details?.ticketNumber ? `(${log.details.ticketNumber})` : ''}
                        </td>
                        <td style={{ padding: '10px', color: '#374151', maxWidth: '350px' }}>
                          <pre
                            style={{
                              margin: 0,
                              fontFamily: 'inherit',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontSize: '12px',
                              background: '#F9FAFB',
                              padding: '6px',
                              borderRadius: '4px',
                            }}
                          >
                            {JSON.stringify(log.details, null, 1)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>
                    Page {auditPage} of {auditTotalPages}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '4px',
                        border: '1px solid #D1D5DB',
                        background: auditPage <= 1 ? '#F3F4F6' : 'white',
                        cursor: auditPage <= 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage((p) => p + 1)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '4px',
                        border: '1px solid #D1D5DB',
                        background: auditPage >= auditTotalPages ? '#F3F4F6' : 'white',
                        cursor: auditPage >= auditTotalPages ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'flows' && <FlowManagement />}
        {activeTab === 'kb' && <KnowledgeBaseAdmin />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
};

export default AdminDashboard;
