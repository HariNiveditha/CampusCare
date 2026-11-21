import React, { useState, useEffect } from 'react';

const ComplaintCard = ({
  complaint,
  isAdmin = false,
  isMyComplaint = false,
  onUpvote = null,
  onStatusChange = null,
  onPriorityChange = null,
  onAssign = null,
  onAddWorkNote = null,
  hasUpvoted = false,
  adminUsers = [],
}) => {
  const [newStatus, setNewStatus] = useState(complaint.status || 'Submitted');
  const [newPriority, setNewPriority] = useState(complaint.priority || 'Medium');
  const [assignedAdmin, setAssignedAdmin] = useState(complaint.assignedTo || '');
  const [adminResponse, setAdminResponse] = useState(complaint.adminResponse || '');
  const [workNoteText, setWorkNoteText] = useState('');
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [showWorkNotes, setShowWorkNotes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [imgLoadError, setImgLoadError] = useState(false);

  // Keep local control states synchronized when complaint prop updates
  useEffect(() => {
    setNewStatus(complaint.status || 'Submitted');
    setNewPriority(complaint.priority || 'Medium');
    setAssignedAdmin(complaint.assignedTo || '');
    setAdminResponse(complaint.adminResponse || '');
  }, [complaint.status, complaint.priority, complaint.assignedTo, complaint.adminResponse]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getImageSrc = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:')) {
      return photo;
    }
    return `http://localhost:5000${photo}`;
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical':
        return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #F87171' };
      case 'High':
        return { background: '#FFEDD5', color: '#C2410C', border: '1px solid #FB923C' };
      case 'Medium':
        return { background: '#FEF3C7', color: '#B45309', border: '1px solid #FBBF24' };
      case 'Low':
        return { background: '#ECFDF5', color: '#047857', border: '1px solid #34D399' };
      default:
        return { background: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB' };
    }
  };

  const handleStatusUpdate = async () => {
    if (onStatusChange) {
      try {
        setActionLoading(true);
        await onStatusChange(newStatus, adminResponse);
        setShowResponseInput(false);
        setActionSuccess('Status updated!');
        setTimeout(() => setActionSuccess(''), 2500);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handlePriorityUpdate = async () => {
    if (onPriorityChange) {
      try {
        setActionLoading(true);
        await onPriorityChange(newPriority);
        setActionSuccess('Priority updated!');
        setTimeout(() => setActionSuccess(''), 2500);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAssignUpdate = async () => {
    if (onAssign) {
      try {
        setActionLoading(true);
        await onAssign(assignedAdmin || null);
        setActionSuccess('Assignment updated!');
        setTimeout(() => setActionSuccess(''), 2500);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleWorkNoteSubmit = async (e) => {
    e.preventDefault();
    if (!workNoteText.trim() || !onAddWorkNote) return;
    try {
      setActionLoading(true);
      await onAddWorkNote(workNoteText.trim());
      setWorkNoteText('');
      setActionSuccess('Work note added!');
      setTimeout(() => setActionSuccess(''), 2500);
    } finally {
      setActionLoading(false);
    }
  };

  const displayTicket = complaint.ticketNumber || `#${(complaint._id || complaint.id || '').slice(-6)}`;
  const complaintName = complaint.userName || complaint.studentName;
  const complaintTitle = complaint.title || 'Campus Issue';
  const photoUrl = getImageSrc(complaint.photo);

  return (
    <div
      className="complaint-card"
      style={{
        borderLeft: `6px solid ${getPriorityStyle(complaint.priority || 'Medium').border}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '280px',
      }}
    >
      <div className="complaint-header">
        <div>
          <span style={{
            fontSize: '15px',
            fontWeight: '700',
            color: '#FF7A29',
            fontFamily: 'monospace',
            background: '#FFF0E6',
            padding: '3px 8px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            {displayTicket}
          </span>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="complaint-category">{complaint.category}</span>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '12px',
              ...getPriorityStyle(complaint.priority || 'Medium'),
            }}>
              {complaint.priority || 'Medium'} Priority
            </span>
          </div>
        </div>
        <div className={`status-badge status-${(complaint.status || 'submitted').toLowerCase().replace(' ', '-')}`}>
          {complaint.status || 'Submitted'}
        </div>
      </div>

      <h3 className="complaint-title" style={{ marginTop: '12px' }}>
        {complaintTitle}
      </h3>

      <div className="complaint-details" style={{ fontSize: '14px', lineHeight: '1.6' }}>
        <p>
          <strong>Reported by:</strong> {complaintName}{' '}
          {complaint.userId && (
            <span style={{ color: '#6B7280', fontSize: '12px' }}>
              (ID: {typeof complaint.userId === 'object' ? (complaint.userId._id || complaint.userId.id) : complaint.userId})
            </span>
          )}
        </p>
        {complaint.location && (
          <p>
            <strong>📍 Location:</strong> <span style={{ color: '#2563EB', fontWeight: '500' }}>{complaint.location}</span>
          </p>
        )}
        <p>
          <strong>Issue:</strong> {complaint.description}
        </p>
        <p>
          <strong>Date:</strong> {formatDate(complaint.createdAt)}
        </p>
        {complaint.assignedToName && (
          <p>
            <strong>👤 Assigned Admin:</strong> {complaint.assignedToName}
          </p>
        )}
      </div>

      {photoUrl && !imgLoadError && (
        <div
          style={{
            margin: '12px 0',
            height: '180px',
            width: '100%',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: '#F3F4F6',
            border: '1px solid #E5E7EB',
          }}
        >
          <img
            src={photoUrl}
            alt="Complaint Attachment"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={() => {
              setImgLoadError(true);
            }}
          />
        </div>
      )}

      {complaint.adminResponse && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#E8F5E9',
            borderLeft: '4px solid #4CAF50',
            borderRadius: '5px',
            fontSize: '14px',
            color: '#2E7D32',
          }}
        >
          <strong>📌 Public Admin Response:</strong> {complaint.adminResponse}
        </div>
      )}

      {/* Internal Work Notes - Strictly Admin Only */}
      {isAdmin && (
        <div style={{ marginTop: '15px', borderTop: '1px dashed #D1D5DB', paddingTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563' }}>
              🔒 Internal Work Notes ({complaint.workNotes?.length || 0})
            </span>
            <button
              type="button"
              onClick={() => setShowWorkNotes(!showWorkNotes)}
              style={{
                fontSize: '12px',
                padding: '4px 8px',
                background: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {showWorkNotes ? 'Hide Notes' : 'View / Add Notes'}
            </button>
          </div>

          {showWorkNotes && (
            <div style={{ marginTop: '10px', background: '#F9FAFB', padding: '10px', borderRadius: '6px' }}>
              {complaint.workNotes && complaint.workNotes.length > 0 ? (
                <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '10px' }}>
                  {complaint.workNotes.map((wn, idx) => (
                    <div
                      key={wn._id || idx}
                      style={{
                        padding: '8px',
                        marginBottom: '6px',
                        background: 'white',
                        borderLeft: '3px solid #6366F1',
                        borderRadius: '3px',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', fontSize: '11px' }}>
                        <span>👤 {wn.authorName}</span>
                        <span>{formatDate(wn.createdAt)}</span>
                      </div>
                      <div style={{ marginTop: '4px', color: '#1F2937' }}>{wn.note}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 8px 0' }}>No internal work notes yet.</p>
              )}

              <form onSubmit={handleWorkNoteSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add internal administrative note..."
                  value={workNoteText}
                  onChange={(e) => setWorkNoteText(e.target.value)}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                  }}
                />
                <button
                  type="submit"
                  disabled={actionLoading || !workNoteText.trim()}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    background: '#6366F1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Add Note
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {actionSuccess && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669', fontWeight: 'bold' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* Action Footer */}
      <div className="complaint-footer" style={{ marginTop: '15px' }}>
        {isAdmin ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Admin Management Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '11px', display: 'block', color: '#6B7280', fontWeight: 'bold' }}>STATUS</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', display: 'block', color: '#6B7280', fontWeight: 'bold' }}>PRIORITY</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  style={{ padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                <button
                  type="button"
                  onClick={handlePriorityUpdate}
                  disabled={actionLoading || newPriority === complaint.priority}
                  style={{
                    marginLeft: '4px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    background: '#FF9F5A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Set
                </button>
              </div>

              <div>
                <label style={{ fontSize: '11px', display: 'block', color: '#6B7280', fontWeight: 'bold' }}>ASSIGN TO</label>
                <select
                  value={assignedAdmin}
                  onChange={(e) => setAssignedAdmin(e.target.value)}
                  style={{ padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                >
                  <option value="">-- Unassigned --</option>
                  {adminUsers.map((adm) => (
                    <option key={adm._id} value={adm._id}>
                      {adm.username}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignUpdate}
                  disabled={actionLoading || assignedAdmin === (complaint.assignedTo || '')}
                  style={{
                    marginLeft: '4px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    background: '#2563EB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Assign
                </button>
              </div>

              <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowResponseInput(!showResponseInput)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '13px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {showResponseInput ? 'Hide Response' : 'Admin Response'}
                </button>
                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={actionLoading}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Save Status
                </button>
              </div>
            </div>

            {showResponseInput && (
              <div style={{ marginTop: '8px' }}>
                <textarea
                  placeholder="Enter public administrative response to be seen by students..."
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    fontSize: '13px',
                    minHeight: '60px',
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="upvote-section" style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
            <button
              className={`upvote-btn ${hasUpvoted ? 'upvoted' : ''}`}
              onClick={onUpvote}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: '600',
              }}
            >
              👍 {hasUpvoted ? 'Upvoted' : 'Upvote'}
            </button>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>
              {complaint.upvotes || 0} {(complaint.upvotes || 0) === 1 ? 'vote' : 'votes'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintCard;
