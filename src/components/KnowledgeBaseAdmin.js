import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { knowledgeBaseAPI } from '../api/api';

const PREDEFINED_CATEGORIES = [
  'General',
  'Hostel',
  'Electrical',
  'Plumbing',
  'Wi-Fi & IT',
  'Academic',
  'Mess & Dining',
  'Campus Security',
];

const KnowledgeBaseAdmin = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    tags: '',
    status: 'Published',
    content: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 100 };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus !== 'All') params.status = selectedStatus;

      const res = await knowledgeBaseAPI.getArticles(params);
      setArticles(res.data?.articles || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('Unable to load knowledge base articles.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        term === '' ||
        art.title?.toLowerCase().includes(term) ||
        art.content?.toLowerCase().includes(term) ||
        art.tags?.some((t) => t.toLowerCase().includes(term));
      return matchSearch;
    });
  }, [articles, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = articles.length;
    const published = articles.filter((a) => a.status === 'Published').length;
    const drafts = articles.filter((a) => a.status === 'Draft').length;
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalHelpful = articles.reduce((sum, a) => sum + (a.helpfulCount || 0), 0);
    return { total, published, drafts, totalViews, totalHelpful };
  }, [articles]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      category: 'General',
      tags: '',
      status: 'Published',
      content: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title || '',
      category: article.category || 'General',
      tags: Array.isArray(article.tags) ? article.tags.join(', ') : '',
      status: article.status || 'Published',
      content: article.content || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Please enter an article title.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Please enter article content.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        tags: formData.tags,
        status: formData.status,
        content: formData.content.trim(),
      };

      if (editingArticle) {
        await knowledgeBaseAPI.updateArticle(editingArticle._id, payload);
        setSuccessMessage(`Article "${payload.title}" updated successfully.`);
      } else {
        await knowledgeBaseAPI.createArticle(payload);
        setSuccessMessage(`Article "${payload.title}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchArticles();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error saving article:', err);
      setFormError(err.response?.data?.message || 'Failed to save article.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle publish / unpublish status
  const handleToggleStatus = async (article) => {
    try {
      const newStatus = article.status === 'Published' ? 'Draft' : 'Published';
      await knowledgeBaseAPI.toggleArticleStatus(article._id, newStatus);
      setSuccessMessage(
        `Article "${article.title}" is now ${newStatus === 'Published' ? 'PUBLISHED' : 'a DRAFT'}.`
      );
      fetchArticles();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling article status:', err);
      setError('Failed to update article status.');
    }
  };

  // Delete article
  const handleDeleteArticle = async (article) => {
    if (!window.confirm(`Are you sure you want to delete "${article.title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await knowledgeBaseAPI.deleteArticle(article._id);
      setSuccessMessage(`Article "${article.title}" deleted.`);
      fetchArticles();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting article:', err);
      setError('Failed to delete article.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ background: '#FFF8F3', border: '1px solid #FFD9C2', padding: '14px', borderRadius: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Total Articles</h4>
          <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#1F2937' }}>{metrics.total}</p>
        </div>
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '14px', borderRadius: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#065F46', textTransform: 'uppercase' }}>Published</h4>
          <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#047857' }}>{metrics.published}</p>
        </div>
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '14px', borderRadius: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#92400E', textTransform: 'uppercase' }}>Drafts</h4>
          <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#B45309' }}>{metrics.drafts}</p>
        </div>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '14px', borderRadius: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#1E40AF', textTransform: 'uppercase' }}>Total Reads (Views)</h4>
          <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#1D4ED8' }}>{metrics.totalViews}</p>
        </div>
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '14px', borderRadius: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '12px', color: '#5B21B6', textTransform: 'uppercase' }}>Helpful Votes</h4>
          <p style={{ margin: '6px 0 0 0', fontSize: '24px', fontWeight: '700', color: '#6D28D9' }}>{metrics.totalHelpful}</p>
        </div>
      </div>

      {/* Notifications / Feedback */}
      {successMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DEF7EC', color: '#03543F', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FDE8E8', color: '#9B1C1C', borderRadius: '6px', fontSize: '13px', fontWeight: '500' }}>
          ⚠ {error}
        </div>
      )}

      {/* Control Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search articles, tags, content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              minWidth: '240px',
            }}
          />

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="All">All Categories</option>
            {PREDEFINED_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published Only</option>
            <option value="Draft">Drafts Only</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{
            padding: '10px 18px',
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
          ➕ Create New Article
        </button>
      </div>

      {/* Articles Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6B7280' }}>Loading articles...</div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
            <p style={{ margin: 0, fontWeight: '600' }}>No knowledge base articles found</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
              Create articles to provide self-service troubleshooting guides for students.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '12px 14px', color: '#4B5563' }}>Title & Category</th>
                <th style={{ padding: '12px 14px', color: '#4B5563' }}>Status</th>
                <th style={{ padding: '12px 14px', color: '#4B5563' }}>Engagement</th>
                <th style={{ padding: '12px 14px', color: '#4B5563' }}>Author</th>
                <th style={{ padding: '12px 14px', color: '#4B5563' }}>Last Updated</th>
                <th style={{ padding: '12px 14px', color: '#4B5563', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((art) => (
                <tr key={art._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 14px', maxWidth: '320px' }}>
                    <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                      {art.title}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          backgroundColor: '#FFF0E6',
                          color: '#FF7A29',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {art.category}
                      </span>
                      {art.tags?.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: '#F3F4F6',
                            color: '#4B5563',
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: art.status === 'Published' ? '#DEF7EC' : '#FEF3C7',
                        color: art.status === 'Published' ? '#03543F' : '#92400E',
                      }}
                    >
                      {art.status === 'Published' ? '● Published' : '○ Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '12px', color: '#4B5563', fontSize: '12px' }}>
                      <span title="Views">👁️ {art.views || 0}</span>
                      <span title="Helpful votes">👍 {art.helpfulCount || 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#4B5563', fontSize: '12px' }}>
                    {art.authorName || art.author?.username || 'Admin'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#6B7280', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(art.updatedAt || art.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewArticle(art)}
                        style={{
                          padding: '5px 9px',
                          fontSize: '11px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        title="Preview"
                      >
                        👁️ Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(art)}
                        style={{
                          padding: '5px 9px',
                          fontSize: '11px',
                          border: '1px solid #93C5FD',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(art)}
                        style={{
                          padding: '5px 9px',
                          fontSize: '11px',
                          border: '1px solid',
                          borderColor: art.status === 'Published' ? '#FCD34D' : '#A7F3D0',
                          backgroundColor: art.status === 'Published' ? '#FFFBEB' : '#ECFDF5',
                          color: art.status === 'Published' ? '#B45309' : '#059669',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {art.status === 'Published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteArticle(art)}
                        style={{
                          padding: '5px 9px',
                          fontSize: '11px',
                          border: '1px solid #FCA5A5',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Article Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFF8F3',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '17px', color: '#1F2937' }}>
                {editingArticle ? '✏️ Edit Knowledge Article' : '➕ Create New Knowledge Article'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6B7280' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && (
                <div style={{ padding: '10px 14px', backgroundColor: '#FDE8E8', color: '#9B1C1C', borderRadius: '6px', fontSize: '13px' }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wi-Fi Troubleshooting and Network Access Guide"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    {PREDEFINED_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                  >
                    <option value="Published">Published (Visible to Students)</option>
                    <option value="Draft">Draft (Admin Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. wifi, internet, network, connection"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                  Content / Instructions *
                </label>
                <textarea
                  required
                  rows={8}
                  placeholder="Write clear, step-by-step guidance for students. Markdown headings and lists are supported."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#374151', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#FF7A29',
                    color: 'white',
                    fontWeight: '600',
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: formSubmitting ? 0.7 : 1,
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingArticle ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewArticle && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    backgroundColor: '#FFF0E6',
                    color: '#FF7A29',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {previewArticle.category}
                </span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '20px', color: '#111827' }}>
                  {previewArticle.title}
                </h2>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  By {previewArticle.authorName || 'Administrator'} • 👁️ {previewArticle.views} views • 👍 {previewArticle.helpfulCount} helpful
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewArticle(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                borderTop: '1px solid #F3F4F6',
                borderBottom: '1px solid #F3F4F6',
                padding: '16px 0',
                color: '#374151',
                fontSize: '14px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {previewArticle.content}
            </div>

            {previewArticle.tags && previewArticle.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {previewArticle.tags.map((t, idx) => (
                  <span key={idx} style={{ backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewArticle(null)}
                style={{ padding: '8px 18px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseAdmin;
