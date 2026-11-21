import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsAPI, authAPI } from '../api/api';

const PREDEFINED_CATEGORIES = [
  'All',
  'Electrical',
  'Plumbing',
  'Wi-Fi & IT',
  'Mess & Dining',
  'Hostel',
  'Academic',
  'Window',
  'Appliance',
  'General',
];

const PREDEFINED_PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Critical'];
const PREDEFINED_STATUSES = ['All', 'Submitted', 'Pending', 'In Progress', 'Resolved', 'Closed'];

// Color palette matching the existing theme
const STATUS_COLORS = {
  Submitted: '#FF9F5A',
  Pending: '#F59E0B',
  'In Progress': '#3B82F6',
  Resolved: '#10B981',
  Closed: '#6B7280',
};

const PRIORITY_COLORS = {
  Low: '#10B981',
  Medium: '#3B82F6',
  High: '#F59E0B',
  Critical: '#EF4444',
};

// --- Custom Pure SVG Visualizations ---

/**
 * Interactive Donut/Pie Chart
 */
const SvgDonutChart = ({ data = [], size = 200, strokeWidth = 32 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '13px' }}>
        No complaints to display for current filter
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((item, idx) => {
            if (item.count === 0) return null;
            const fraction = item.count / total;
            const dashArray = `${fraction * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeAngle * circumference;
            cumulativeAngle += fraction;
            const color = STATUS_COLORS[item.status] || '#9CA3AF';
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={item.status}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.2s ease' }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#1F2937' }}>
            {hoveredIdx !== null ? data[hoveredIdx]?.count : total}
          </span>
          <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' }}>
            {hoveredIdx !== null ? data[hoveredIdx]?.status : 'Total'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((item, idx) => {
          const color = STATUS_COLORS[item.status] || '#9CA3AF';
          return (
            <div
              key={item.status}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: hoveredIdx === null || hoveredIdx === idx ? 1 : 0.5,
              }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: color }} />
              <span style={{ color: '#374151', minWidth: '85px' }}>{item.status}</span>
              <strong style={{ color: '#1F2937' }}>{item.count}</strong>
              <span style={{ color: '#9CA3AF', fontSize: '11px' }}>({item.percentage}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Bar Chart Component (Supports Status, Priority, Category)
 */
const SvgBarChart = ({ data = [], keyField = 'category', valueField = 'count', colorMap = null, defaultColor = '#FF9F5A', height = 220 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const maxVal = Math.max(...data.map((d) => d[valueField]), 1);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '13px' }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '24px' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px' }}>
        {data.map((item, idx) => {
          const val = item[valueField] || 0;
          const heightPercent = Math.max((val / maxVal) * 100, 4);
          const label = item[keyField];
          const color = colorMap ? colorMap[label] || defaultColor : defaultColor;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-32px',
                    backgroundColor: '#1F2937',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}
                >
                  {val} ({item.percentage !== undefined ? `${item.percentage}%` : `${val} tickets`})
                </div>
              )}

              {/* Bar Value on top */}
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#4B5563', marginBottom: '4px' }}>
                {val}
              </span>

              {/* Bar Rect */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '46px',
                  height: `${heightPercent}%`,
                  backgroundColor: color,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease, opacity 0.2s ease',
                  opacity: isHovered ? 1 : 0.85,
                  boxShadow: isHovered ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                }}
              />

              {/* X Label */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '-22px',
                  fontSize: '11px',
                  color: isHovered ? '#1F2937' : '#6B7280',
                  fontWeight: isHovered ? '700' : '500',
                  textAlign: 'center',
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={label}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Line Chart for Monthly Trends
 */
const SvgLineTrendChart = ({ trends = [], height = 220 }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (trends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '13px' }}>
        No historical trends found
      </div>
    );
  }

  const maxVal = Math.max(...trends.map((t) => t.total), 5);
  const width = 500;
  const paddingX = 40;
  const paddingY = 30;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const pointsTotal = trends.map((t, i) => {
    const x = paddingX + (i / Math.max(trends.length - 1, 1)) * plotWidth;
    const y = height - paddingY - (t.total / maxVal) * plotHeight;
    return { x, y, data: t };
  });

  const pointsResolved = trends.map((t, i) => {
    const x = paddingX + (i / Math.max(trends.length - 1, 1)) * plotWidth;
    const y = height - paddingY - (t.resolved / maxVal) * plotHeight;
    return { x, y, data: t };
  });

  const totalPath = pointsTotal.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const resolvedPath = pointsResolved.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = paddingY + pct * plotHeight;
          const val = Math.round(maxVal * (1 - pct));
          return (
            <g key={idx}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#F3F4F6" strokeDasharray="3 3" />
              <text x={paddingX - 8} y={y + 4} fill="#9CA3AF" fontSize="10" textAnchor="end">
                {val}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        <path d={totalPath} fill="none" stroke="#FF7A29" strokeWidth="3" strokeLinecap="round" />
        <path d={resolvedPath} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

        {/* Points & Labels */}
        {pointsTotal.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 6 : 4}
              fill="#FF7A29"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            <circle
              cx={pointsResolved[i].x}
              cy={pointsResolved[i].y}
              r={hoveredIdx === i ? 6 : 4}
              fill="#10B981"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            {/* X Axis Label */}
            <text x={pt.x} y={height - 8} fill="#6B7280" fontSize="10" textAnchor="middle">
              {pt.data.label?.split(' ')[0]}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend & Hover Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#FF7A29' }} />
            <span style={{ color: '#4B5563' }}>Total Filed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#10B981' }} />
            <span style={{ color: '#4B5563' }}>Resolved</span>
          </div>
        </div>
        {hoveredIdx !== null && (
          <div style={{ color: '#1F2937', fontWeight: '600' }}>
            {trends[hoveredIdx]?.label}: {trends[hoveredIdx]?.total} Total, {trends[hoveredIdx]?.resolved} Resolved
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Analytics Dashboard Component ---

const AnalyticsDashboard = () => {
  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');
  const [assignedTo, setAssignedTo] = useState('All');
  const [adminsList, setAdminsList] = useState([]);

  // Data States
  const [overview, setOverview] = useState({
    total: 0,
    submitted: 0,
    inProgress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    overdue: 0,
  });
  const [statusData, setStatusData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [resolutionPerf, setResolutionPerf] = useState({
    averageResolutionHours: 0,
    averageResolutionDays: 0,
    formattedAverageTime: '0 hrs',
    totalResolved: 0,
    totalComplaints: 0,
    resolutionPercentage: 0,
    overdueCount: 0,
    categoryPerformance: [],
  });
  const [adminPerf, setAdminPerf] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Load admins list for filter dropdown
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await authAPI.getAdmins();
        setAdminsList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load admins list for analytics filter:', err);
      }
    };
    fetchAdmins();
  }, []);

  // Construct current query params
  const currentParams = useMemo(() => {
    const p = {};
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    if (category !== 'All') p.category = category;
    if (priority !== 'All') p.priority = priority;
    if (status !== 'All') p.status = status;
    if (assignedTo !== 'All') p.assignedTo = assignedTo;
    return p;
  }, [startDate, endDate, category, priority, status, assignedTo]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    if (category !== 'All') count++;
    if (priority !== 'All') count++;
    if (status !== 'All') count++;
    if (assignedTo !== 'All') count++;
    return count;
  }, [startDate, endDate, category, priority, status, assignedTo]);

  // Fetch all analytics data concurrently
  const fetchAllAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [
        overviewRes,
        statusRes,
        priorityRes,
        categoryRes,
        trendsRes,
        resolutionRes,
        adminRes,
      ] = await Promise.all([
        analyticsAPI.getOverview(currentParams),
        analyticsAPI.getStatus(currentParams),
        analyticsAPI.getPriority(currentParams),
        analyticsAPI.getCategory(currentParams),
        analyticsAPI.getMonthlyTrends(currentParams),
        analyticsAPI.getResolutionPerformance(currentParams),
        analyticsAPI.getAdminPerformance(currentParams),
      ]);

      setOverview(overviewRes.data);
      setStatusData(statusRes.data?.data || []);
      setPriorityData(priorityRes.data?.data || []);
      setCategoryData(categoryRes.data?.data || []);
      setMonthlyTrends(trendsRes.data || []);
      setResolutionPerf(resolutionRes.data || {});
      setAdminPerf(adminRes.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentParams]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('All');
    setPriority('All');
    setStatus('All');
    setAssignedTo('All');
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await analyticsAPI.exportCSV(currentParams);
      setActionMessage('CSV report exported and downloaded successfully.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error('CSV export failed:', err);
      alert('Failed to export CSV report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="analytics-module" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Print-Only Header (Hidden on screen, visible on paper/PDF) */}
      <div className="print-only" style={{ display: 'none', borderBottom: '2px solid #333', paddingBottom: '12px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>College Facilities & Complaint Management System</h1>
        <h2 style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#555' }}>Executive Operations & Resolution Analytics Report</h2>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
          <span>Generated: {new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</span>
          <span>Active Filters: {activeFiltersCount > 0 ? JSON.stringify(currentParams) : 'All Records (Unfiltered)'}</span>
        </div>
      </div>

      {/* Top Banner & Action Controls */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #FFF8F3 0%, #FFEFE6 100%)',
          borderRadius: '8px',
          border: '1px solid #FFD9C2',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1F2937' }}>
            📊 Service Operations & Resolution Analytics
            {loading && (
              <span style={{ marginLeft: '10px', fontSize: '12px', color: '#EA580C', fontWeight: '500' }}>
                ⏳ Updating metrics...
              </span>
            )}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Real-time KPIs, status distributions, category bottlenecks, and SLA resolution velocity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportCSV}
            style={{
              padding: '9px 16px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
            }}
          >
            {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '9px 16px',
              backgroundColor: '#FF7A29',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(255, 122, 41, 0.25)',
            }}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DEF7EC', color: '#03543F', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
          ✓ {actionMessage}
        </div>
      )}

      {/* Interactive Filter Bar */}
      <div
        className="no-print"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span> Analytics Filters
            {activeFiltersCount > 0 && (
              <span style={{ backgroundColor: '#FF7A29', color: 'white', fontSize: '11px', padding: '1px 7px', borderRadius: '10px' }}>
                {activeFiltersCount} active
              </span>
            )}
          </span>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Start Date */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

          {/* End Date */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
            >
              {PREDEFINED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
            >
              {PREDEFINED_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p === 'All' ? 'All Priorities' : p}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
            >
              {PREDEFINED_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Admin */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>
              Assigned Admin
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '5px', border: '1px solid #D1D5DB', fontSize: '12px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
            >
              <option value="All">All Staff</option>
              <option value="Unassigned">Unassigned</option>
              {adminsList.map((adm) => (
                <option key={adm._id} value={adm._id}>
                  {adm.username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Module 1: KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
        }}
      >
        <div style={{ background: '#1F2937', color: 'white', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.total}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.85, textTransform: 'uppercase' }}>Total Filed</p>
        </div>
        <div style={{ background: '#FF9F5A', color: 'white', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.submitted}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9, textTransform: 'uppercase' }}>Submitted</p>
        </div>
        <div style={{ background: '#3B82F6', color: 'white', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.inProgress}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9, textTransform: 'uppercase' }}>In Progress</p>
        </div>
        <div style={{ background: '#F59E0B', color: 'white', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.pending}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9, textTransform: 'uppercase' }}>Pending</p>
        </div>
        <div style={{ background: '#10B981', color: 'white', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.resolved}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9, textTransform: 'uppercase' }}>Resolved</p>
        </div>
        <div style={{ background: '#6B7280', color: 'white', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.closed}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9, textTransform: 'uppercase' }}>Closed</p>
        </div>
        <div
          style={{
            background: '#FEF2F2',
            color: '#DC2626',
            border: '2px solid #F87171',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ fontSize: '26px', margin: 0 }}>{overview.overdue}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>⚠️ Overdue (SLA)</p>
        </div>
      </div>

      {/* Module 2: Visualizations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Chart 1: Status Distribution */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1F2937' }}>
            Complaints by Status Distribution
          </h3>
          <SvgDonutChart data={statusData} size={210} strokeWidth={34} />
        </div>

        {/* Chart 2: Priority Breakdown */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1F2937' }}>
            Complaints by Severity Priority
          </h3>
          <SvgBarChart data={priorityData} keyField="priority" valueField="count" colorMap={PRIORITY_COLORS} height={200} />
        </div>

        {/* Chart 3: Category Distribution */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1F2937' }}>
            Complaints by Facility Category
          </h3>
          <SvgBarChart data={categoryData} keyField="category" valueField="count" defaultColor="#FF9F5A" height={200} />
        </div>

        {/* Chart 4: Monthly Trends */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1F2937' }}>
            Monthly Volume & Resolution Trends
          </h3>
          <SvgLineTrendChart trends={monthlyTrends} height={200} />
        </div>
      </div>

      {/* Module 3: Resolution Performance Metrics */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1F2937' }}>
              ⏱️ Resolution SLA Velocity & Operational Performance
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
              Formula: Mean resolution duration = Sum(resolvedAt − createdAt) / Count(resolved complaints). Unresolved tickets are strictly excluded.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#FFF8F3', border: '1px solid #FFD9C2', padding: '16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9A3412', textTransform: 'uppercase', fontWeight: '700' }}>Avg Resolution Velocity</span>
            <h4 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#EA580C' }}>
              {resolutionPerf.formattedAverageTime || '0 hrs'}
            </h4>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              ({resolutionPerf.averageResolutionHours} total hours)
            </span>
          </div>

          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#065F46', textTransform: 'uppercase', fontWeight: '700' }}>Resolution Percentage</span>
            <h4 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#059669' }}>
              {resolutionPerf.resolutionPercentage}%
            </h4>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              {resolutionPerf.totalResolved} of {resolutionPerf.totalComplaints} tickets resolved
            </span>
          </div>

          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '16px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#991B1B', textTransform: 'uppercase', fontWeight: '700' }}>Overdue Tickets</span>
            <h4 style={{ margin: '6px 0 0 0', fontSize: '26px', color: '#DC2626' }}>
              {resolutionPerf.overdueCount}
            </h4>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              Breached SLA resolution thresholds
            </span>
          </div>
        </div>

        {/* Category Resolution Times Breakdown */}
        {resolutionPerf.categoryPerformance && resolutionPerf.categoryPerformance.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#374151', textTransform: 'uppercase' }}>
              Category Resolution Times Breakdown
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {resolutionPerf.categoryPerformance.map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>{c.category}</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#FF7A29' }}>
                    {c.avgHours}h <span style={{ fontSize: '11px', fontWeight: '400', color: '#6B7280' }}>({c.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Module 3 (Continued): Administrator Operational Statistics */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', color: '#1F2937' }}>
          👨‍💼 Administrator Assignment & Resolution Statistics
        </h3>

        {adminPerf.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>No administrator performance records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Administrator</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Assigned</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>In Progress</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Pending</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Resolved</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Resolution %</th>
                  <th style={{ padding: '10px 14px', color: '#4B5563' }}>Avg Resolution Velocity</th>
                </tr>
              </thead>
              <tbody>
                {adminPerf.map((adm) => (
                  <tr key={adm.adminId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#111827' }}>
                      {adm.adminName}
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: '400', color: '#9CA3AF' }}>{adm.email}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '700' }}>{adm.assignedCount}</td>
                    <td style={{ padding: '10px 14px', color: '#3B82F6', fontWeight: '600' }}>{adm.inProgressCount}</td>
                    <td style={{ padding: '10px 14px', color: '#F59E0B', fontWeight: '600' }}>{adm.pendingCount}</td>
                    <td style={{ padding: '10px 14px', color: '#10B981', fontWeight: '600' }}>{adm.resolvedCount}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${adm.resolutionRate}%`, height: '100%', backgroundColor: '#10B981' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>{adm.resolutionRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '600', color: '#FF7A29' }}>
                      {adm.avgResolutionHours > 0 ? `${adm.avgResolutionHours} hrs` : 'N/A'}
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

export default AnalyticsDashboard;
