import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  duration?: number; // for video/audio in seconds
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnail?: string;
  metadata: Record<string, any>;
}

export interface IContent extends Document {
  title: string;
  description?: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'thread';
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'archived';
  author: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  
  // Media files
  media: IMedia[];
  
  // Scheduling
  scheduledFor?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  
  // Target platforms
  platforms: Array<{
    name: string;
    status: 'pending' | 'published' | 'failed' | 'scheduled';
    postId?: string;
    url?: string;
    publishedAt?: Date;
    error?: string;
    customization?: {
      caption?: string;
      hashtags?: string[];
      mentions?: string[];
      settings?: Record<string, any>;
    };
  }>;
  
  // Content metadata
  tags: string[];
  categories: string[];
  hashtags: string[];
  mentions: string[];
  
  // AI-generated content
  aiGenerated: {
    isAIGenerated: boolean;
    prompt?: string;
    model?: string;
    variations?: Array<{
      content: string;
      score: number;
    }>;
  };
  
  // Analytics
  analytics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
    engagement: number;
    reach: number;
    impressions: number;
    platformAnalytics: Array<{
      platform: string;
      views: number;
      likes: number;
      shares: number;
      comments: number;
      clicks: number;
      engagement: number;
      reach: number;
      impressions: number;
    }>;
  };
  
  // Approval workflow
  approval: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
    approver?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    comments?: string;
    history: Array<{
      action: string;
      user: mongoose.Types.ObjectId;
      timestamp: Date;
      comments?: string;
    }>;
  };
  
  // Version control
  version: number;
  parentContent?: mongoose.Types.ObjectId;
  
  // SEO and optimization
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>({
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  duration: Number,
  dimensions: {
    width: Number,
    height: Number
  },
  thumbnail: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

const contentSchema = new Schema<IContent>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'carousel', 'story', 'reel', 'thread'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed', 'archived'],
    default: 'draft'
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  media: [mediaSchema],
  
  scheduledFor: Date,
  publishedAt: Date,
  expiresAt: Date,
  
  platforms: [{
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'failed', 'scheduled'],
      default: 'pending'
    },
    postId: String,
    url: String,
    publishedAt: Date,
    error: String,
    customization: {
      caption: String,
      hashtags: [String],
      mentions: [String],
      settings: Schema.Types.Mixed
    }
  }],
  
  tags: [String],
  categories: [String],
  hashtags: [String],
  mentions: [String],
  
  aiGenerated: {
    isAIGenerated: {
      type: Boolean,
      default: false
    },
    prompt: String,
    model: String,
    variations: [{
      content: String,
      score: Number
    }]
  },
  
  analytics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    platformAnalytics: [{
      platform: String,
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 }
    }]
  },
  
  approval: {
    required: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'changes_requested'],
      default: 'pending'
    },
    approver: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    comments: String,
    history: [{
      action: String,
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      comments: String
    }]
  },
  
  version: {
    type: Number,
    default: 1
  },
  parentContent: {
    type: Schema.Types.ObjectId,
    ref: 'Content'
  },
  
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    ogImage: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
contentSchema.index({ author: 1, status: 1 });
contentSchema.index({ scheduledFor: 1 });
contentSchema.index({ publishedAt: -1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ categories: 1 });
contentSchema.index({ 'platforms.name': 1, 'platforms.status': 1 });
contentSchema.index({ createdAt: -1 });

// Text search index
contentSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
  tags: 'text'
});

export const Content = mongoose.model<IContent>('Content', contentSchema);