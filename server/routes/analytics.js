const express = require('express');
const Project = require('../models/Project');
const { auth, requireSubscription } = require('../middleware/auth');

const router = express.Router();

// Get overall analytics dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    
    // Get user's projects
    const projects = await Project.find({
      $or: [
        { creator: req.user.userId },
        { 'collaborators.user': req.user.userId }
      ]
    });

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Mock analytics data
    const analytics = {
      overview: {
        totalProjects: projects.length,
        publishedProjects: projects.filter(p => p.status === 'published').length,
        totalViews: projects.reduce((sum, p) => sum + p.analytics.views, 0),
        totalEngagement: projects.reduce((sum, p) => sum + p.analytics.engagement, 0),
        totalReach: projects.reduce((sum, p) => sum + p.analytics.reach, 0),
        totalConversions: projects.reduce((sum, p) => sum + p.analytics.conversions, 0)
      },
      performance: {
        topPerformingProjects: projects
          .sort((a, b) => b.analytics.views - a.analytics.views)
          .slice(0, 5)
          .map(p => ({
            id: p._id,
            title: p.title,
            type: p.type,
            views: p.analytics.views,
            engagement: p.analytics.engagement,
            reach: p.analytics.reach
          })),
        platformBreakdown: [
          { platform: 'Instagram', posts: 45, engagement: 8.2, reach: 12500 },
          { platform: 'Facebook', posts: 32, engagement: 6.8, reach: 8900 },
          { platform: 'Twitter', posts: 28, engagement: 4.5, reach: 6700 },
          { platform: 'YouTube', posts: 15, engagement: 12.3, reach: 23400 },
          { platform: 'LinkedIn', posts: 22, engagement: 5.1, reach: 4500 }
        ],
        contentTypePerformance: [
          { type: 'Video', count: 25, avgViews: 1200, avgEngagement: 9.2 },
          { type: 'Image', count: 45, avgViews: 800, avgEngagement: 6.8 },
          { type: 'Article', count: 18, avgViews: 1500, avgEngagement: 7.5 },
          { type: 'Story', count: 32, avgViews: 600, avgEngagement: 5.2 }
        ]
      },
      trends: {
        viewsOverTime: generateTimeSeriesData(startDate, endDate, 1000, 5000),
        engagementOverTime: generateTimeSeriesData(startDate, endDate, 5, 15),
        reachOverTime: generateTimeSeriesData(startDate, endDate, 500, 2000)
      },
      insights: [
        {
          type: 'performance',
          title: 'Video content performs 35% better',
          description: 'Your video posts receive 35% more engagement than other content types',
          metric: '+35%',
          trend: 'up'
        },
        {
          type: 'timing',
          title: 'Best posting time identified',
          description: 'Posts published between 2-4 PM receive 25% more engagement',
          metric: '+25%',
          trend: 'up'
        },
        {
          type: 'audience',
          title: 'Growing audience engagement',
          description: 'Your audience engagement has increased by 18% this month',
          metric: '+18%',
          trend: 'up'
        }
      ]
    };

    res.json({
      success: true,
      analytics,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get project-specific analytics
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { dateRange = '30d' } = req.query;

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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const analytics = {
      overview: {
        views: project.analytics.views,
        engagement: project.analytics.engagement,
        reach: project.analytics.reach,
        conversions: project.analytics.conversions,
        publishedAt: project.createdAt,
        lastUpdated: project.updatedAt
      },
      platforms: project.publishing.platforms.map(platform => ({
        name: platform.name,
        status: platform.status,
        publishedAt: platform.publishedAt,
        url: platform.url,
        analytics: platform.analytics,
        engagement: ((platform.analytics.likes + platform.analytics.shares + platform.analytics.comments) / Math.max(platform.analytics.views, 1) * 100).toFixed(2)
      })),
      performance: {
        viewsOverTime: generateTimeSeriesData(startDate, endDate, 50, 200),
        engagementOverTime: generateTimeSeriesData(startDate, endDate, 2, 8),
        reachOverTime: generateTimeSeriesData(startDate, endDate, 25, 100)
      },
      audience: {
        demographics: {
          ageGroups: [
            { range: '18-24', percentage: 25 },
            { range: '25-34', percentage: 35 },
            { range: '35-44', percentage: 20 },
            { range: '45+', percentage: 20 }
          ],
          locations: [
            { country: 'United States', percentage: 45 },
            { country: 'United Kingdom', percentage: 15 },
            { country: 'Canada', percentage: 12 },
            { country: 'Australia', percentage: 8 },
            { country: 'Other', percentage: 20 }
          ],
          interests: [
            { interest: 'Technology', percentage: 30 },
            { interest: 'Business', percentage: 25 },
            { interest: 'Lifestyle', percentage: 20 },
            { interest: 'Entertainment', percentage: 15 },
            { interest: 'Other', percentage: 10 }
          ]
        },
        behavior: {
          peakHours: [
            { hour: '9', engagement: 15 },
            { hour: '10', engagement: 18 },
            { hour: '11', engagement: 22 },
            { hour: '12', engagement: 25 },
            { hour: '13', engagement: 28 },
            { hour: '14', engagement: 30 },
            { hour: '15', engagement: 32 },
            { hour: '16', engagement: 29 },
            { hour: '17', engagement: 26 },
            { hour: '18', engagement: 23 },
            { hour: '19', engagement: 20 },
            { hour: '20', engagement: 18 }
          ],
          deviceBreakdown: [
            { device: 'Mobile', percentage: 65 },
            { device: 'Desktop', percentage: 25 },
            { device: 'Tablet', percentage: 10 }
          ]
        }
      },
      insights: [
        {
          type: 'performance',
          title: 'Strong engagement on LinkedIn',
          description: 'This post performed 40% better than your average LinkedIn posts',
          metric: '+40%',
          trend: 'up'
        },
        {
          type: 'timing',
          title: 'Optimal posting time',
          description: 'Published at peak engagement hours (2-4 PM)',
          metric: 'Peak Time',
          trend: 'optimal'
        },
        {
          type: 'audience',
          title: 'New audience reached',
          description: 'Reached 25% new followers with this content',
          metric: '+25%',
          trend: 'up'
        }
      ]
    };

    res.json({
      success: true,
      analytics,
      project: {
        id: project._id,
        title: project.title,
        type: project.type,
        status: project.status
      }
    });
  } catch (error) {
    console.error('Project analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get comparative analytics
router.get('/compare', auth, requireSubscription('pro'), async (req, res) => {
  try {
    const { projectIds, metric, dateRange = '30d' } = req.query;

    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({
        success: false,
        message: 'Project IDs are required'
      });
    }

    const projects = await Project.find({
      _id: { $in: projectIds },
      $or: [
        { creator: req.user.userId },
        { 'collaborators.user': req.user.userId }
      ]
    });

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No projects found'
      });
    }

    const comparison = {
      projects: projects.map(project => ({
        id: project._id,
        title: project.title,
        type: project.type,
        status: project.status,
        analytics: project.analytics,
        publishedAt: project.createdAt
      })),
      metrics: {
        views: projects.map(p => ({ id: p._id, value: p.analytics.views })),
        engagement: projects.map(p => ({ id: p._id, value: p.analytics.engagement })),
        reach: projects.map(p => ({ id: p._id, value: p.analytics.reach })),
        conversions: projects.map(p => ({ id: p._id, value: p.analytics.conversions }))
      },
      insights: [
        {
          type: 'comparison',
          title: 'Performance comparison',
          description: `Project "${projects[0]?.title}" performed ${Math.floor(Math.random() * 50) + 10}% better than others`,
          metric: `+${Math.floor(Math.random() * 50) + 10}%`,
          trend: 'up'
        }
      ]
    };

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Compare analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get audience insights
router.get('/audience', auth, requireSubscription('pro'), async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;

    // Mock audience data
    const audience = {
      demographics: {
        ageDistribution: [
          { age: '18-24', count: 1250, percentage: 25 },
          { age: '25-34', count: 1750, percentage: 35 },
          { age: '35-44', count: 1000, percentage: 20 },
          { age: '45-54', count: 600, percentage: 12 },
          { age: '55+', count: 400, percentage: 8 }
        ],
        genderDistribution: [
          { gender: 'Male', count: 2400, percentage: 48 },
          { gender: 'Female', count: 2300, percentage: 46 },
          { gender: 'Other', count: 300, percentage: 6 }
        ],
        locationDistribution: [
          { country: 'United States', count: 2250, percentage: 45 },
          { country: 'United Kingdom', count: 750, percentage: 15 },
          { country: 'Canada', count: 600, percentage: 12 },
          { country: 'Australia', count: 400, percentage: 8 },
          { country: 'Germany', count: 300, percentage: 6 },
          { country: 'Other', count: 700, percentage: 14 }
        ]
      },
      behavior: {
        activeHours: generateHourlyData(),
        activeDays: [
          { day: 'Monday', engagement: 85 },
          { day: 'Tuesday', engagement: 92 },
          { day: 'Wednesday', engagement: 88 },
          { day: 'Thursday', engagement: 95 },
          { day: 'Friday', engagement: 78 },
          { day: 'Saturday', engagement: 65 },
          { day: 'Sunday', engagement: 70 }
        ],
        deviceUsage: [
          { device: 'Mobile', count: 3250, percentage: 65 },
          { device: 'Desktop', count: 1250, percentage: 25 },
          { device: 'Tablet', count: 500, percentage: 10 }
        ],
        contentPreferences: [
          { type: 'Video', engagement: 9.2, percentage: 35 },
          { type: 'Image', engagement: 6.8, percentage: 45 },
          { type: 'Article', engagement: 7.5, percentage: 15 },
          { type: 'Story', engagement: 5.2, percentage: 5 }
        ]
      },
      growth: {
        followerGrowth: generateTimeSeriesData(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date(), 4000, 5000),
        engagementGrowth: generateTimeSeriesData(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date(), 5, 8),
        reachGrowth: generateTimeSeriesData(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date(), 2000, 3000)
      },
      insights: [
        {
          type: 'demographics',
          title: 'Young audience growth',
          description: 'Your audience aged 25-34 has grown by 23% this quarter',
          metric: '+23%',
          trend: 'up'
        },
        {
          type: 'behavior',
          title: 'Mobile-first audience',
          description: '65% of your audience engages on mobile devices',
          metric: '65%',
          trend: 'stable'
        },
        {
          type: 'content',
          title: 'Video preference',
          description: 'Video content receives 35% higher engagement',
          metric: '+35%',
          trend: 'up'
        }
      ]
    };

    res.json({
      success: true,
      audience
    });
  } catch (error) {
    console.error('Audience analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to generate time series data
function generateTimeSeriesData(startDate, endDate, minValue, maxValue) {
  const data = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    data.push({
      date: new Date(currentDate),
      value: Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

// Helper function to generate hourly data
function generateHourlyData() {
  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    data.push({
      hour: hour.toString().padStart(2, '0'),
      engagement: Math.floor(Math.random() * 50) + 10
    });
  }
  return data;
}

module.exports = router;