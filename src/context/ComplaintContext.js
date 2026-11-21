import React, { createContext, useState, useEffect, useCallback } from 'react';
import { complaintAPI } from '../api/api';

export const ComplaintContext = createContext();

export const ComplaintProvider = ({ children }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await complaintAPI.getAllComplaints();
      if (Array.isArray(response.data)) {
        setComplaints(response.data);
        setError(null);
      } else {
        setComplaints([]);
        setError(response.data?.message || 'Invalid complaint data format received');
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load complaints from backend if user has a token
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      fetchAllComplaints();
    }
  }, [fetchAllComplaints]);

  const addComplaint = useCallback(async (complaintData) => {
    try {
      setLoading(true);
      const response = await complaintAPI.createComplaint(complaintData);
      setComplaints((prev) => [response.data, ...prev]);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error creating complaint:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateComplaintStatus = useCallback(async (complaintId, newStatus, adminResponse = '') => {
    try {
      setLoading(true);
      const response = await complaintAPI.updateComplaintStatus(complaintId, newStatus, adminResponse);
      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint._id === complaintId ? response.data : complaint
        )
      );
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error updating complaint status:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateComplaintPriority = useCallback(async (complaintId, priority) => {
    try {
      setLoading(true);
      const response = await complaintAPI.updateComplaintPriority(complaintId, priority);
      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint._id === complaintId ? response.data : complaint
        )
      );
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error updating complaint priority:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignComplaint = useCallback(async (complaintId, assignedTo) => {
    try {
      setLoading(true);
      const response = await complaintAPI.assignComplaint(complaintId, assignedTo);
      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint._id === complaintId ? response.data : complaint
        )
      );
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error assigning complaint:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addWorkNote = useCallback(async (complaintId, note) => {
    try {
      setLoading(true);
      const response = await complaintAPI.addWorkNote(complaintId, note);
      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint._id === complaintId ? response.data : complaint
        )
      );
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error adding work note:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const upvoteComplaint = useCallback(async (complaintId) => {
    try {
      const response = await complaintAPI.upvoteComplaint(complaintId);
      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint._id === complaintId ? response.data : complaint
        )
      );
      setError(null);
    } catch (err) {
      console.error('Error upvoting complaint:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const deleteComplaint = useCallback(async (complaintId) => {
    try {
      setLoading(true);
      await complaintAPI.deleteComplaint(complaintId);
      setComplaints((prev) =>
        prev.filter((complaint) => complaint._id !== complaintId)
      );
      setError(null);
    } catch (err) {
      console.error('Error deleting complaint:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getComplaintsByStudent = useCallback(async (studentId) => {
    try {
      const response = await complaintAPI.getComplaintsByUser(studentId);
      return response.data;
    } catch (err) {
      console.error('Error fetching student complaints:', err);
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const getComplaintsByStatus = useCallback((status) => {
    return complaints.filter((complaint) => complaint.status === status);
  }, [complaints]);

  const getComplaintsByCategory = useCallback((category) => {
    return complaints.filter((complaint) => complaint.category === category);
  }, [complaints]);

  const value = {
    complaints,
    loading,
    error,
    addComplaint,
    updateComplaintStatus,
    updateComplaintPriority,
    assignComplaint,
    addWorkNote,
    upvoteComplaint,
    deleteComplaint,
    getComplaintsByStudent,
    getComplaintsByStatus,
    getComplaintsByCategory,
    fetchAllComplaints,
  };

  return (
    <ComplaintContext.Provider value={value}>
      {children}
    </ComplaintContext.Provider>
  );
};
