import React, { useState, useContext } from 'react';
import { ComplaintContext } from '../context/ComplaintContext';
import { getAuthToken } from '../api/api';

const ComplaintForm = ({ studentId, userName, onSubmit }) => {
  const { addComplaint } = useContext(ComplaintContext);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    category: 'Electrical',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    'Electrical',
    'Plumbing',
    'Furniture',
    'Cleanliness',
    'Door/Lock',
    'Window',
    'Roads/Paths',
    'Common Areas',
    'Waste Management',
    'Other',
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo file size must not exceed 5MB.');
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Unsupported image format. Allowed: JPEG, PNG, GIF, WEBP.');
        return;
      }

      setError('');
      setSelectedFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-flight check: ensure token exists
    const token = getAuthToken();
    if (!token) {
      setError('Authentication required. Please log in again to submit a complaint.');
      return;
    }

    // Form validation
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please describe the issue');
      return;
    }

    try {
      setLoading(true);

      const submissionData = new FormData();
      submissionData.append('title', formData.title.trim());
      submissionData.append('description', formData.description.trim());
      submissionData.append('category', formData.category);
      submissionData.append('location', formData.location.trim());
      if (selectedFile) {
        submissionData.append('photo', selectedFile);
      }

      await addComplaint(submissionData);

      // Reset form
      setFormData({
        title: '',
        location: '',
        category: 'Electrical',
        description: '',
      });
      setSelectedFile(null);
      setPhotoPreview(null);

      // Notify parent
      if (onSubmit) {
        onSubmit();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="complaint-form" onSubmit={handleSubmit}>
      <h2>📝 Submit a New Complaint</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="title">Complaint Title *</label>
          <input
            id="title"
            type="text"
            name="title"
            placeholder="Brief title of your complaint"
            value={formData.title}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location (Campus / Hostel / Room)</label>
          <input
            id="location"
            type="text"
            name="location"
            placeholder="e.g., Room A-201, Hostel Block B, Main Library"
            value={formData.location}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            disabled={loading}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row full">
        <div className="form-group">
          <label htmlFor="description">Describe the Issue *</label>
          <textarea
            id="description"
            name="description"
            placeholder="Please describe the maintenance issue in detail..."
            rows="5"
            value={formData.description}
            onChange={handleInputChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #FFE5CC',
              borderRadius: '5px',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      <div className="form-row full">
        <div className="form-group">
          <label htmlFor="photo">Upload Photo Evidence (Optional, max 5MB)</label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handlePhotoChange}
            disabled={loading}
            style={{
              padding: '10px',
              border: '2px solid #FFE5CC',
              borderRadius: '5px',
              width: '100%',
            }}
          />
          {photoPreview && (
            <div
              style={{
                marginTop: '15px',
                position: 'relative',
                display: 'inline-block',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #ddd',
              }}
            >
              <img
                src={photoPreview}
                alt="Preview"
                style={{
                  maxWidth: '300px',
                  maxHeight: '200px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
                title="Remove photo"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="complaint-form" style={{ width: 'auto' }} disabled={loading}>
        {loading ? 'Submitting Complaint...' : 'Submit Complaint'}
      </button>
    </form>
  );
};

export default ComplaintForm;
