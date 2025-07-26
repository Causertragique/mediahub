const express = require('express');
const Project = require('../models/Project');
const { auth, requireSubscription } = require('../middleware/auth');

const router = express.Router();

// Get publishing platforms for a project
router.get('/project/:projectId/platforms', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = project.creator.toString() === req.user.userId ||
                     project.collaborators.some(c => c.user.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      platforms: project.publishing.platforms
    });
  } catch (error) {
    console.error('Get platforms error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Publish to a specific platform
router.post('/project/:projectId/publish', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { platform, scheduledAt, customMessage } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user can publish this project
    const canPublish = project.creator.toString() === req.user.userId ||
                      project.collaborators.some(c => 
                        c.user.toString() === req.user.userId && 
                        ['editor', 'contributor'].includes(c.role)
                      );

    if (!canPublish) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to publish this project'
      });
    }

    // Validate platform
    const validPlatforms = ['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok', 'website', 'blog'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    // Check if already published to this platform
    const existingPlatform = project.publishing.platforms.find(p => p.name === platform);
    if (existingPlatform && existingPlatform.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Already published to this platform'
      });
    }

    // Add or update platform publishing info
    const platformData = {
      name: platform,
      status: scheduledAt ? 'scheduled' : 'pending',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      customMessage: customMessage || '',
      analytics: {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0
      }
    };

    if (existingPlatform) {
      Object.assign(existingPlatform, platformData);
    } else {
      project.publishing.platforms.push(platformData);
    }

    await project.save();

    // Simulate publishing process
    if (!scheduledAt) {
      setTimeout(() => {
        // Update status to published
        const platformIndex = project.publishing.platforms.findIndex(p => p.name === platform);
        if (platformIndex !== -1) {
          project.publishing.platforms[platformIndex].status = 'published';
          project.publishing.platforms[platformIndex].publishedAt = new Date();
          project.publishing.platforms[platformIndex].postId = `post_${Date.now()}`;
          project.publishing.platforms[platformIndex].url = `https://${platform}.com/post/${Date.now()}`;
          project.save();
        }
      }, 2000);
    }

    res.json({
      success: true,
      message: scheduledAt ? 'Content scheduled for publishing' : 'Publishing started',
      platform: platformData
    });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Schedule publishing
router.post('/project/:projectId/schedule', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { platforms, scheduledAt, customMessages } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const canPublish = project.creator.toString() === req.user.userId ||
                      project.collaborators.some(c => 
                        c.user.toString() === req.user.userId && 
                        ['editor', 'contributor'].includes(c.role)
                      );

    if (!canPublish) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to schedule this project'
      });
    }

    // Schedule for each platform
    for (const platform of platforms) {
      const platformData = {
        name: platform,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
        customMessage: customMessages?.[platform] || '',
        analytics: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0
        }
      };

      const existingIndex = project.publishing.platforms.findIndex(p => p.name === platform);
      if (existingIndex !== -1) {
        project.publishing.platforms[existingIndex] = platformData;
      } else {
        project.publishing.platforms.push(platformData);
      }
    }

    await project.save();

    res.json({
      success: true,
      message: 'Content scheduled successfully',
      scheduledPlatforms: platforms,
      scheduledAt: new Date(scheduledAt)
    });
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Cross-post to multiple platforms
router.post('/project/:projectId/crosspost', auth, requireSubscription('pro'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { platforms, customMessages } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const canPublish = project.creator.toString() === req.user.userId ||
                      project.collaborators.some(c => 
                        c.user.toString() === req.user.userId && 
                        ['editor', 'contributor'].includes(c.role)
                      );

    if (!canPublish) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cross-post this project'
      });
    }

    const results = [];

    // Publish to each platform
    for (const platform of platforms) {
      const platformData = {
        name: platform,
        status: 'pending',
        customMessage: customMessages?.[platform] || '',
        analytics: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0
        }
      };

      const existingIndex = project.publishing.platforms.findIndex(p => p.name === platform);
      if (existingIndex !== -1) {
        project.publishing.platforms[existingIndex] = platformData;
      } else {
        project.publishing.platforms.push(platformData);
      }

      results.push({
        platform,
        status: 'pending',
        message: `Queued for publishing to ${platform}`
      });
    }

    await project.save();

    res.json({
      success: true,
      message: 'Cross-posting initiated',
      results
    });
  } catch (error) {
    console.error('Cross-post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get publishing analytics
router.get('/project/:projectId/analytics', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { platform, dateRange } = req.query;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access
    const hasAccess = project.creator.toString() === req.user.userId ||
                     project.collaborators.some(c => c.user.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let platforms = project.publishing.platforms;
    if (platform) {
      platforms = platforms.filter(p => p.name === platform);
    }

    // Mock analytics data
    const analytics = {
      totalViews: platforms.reduce((sum, p) => sum + p.analytics.views, 0),
      totalLikes: platforms.reduce((sum, p) => sum + p.analytics.likes, 0),
      totalShares: platforms.reduce((sum, p) => sum + p.analytics.shares, 0),
      totalComments: platforms.reduce((sum, p) => sum + p.analytics.comments, 0),
      platforms: platforms.map(p => ({
        name: p.name,
        status: p.status,
        publishedAt: p.publishedAt,
        url: p.url,
        analytics: p.analytics,
        engagement: ((p.analytics.likes + p.analytics.shares + p.analytics.comments) / Math.max(p.analytics.views, 1) * 100).toFixed(2)
      })),
      topPerformingPlatform: platforms.reduce((top, current) => 
        current.analytics.views > top.analytics.views ? current : top
      , platforms[0] || { name: 'none', analytics: { views: 0 } })
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update publishing settings
router.put('/project/:projectId/settings', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { autoPublish, crossPost, platforms } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const canEdit = project.creator.toString() === req.user.userId ||
                   project.collaborators.some(c => 
                     c.user.toString() === req.user.userId && 
                     ['editor', 'contributor'].includes(c.role)
                   );

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this project'
      });
    }

    // Update publishing settings
    if (autoPublish !== undefined) project.publishing.autoPublish = autoPublish;
    if (crossPost !== undefined) project.publishing.crossPost = crossPost;

    await project.save();

    res.json({
      success: true,
      message: 'Publishing settings updated',
      settings: {
        autoPublish: project.publishing.autoPublish,
        crossPost: project.publishing.crossPost
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Cancel scheduled publishing
router.delete('/project/:projectId/schedule/:platform', auth, async (req, res) => {
  try {
    const { projectId, platform } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permissions
    const canEdit = project.creator.toString() === req.user.userId ||
                   project.collaborators.some(c => 
                     c.user.toString() === req.user.userId && 
                     ['editor', 'contributor'].includes(c.role)
                   );

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this project'
      });
    }

    const platformIndex = project.publishing.platforms.findIndex(p => p.name === platform);
    if (platformIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Platform not found'
      });
    }

    // Remove the platform
    project.publishing.platforms.splice(platformIndex, 1);
    await project.save();

    res.json({
      success: true,
      message: `Scheduled publishing to ${platform} cancelled`
    });
  } catch (error) {
    console.error('Cancel schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;