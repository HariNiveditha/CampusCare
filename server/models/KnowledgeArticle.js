const mongoose = require('mongoose');

const knowledgeArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Article content is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Article category is required'],
    trim: true,
    default: 'General',
    index: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft',
    index: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  authorName: {
    type: String,
    default: '',
  },
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  helpfulUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
knowledgeArticleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Text index for fast keyword search across title, content, and tags
knowledgeArticleSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
});

module.exports = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
