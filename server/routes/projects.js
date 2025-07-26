const express = require('express');
const Project = require('../models/Project');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    
    const query = {
      $or: [
        { creator: req.user.userId },
        { 'collaborators.user': req.user.userId }
      ]
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const projects = await Project.find(query)
      .populate('creator', 'firstName lastName username avatar')
      .populate('collaborators.user', 'firstName lastName username avatar')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'firstName lastName username avatar')
      .populate('collaborators.user', 'firstName lastName username avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = project.creator._id.toString() === req.user.userId ||
                     project.collaborators.some(c => c.user._id.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new project
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      content,
      settings,
      tags,
      category,
      targetAudience,
      budget,
      deadline
    } = req.body;

    const project = new Project({
      title,
      description,
      type,
      content: content || {},
      settings: settings || {},
      tags: tags || [],
      category,
      targetAudience,
      budget,
      deadline,
      creator: req.user.userId
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('creator', 'firstName lastName username avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user can edit this project
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

    const updateData = req.body;
    delete updateData.creator; // Prevent changing creator
    delete updateData.collaborators; // Handle collaborators separately

    Object.assign(project, updateData);
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('creator', 'firstName lastName username avatar')
      .populate('collaborators.user', 'firstName lastName username avatar');

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only creator can delete project
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this project'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add collaborator to project
router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only creator can add collaborators
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can add collaborators'
      });
    }

    // Check if user is already a collaborator
    const existingCollaborator = project.collaborators.find(
      c => c.user.toString() === userId
    );

    if (existingCollaborator) {
      return res.status(400).json({
        success: false,
        message: 'User is already a collaborator'
      });
    }

    project.collaborators.push({
      user: userId,
      role: role || 'viewer'
    });

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('creator', 'firstName lastName username avatar')
      .populate('collaborators.user', 'firstName lastName username avatar');

    res.json({
      success: true,
      message: 'Collaborator added successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Remove collaborator from project
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Only creator can remove collaborators
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can remove collaborators'
      });
    }

    project.collaborators = project.collaborators.filter(
      c => c.user.toString() !== req.params.userId
    );

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('creator', 'firstName lastName username avatar')
      .populate('collaborators.user', 'firstName lastName username avatar');

    res.json({
      success: true,
      message: 'Collaborator removed successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Duplicate project
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const originalProject = await Project.findById(req.params.id);

    if (!originalProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    const hasAccess = originalProject.creator.toString() === req.user.userId ||
                     originalProject.collaborators.some(c => c.user.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const duplicatedProject = new Project({
      ...originalProject.toObject(),
      _id: undefined,
      title: `${originalProject.title} (Copy)`,
      status: 'draft',
      creator: req.user.userId,
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await duplicatedProject.save();

    const populatedProject = await Project.findById(duplicatedProject._id)
      .populate('creator', 'firstName lastName username avatar');

    res.status(201).json({
      success: true,
      message: 'Project duplicated successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Duplicate project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;