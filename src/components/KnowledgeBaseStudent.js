import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { knowledgeBaseAPI } from '../api/api';

const PREDEFINED_CATEGORIES = [
  'All',
  'Wi-Fi & IT',
  'Electrical',
  'Plumbing',
  'Mess & Dining',
  'Hostel',
  'Academic',
  'General',
];

const KnowledgeBaseStudent = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [helpfulSubmitting, setHelpfulSubmitting] = useState(false);
  const [helpfulFeedback, setHelpfulFeedback] = useState(null);

  // Fetch published articles
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let res;
      if (searchTerm.trim()) {
        const params = { q: searchTerm.trim() };
        if (selectedCategory !== 'All') params.category = selectedCategory;
        res = await knowledgeBaseAPI.searchArticles(params);
        setArticles(Array.isArray(res.data) ? res.data : []);
      } else {
        const params = { limit: 50 };
        if (selectedCategory !== 'All') params.category = selectedCategory;
        res = await knowledgeBaseAPI.getArticles(params);
        setArticles(res.data?.articles || []);
      }
    } catch (err) {
      console.error('Error fetching student knowledge base:', err);
      setError('Unable to load knowledge base articles.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Open full article detail modal & fetch fresh data (increments view count on server)
  const handleOpenArticle = async (articleId) => {
    try {
      setLoadingDetail(true);
      setHelpfulFeedback(null);
      const res = await knowledgeBaseAPI.getArticleById(articleId);
      setSelectedArticle(res.data);
      // Update local article view count in list
      setArticles((prev) =>
        prev.map((a) => (a._id === articleId ? { ...a, views: (a.views || 0) + 1 } : a))
      );
    } catch (err) {
      console.error('Error loading article details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Mark article helpful
  const handleMarkHelpful = async (articleId) => {
    if (!selectedArticle || selectedArticle.hasUserVotedHelpful) return;
    try {
      setHelpfulSubmitting(true);
      const res = await knowledgeBaseAPI.markHelpful(articleId);
      setSelectedArticle((prev) => ({
        ...prev,
        helpfulCount: res.data.helpfulCount,
        hasUserVotedHelpful: true,
      }));
      setHelpfulFeedback('Thank you for your feedback!');
      // Update in main list
      setArticles((prev) =>
        prev.map((a) =>
          a._id === articleId ? { ...a, helpfulCount: res.data.helpfulCount } : a
        )
      );
    } catch (err) {
      console.error('Failed to mark helpful:', err);
    } finally {
      setHelpfulSubmitting(false);
    }
  };

  // Recently published articles (top 3 newest)
  const recentArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
  }, [articles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF8F3 0%, #FFEFE6 100%)',
          border: '1px solid #FFD9C2',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📚</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#1F2937' }}>
              Campus Help Center & Knowledge Base
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
              Explore official troubleshooting guides, Wi-Fi configs, safety notices, and resolution procedures.
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <input
            type="text"
            placeholder="🔍 Search articles, tags, or topics (e.g. Wi-Fi setup, power outage, water timings)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #FFD9C2',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#6B7280',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {PREDEFINED_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isSelected ? '#FF7A29' : '#FFF0E6',
                color: isSelected ? '#FFFFFF' : '#FF7A29',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Recently Published Section (Shown when no search term is entered) */}
      {!searchTerm && recentArticles.length > 0 && selectedCategory === 'All' && (
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⭐</span> Recommended & Recently Published
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {recentArticles.map((art) => (
              <div
                key={art._id}
                onClick={() => handleOpenArticle(art._id)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #FFE5CC',
                  borderLeft: '4px solid #FF9F5A',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#FF7A29',
                      backgroundColor: '#FFF0E6',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {art.category}
                  </span>
                  <h4 style={{ margin: '8px 0 6px 0', fontSize: '15px', color: '#111827', fontWeight: '700' }}>
                    {art.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                    {art.content?.substring(0, 110)}...
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '11px', color: '#9CA3AF' }}>
                  <span>👁️ {art.views || 0} reads</span>
                  <span style={{ color: '#FF7A29', fontWeight: '600' }}>Read Guide →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Articles Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#1F2937' }}>
            {selectedCategory === 'All' ? 'All Knowledge Articles' : `${selectedCategory} Articles`} ({articles.length})
          </h3>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            {loading ? 'Refreshing...' : `Showing ${articles.length} guides`}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#6B7280' }}>Loading knowledge articles...</div>
        ) : error ? (
          <div style={{ padding: '16px', backgroundColor: '#FDE8E8', color: '#9B1C1C', borderRadius: '6px', fontSize: '13px' }}>
            {error}
          </div>
        ) : articles.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
            <h4 style={{ margin: 0, color: '#111827' }}>No matching articles found</h4>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
              Try searching with different keywords or switch the category filter.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '16px' }}>
            {articles.map((art) => (
              <div
                key={art._id}
                onClick={() => handleOpenArticle(art._id)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  padding: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        backgroundColor: '#FFF0E6',
                        color: '#FF7A29',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {art.category}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {new Date(art.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#111827', fontWeight: '700', lineHeight: 1.3 }}>
                    {art.title}
                  </h4>

                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#4B5563', lineHeight: 1.5 }}>
                    {art.content?.substring(0, 130)}...
                  </p>

                  {art.tags && art.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {art.tags.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: '#F3F4F6',
                            color: '#6B7280',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderTop: '1px solid #F3F4F6',
                    marginTop: '14px',
                    paddingTop: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#6B7280',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span>👁️ {art.views || 0}</span>
                    <span>👍 {art.helpfulCount || 0}</span>
                  </div>
                  <span style={{ color: '#FF7A29', fontWeight: '600' }}>Read Guide →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Article Modal */}
      {(selectedArticle || loadingDetail) && (
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
            zIndex: 1200,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {loadingDetail ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Loading article details...</div>
            ) : selectedArticle ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        backgroundColor: '#FFF0E6',
                        color: '#FF7A29',
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedArticle.category}
                    </span>
                    <h2 style={{ margin: '10px 0 6px 0', fontSize: '22px', color: '#111827', lineHeight: 1.3 }}>
                      {selectedArticle.title}
                    </h2>
                    <div style={{ fontSize: '12px', color: '#6B7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Author: <strong>{selectedArticle.authorName || 'Campus Administration'}</strong></span>
                      <span>Published: {new Date(selectedArticle.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      <span>👁️ {selectedArticle.views} views</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedArticle(null)}
                    style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6B7280' }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #E5E7EB',
                    borderBottom: '1px solid #E5E7EB',
                    padding: '20px 0',
                    color: '#374151',
                    fontSize: '15px',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedArticle.content}
                </div>

                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedArticle.tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#4B5563',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Helpful Actions & Feedback */}
                <div
                  style={{
                    backgroundColor: '#FFF8F3',
                    border: '1px solid #FFE5CC',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                      Did you find this guide helpful?
                    </span>
                    {helpfulFeedback && (
                      <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px', fontWeight: '500' }}>
                        ✓ {helpfulFeedback}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={selectedArticle.hasUserVotedHelpful || helpfulSubmitting}
                      onClick={() => handleMarkHelpful(selectedArticle._id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: selectedArticle.hasUserVotedHelpful ? '#DEF7EC' : '#FF7A29',
                        color: selectedArticle.hasUserVotedHelpful ? '#03543F' : 'white',
                        border: selectedArticle.hasUserVotedHelpful ? '1px solid #A7F3D0' : 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: selectedArticle.hasUserVotedHelpful ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: helpfulSubmitting ? 0.7 : 1,
                      }}
                    >
                      {selectedArticle.hasUserVotedHelpful ? '✓ Marked Helpful' : '👍 Yes, Helpful'} (
                      {selectedArticle.helpfulCount || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedArticle(null)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseStudent;
