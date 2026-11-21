import React, { useState, useEffect, useCallback } from 'react';
import { flowAPI } from '../api/api';

const FlowManagement = () => {
  const [flows, setFlows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch all flows
  const fetchFlows = useCallback(async () => {
    try {
      setLoadingFlows(true);
      const res = await flowAPI.getAllFlows();
      setFlows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load flows:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load flow configurations.');
    } finally {
      setLoadingFlows(false);
    }
  }, []);

  // Fetch execution history
  const fetchExecutions = useCallback(async () => {
    try {
      setLoadingExecutions(true);
      const res = await flowAPI.getExecutionHistory({ page: 1, limit: 15 });
      setExecutions(res.data?.executions || []);
    } catch (err) {
      console.error('Failed to load execution history:', err);
    } finally {
      setLoadingExecutions(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
    fetchExecutions();
  }, [fetchFlows, fetchExecutions]);

  // Toggle flow active/inactive
  const handleToggleFlow = async (flowId) => {
    try {
      setErrorMessage(null);
      const res = await flowAPI.toggleFlow(flowId);
      const updated = res.data;
      setFlows((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
      setActionMessage(`Flow "${updated.name}" is now ${updated.isActive ? 'ACTIVE' : 'INACTIVE'}.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('Failed to toggle flow:', err);
      setErrorMessage(err.response?.data?.message || 'Error updating flow state.');
    }
  };

  // Trigger manual escalation cycle
  const handleTriggerEscalation = async () => {
    try {
      setEscalating(true);
      setErrorMessage(null);
      setActionMessage(null);
      const res = await flowAPI.triggerEscalationJob(3);
      setActionMessage(
        `Escalation cycle completed: ${res.data?.escalatedCount || 0} complaint(s) escalated. (Evaluated ${res.data?.checkedCount || 0} pending tickets)`
      );
      // Refresh flows & execution history
      fetchExecutions();
      setTimeout(() => setActionMessage(null), 6000);
    } catch (err) {
      console.error('Failed to trigger escalation job:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to execute escalation cycle.');
    } finally {
      setEscalating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span style={{ backgroundColor: '#DEF7EC', color: '#03543F', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
            ✓ SUCCESS
          </span>
        );
      case 'SKIPPED':
        return (
          <span style={{ backgroundColor: '#FEF08A', color: '#713F12', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
            ⊘ SKIPPED
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ backgroundColor: '#FDE8E8', color: '#9B1C1C', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
            ✕ FAILED
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #FFF8F3 0%, #FFEFE6 100%)',
          borderRadius: '8px',
          border: '1px solid #FFD9C2',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1F2937' }}>
            ⚡ Flow Engine & Workflow Orchestration
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Automate ticket acknowledgments, status alerts, and 3-day SLA escalation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled={escalating}
            onClick={handleTriggerEscalation}
            style={{
              padding: '10px 16px',
              backgroundColor: '#FF7A29',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: escalating ? 'not-allowed' : 'pointer',
              opacity: escalating ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(255, 122, 41, 0.3)',
            }}
          >
            {escalating ? '⏳ Running...' : '🚀 Run Escalation Check'}
          </button>
          <button
            type="button"
            onClick={() => {
              fetchFlows();
              fetchExecutions();
            }}
            style={{
              padding: '10px 14px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {actionMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DEF7EC', color: '#03543F', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
          ✓ {actionMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FDE8E8', color: '#9B1C1C', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
          ⚠ {errorMessage}
        </div>
      )}

      {/* Configured Flows Section */}
      <div>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#1F2937' }}>
          Configured Automation Flows ({flows.length})
        </h3>

        {loadingFlows ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading workflows...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {flows.map((flow) => (
              <div
                key={flow._id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                  borderTop: flow.isActive ? '4px solid #10B981' : '4px solid #9CA3AF',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#111827', fontWeight: '700' }}>
                      {flow.name}
                    </h4>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: flow.isActive ? '#D1FAE5' : '#F3F4F6',
                        color: flow.isActive ? '#065F46' : '#6B7280',
                      }}
                    >
                      {flow.isActive ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                  </div>

                  <p style={{ margin: '6px 0 12px 0', fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                    {flow.description || 'Configured automation engine trigger.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#374151' }}>
                    <div>
                      <strong style={{ color: '#4B5563' }}>Trigger: </strong>
                      <code style={{ backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#FF7A29' }}>
                        {flow.trigger}
                      </code>
                    </div>

                    {flow.conditions && flow.conditions.length > 0 && (
                      <div>
                        <strong style={{ color: '#4B5563' }}>Condition: </strong>
                        <span style={{ fontSize: '11px', color: '#4B5563' }}>
                          {flow.conditions.map((c, i) => `${c.field} ${c.operator} ${c.value}`).join(', ')}
                        </span>
                      </div>
                    )}

                    <div>
                      <strong style={{ color: '#4B5563' }}>Actions ({flow.actions?.length || 0}): </strong>
                      <span style={{ fontSize: '11px', color: '#4B5563' }}>
                        {flow.actions?.map((a) => a.type).join(' ➔ ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleFlow(flow._id)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: flow.isActive ? '#FCA5A5' : '#A7F3D0',
                      backgroundColor: flow.isActive ? '#FEF2F2' : '#ECFDF5',
                      color: flow.isActive ? '#DC2626' : '#059669',
                      cursor: 'pointer',
                    }}
                  >
                    {flow.isActive ? 'Deactivate Flow' : 'Activate Flow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution History Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1F2937' }}>
            Workflow Execution History
          </h3>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Showing latest {executions.length} executions
          </span>
        </div>

        {loadingExecutions ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading executions...</div>
        ) : executions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px', color: '#9CA3AF' }}>
            No executions logged yet. Triggering complaints or running escalation will record events here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Flow Name</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Trigger</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Status</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Ticket #</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Executed Actions</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#111827' }}>
                      {item.flowName}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <code style={{ fontSize: '11px', backgroundColor: '#F3F4F6', padding: '2px 5px', borderRadius: '3px' }}>
                        {item.trigger}
                      </code>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {getStatusBadge(item.executionStatus)}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#FF7A29' }}>
                      {item.ticketNumber ? `#${item.ticketNumber}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#4B5563', fontSize: '12px' }}>
                      {item.executedActions && item.executedActions.length > 0 ? (
                        item.executedActions.map((a, i) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-block',
                              marginRight: '4px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                            }}
                          >
                            {a.type}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>{item.errorMessage || 'None'}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {formatTimestamp(item.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowManagement;
