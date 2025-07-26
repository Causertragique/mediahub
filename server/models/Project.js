const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  type: {
    type: String,
    enum: ['article', 'video', 'photo', 'audio', 'mixed', 'story', 'reel', 'post'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'review', 'ready', 'published', 'archived'],
    default: 'draft'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['editor', 'viewer', 'contributor'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  content: {
    text: {
      type: String,
      maxlength: 50000
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      filename: String,
      size: Number,
      duration: Number, // for video/audio
      thumbnail: String,
      metadata: {
        width: Number,
        height: Number,
        format: String,
        codec: String
      }
    }],
    assets: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }]
  },
  settings: {
    visibility: {
      type: String,
      enum: ['private', 'team', 'public'],
      default: 'private'
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    allowSharing: {
      type: Boolean,
      default: true
    },
    seoSettings: {
      title: String,
      description: String,
      keywords: [String],
      canonicalUrl: String
    }
  },
  publishing: {
    platforms: [{
      name: {
        type: String,
        enum: ['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok', 'website', 'blog'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'scheduled', 'published', 'failed'],
        default: 'pending'
      },
      scheduledAt: Date,
      publishedAt: Date,
      postId: String,
      url: String,
      analytics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
      }
    }],
    autoPublish: {
      type: Boolean,
      default: false
    },
    crossPost: {
      type: Boolean,
      default: false
    }
  },
  analytics: {
    views: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  },
  tags: [String],
  category: {
    type: String,
    enum: ['entertainment', 'news', 'education', 'business', 'lifestyle', 'technology', 'sports', 'other'],
    default: 'other'
  },
  language: {
    type: String,
    default: 'en'
  },
  targetAudience: {
    ageRange: {
      min: Number,
      max: Number
    },
    interests: [String],
    location: String
  },
  budget: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  deadline: Date,
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateData: {
    originalProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    variables: [{
      name: String,
      value: String,
      type: String
    }]
  }
}, {
  timestamps: true
});

// Index for better query performance
projectSchema.index({ creator: 1, status: 1 });
projectSchema.index({ type: 1, status: 1 });
projectSchema.index({ 'publishing.platforms.name': 1, 'publishing.platforms.status': 1 });

// Virtual for full name
projectSchema.virtual('creatorName').get(function() {
  return `${this.creator.firstName} ${this.creator.lastName}`;
});

// Method to get project summary
projectSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    type: this.type,
    status: this.status,
    creator: this.creator,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    mediaCount: this.content.media.length,
    analytics: this.analytics
  };
};

module.exports = mongoose.model('Project', projectSchema);