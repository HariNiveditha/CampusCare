import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { ComplaintContext } from '../context/ComplaintContext';
import ComplaintForm from './ComplaintForm';
import ComplaintCard from './ComplaintCard';
import NotificationBell from './NotificationBell';
import KnowledgeBaseStudent from './KnowledgeBaseStudent';

const StudentDashboard = ({ user, onLogout }) => {
  const { complaints, upvoteComplaint, getComplaintsByStudent, fetchAllComplaints } =
    useContext(ComplaintContext);
  const [activeTab, setActiveTab] = useState('submit');
  const [successMessage, setSuccessMessage] = useState('');
  const [myComplaints, setMyComplaints] = useState([]);
  const [myComplaintsLoading, setMyComplaintsLoading] = useState(false);
  const [myComplaintsError, setMyComplaintsError] = useState(null);

  const studentId = user?.id || user?._id;
  const isFetchingRef = useRef(false);

  // Dedicated, safe fetcher for the authenticated student's tickets
  const fetchMyComplaints = useCallback(async () => {
    if (!studentId || isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setMyComplaintsLoading(true);
      setMyComplaintsError(null);
      const data = await getComplaintsByStudent(studentId);
      setMyComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching student complaints:', err);
      setMyComplaintsError(
        err.response?.data?.message || err.message || 'Failed to load your complaints. Please try again.'
      );
    } finally {
      setMyComplaintsLoading(false);
      isFetchingRef.current = false;
    }
  }, [getComplaintsByStudent, studentId]);

  // Load student complaints and community complaints once on mount
  useEffect(() => {
    fetchMyComplaints();
    fetchAllComplaints();
  }, [fetchMyComplaints, fetchAllComplaints]);

  // Fetch when switching to view tab if needed
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'view' && myComplaints.length === 0 && !myComplaintsError && !myComplaintsLoading) {
      fetchMyComplaints();
    }
  };

  const handleComplaintSubmit = async () => {
    setSuccessMessage('✅ Complaint submitted successfully! Ticket generated.');
    await fetchMyComplaints();
    await fetchAllComplaints();
    setActiveTab('view');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleUpvote = async (complaintId) => {
    try {
      await upvoteComplaint(complaintId);
      // Refresh myComplaints if the upvoted complaint belongs to the student
      await fetchMyComplaints();
    } catch (error) {
      console.error('Error upvoting complaint:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>🎓 Student Support Center</h1>
          <p>Welcome, <strong>{user.username}</strong> | Campus Maintenance Redressal</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          <button
            onClick={() => {
              fetchMyComplaints();
              fetchAllComplaints();
            }}
            style={{
              padding: '8px 14px',
              background: '#FFF0E6',
              border: '1px solid #FF9F5A',
              color: '#FF7A29',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            ↻ Refresh
          </button>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {/* Tabs */}
        <div style={{ marginBottom: '25px', borderBottom: '2px solid #FFE5CC' }}>
          <button
            type="button"
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'submit' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'submit' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              marginRight: '10px',
              borderRadius: '5px 5px 0 0',
              transition: 'all 0.3s',
            }}
            onClick={() => handleTabSwitch('submit')}
          >
            📝 Submit New Complaint
          </button>
          <button
            type="button"
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'view' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'view' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '5px 5px 0 0',
              transition: 'all 0.3s',
            }}
            onClick={() => handleTabSwitch('view')}
          >
            📋 My Submitted Tickets ({myComplaints.length})
          </button>
          <button
            type="button"
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'kb' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'kb' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              marginLeft: '10px',
              borderRadius: '5px 5px 0 0',
              transition: 'all 0.3s',
            }}
            onClick={() => handleTabSwitch('kb')}
          >
            📚 Knowledge Base & Help Guides
          </button>
        </div>

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <ComplaintForm
            studentId={user.id}
            userName={user.username}
            onSubmit={handleComplaintSubmit}
          />
        )}

        {/* View Tab: My Submitted Tickets Section */}
        {activeTab === 'view' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1F2937' }}>My Submitted Tickets</h2>
              <button
                type="button"
                onClick={fetchMyComplaints}
                disabled={myComplaintsLoading}
                style={{
                  padding: '6px 12px',
                  background: '#F3F4F6',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  cursor: myComplaintsLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {myComplaintsLoading ? 'Refreshing...' : '↻ Reload Tickets'}
              </button>
            </div>

            {/* Error State with Retry Button */}
            {myComplaintsError && (
              <div
                className="alert alert-error"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <span>⚠️ {myComplaintsError}</span>
                <button
                  type="button"
                  onClick={fetchMyComplaints}
                  style={{
                    padding: '6px 14px',
                    background: '#B91C1C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                  }}
                >
                  ↻ Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton: Matches complaints-container grid to prevent layout shifting */}
            {myComplaintsLoading && (
              <div className="complaints-container" style={{ minHeight: '340px' }}>
                {[1, 2, 3].map((placeholder) => (
                  <div
                    key={placeholder}
                    className="complaint-card"
                    style={{
                      borderLeft: '6px solid #CBD5E1',
                      minHeight: '280px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: '#FAFAFA',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          height: '24px',
                          width: '100px',
                          background: '#E2E8F0',
                          borderRadius: '4px',
                          marginBottom: '10px',
                        }}
                      />
                      <div
                        style={{
                          height: '20px',
                          width: '75%',
                          background: '#E2E8F0',
                          borderRadius: '4px',
                          marginBottom: '14px',
                        }}
                      />
                      <div
                        style={{
                          height: '14px',
                          width: '100%',
                          background: '#E2E8F0',
                          borderRadius: '4px',
                          marginBottom: '8px',
                        }}
                      />
                      <div
                        style={{
                          height: '14px',
                          width: '85%',
                          background: '#E2E8F0',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        height: '32px',
                        width: '100%',
                        background: '#E2E8F0',
                        borderRadius: '4px',
                        marginTop: '15px',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!myComplaintsLoading && !myComplaintsError && myComplaints.length === 0 && (
              <div
                className="empty-state"
                style={{
                  padding: '50px 20px',
                  background: '#FAFAFA',
                  borderRadius: '8px',
                  border: '1px dashed #D1D5DB',
                  minHeight: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '42px', marginBottom: '10px' }}>📋</div>
                <h3 style={{ color: '#1F2937', marginBottom: '8px' }}>No Tickets Submitted Yet</h3>
                <p style={{ color: '#6B7280', marginBottom: '16px' }}>
                  You have not submitted any complaints yet. Report a maintenance issue to track its status here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  style={{
                    padding: '8px 18px',
                    background: '#FF9F5A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Submit a Complaint
                </button>
              </div>
            )}

            {/* Loaded Tickets Grid */}
            {!myComplaintsLoading && !myComplaintsError && myComplaints.length > 0 && (
              <div className="complaints-container" style={{ minHeight: '340px' }}>
                {myComplaints.map((complaint) => (
                  <ComplaintCard
                    key={complaint._id}
                    complaint={complaint}
                    isAdmin={false}
                    isMyComplaint={true}
                    onUpvote={() => handleUpvote(complaint._id)}
                    hasUpvoted={complaint.upvotedBy?.includes(studentId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'kb' && <KnowledgeBaseStudent />}

        {/* All Campus Complaints Section (For Upvoting) - UNCHANGED */}
        <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #E5E7EB' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#1F2937' }}>📢 Campus Issues Community Board</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6B7280' }}>
              Upvote active campus issues that affect you so maintenance teams can address high-impact issues first.
            </p>
          </div>

          {complaints.length === 0 ? (
            <div className="empty-state">
              <h3>No complaints currently active on campus</h3>
              <p>Everything is running smoothly!</p>
            </div>
          ) : (
            <div className="complaints-container">
              {complaints
                .slice()
                .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
                .map((complaint) => (
                  <ComplaintCard
                    key={complaint._id}
                    complaint={complaint}
                    isAdmin={false}
                    isMyComplaint={complaint.userId === (user?.id || user?._id)}
                    onUpvote={() => handleUpvote(complaint._id)}
                    hasUpvoted={complaint.upvotedBy?.includes(user?.id || user?._id)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
