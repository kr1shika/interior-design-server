const Project = require("../model/project.js");
const Chatroom = require("../model/chat-room.js");
const Notification = require("../model/user-notification.js");
const Review = require("../model/review.js"); // Add this import
const User = require("../model/user.js"); // Add this import

const getUserProjects = async (req, res) => {
  const userId = req.params.userId;

  try {
    const projects = await Project.find({
      $or: [{ client: userId }, { designer: userId }],
    });

    res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      client,
      designer,
      room_dimensions,
      room_type,
      style_preferences,
      color_palette,
      payment,
      reference_images,
      start_date,
      end_date,
      is_public
    } = req.body;

    // Step 1: Create project
    const newProject = new Project({
      title,
      description,
      client,
      designer,
      room_dimensions,
      room_type,
      style_preferences,
      color_palette,
      payment,
      reference_images,
      start_date,
      end_date,
      is_public
    });

    await newProject.save();

    // Step 2: Initialize chatroom
    const initialMessage = new Chatroom({
      senderId: client,
      receiverId: designer,
      projectId: newProject._id,
      text: `Chat room initialized for project "${title}".`,
      attachments: [],
      read_by: [client]
    });

    await initialMessage.save();

    const newNotification = new Notification({
      user: designer,
      title: "New Project Assigned",
      message: `You have been assigned a new project titled "${title}".`,
      type: "project_update",
      related_entity: {
        entity_type: "project",
        entity_id: newProject._id
      }
    });

    await newNotification.save();

    res.status(201).json({
      message: "Project, chatroom, and notification created successfully",
      project: newProject
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProjectStatus = async (req, res) => {
  const { projectId } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid project status provided." });
  }

  try {
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { status },
      { new: true } // return updated document
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Optional: notify client and designer
    const clientNotification = new Notification({
      user: updatedProject.client,
      title: "Project Status Updated",
      message: `The status of your project "${updatedProject.title}" has been updated to "${status}".`,
      type: "project_update",
      related_entity: {
        entity_type: "project",
        entity_id: updatedProject._id,
      },
    });

    const designerNotification = new Notification({
      user: updatedProject.designer,
      title: "Project Status Updated",
      message: `The status of the project "${updatedProject.title}" has been updated to "${status}".`,
      type: "project_update",
      related_entity: {
        entity_type: "project",
        entity_id: updatedProject._id,
      },
    });

    await Promise.all([clientNotification.save(), designerNotification.save()]);

    res.status(200).json({
      message: "Project status updated successfully.",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const updateProjectRoomDetails = async (req, res) => {
  const { projectId } = req.params;

  try {
    const {
      length,
      width,
      height,
      description
    } = req.body;

    // Find the project
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
    const updateData = {};

    // Handle uploaded room images
    if (req.files && req.files.length > 0) {
      console.log("✅ Room images received:", req.files.length, "files");
      const newImagePaths = req.files.map(file => `/room_images/${file.filename}`);
      // Add new images to existing reference_images array
      updateData.reference_images = [...(project.reference_images || []), ...newImagePaths];
    }

    // Handle room dimensions
    if (length || width || height) {
      const parsedLength = length ? parseFloat(length) : project.room_dimensions?.length;
      const parsedWidth = width ? parseFloat(width) : project.room_dimensions?.width;
      const parsedHeight = height ? parseFloat(height) : project.room_dimensions?.height;

      if (isNaN(parsedLength) || isNaN(parsedWidth) || isNaN(parsedHeight)) {
        return res.status(400).json({
          message: "Invalid room dimensions. Please provide valid numeric values."
        });
      }

      updateData.room_dimensions = {
        length: parsedLength,
        width: parsedWidth,
        height: parsedHeight
      };
    }

    if (description) {
      updateData.description = description.trim();
    }

    // Update the project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      { new: true, runValidators: true }
    );

    // Create notification for the designer about the room details update
    const designerNotification = new Notification({
      user: project.designer,
      title: "Room Details Updated",
      message: `The client has updated room details for project "${project.title}". Please review the new information.`,
      type: "project_update",
      related_entity: {
        entity_type: "project",
        entity_id: project._id
      }
    });

    await designerNotification.save();

    console.log("✅ Room details updated for project:", project._id);
    res.status(200).json({
      message: "Room details updated successfully.",
      project: updatedProject,
      updated_fields: Object.keys(updateData)
    });

  } catch (error) {
    console.error("❌ Error updating room details:", error);
    res.status(500).json({
      message: "Failed to update room details.",
      errorType: error.name,
      errorMessage: error.message,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined
    });
  }
};

// New function to get designer dashboard statistics with proper rating calculation
const getDesignerStats = async (req, res) => {
  const designerId = req.params.designerId;

  try {
    // Get all projects for this designer
    const projects = await Project.find({ designer: designerId });

    // Get designer's average rating using the Review model's static method
    const ratingData = await Review.getDesignerAverageRating(designerId);

    // Calculate basic stats
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p =>
        p.status === 'pending' || p.status === 'in_progress'
      ).length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      totalClients: new Set(projects.map(p => p.client)).size,
      revenueThisMonth: 0,
      totalRevenue: 0,
      averageRating: ratingData.averageRating,
      totalReviews: ratingData.totalReviews
    };

    // Calculate this month's revenue (based on project completion date)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // For revenue calculation, we should ideally track when payment was received
    // For now, we'll estimate based on completed projects this month
    stats.revenueThisMonth = projects
      .filter(p => {
        const projectDate = new Date(p.updatedAt); // Use updatedAt as proxy for completion
        return projectDate.getMonth() === currentMonth &&
          projectDate.getFullYear() === currentYear &&
          p.status === 'completed' &&
          p.payment === 'completed'; // Only count completed payments
      })
      .reduce((total, p) => {
        // Extract numeric value from payment if it's a string with amount
        // You might need to adjust this based on how payment amounts are stored
        return total + 1000; // Placeholder - you should store actual payment amounts
      }, 0);

    // Calculate total revenue from completed projects with completed payments
    stats.totalRevenue = projects
      .filter(p => p.status === 'completed' && p.payment === 'completed')
      .reduce((total, p) => {
        return total + 1000; // Placeholder - you should store actual payment amounts
      }, 0);

    // Additional useful stats
    stats.projectsByStatus = {
      pending: projects.filter(p => p.status === 'pending').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length
    };

    // Payment status breakdown
    stats.paymentStatus = {
      pending: projects.filter(p => p.payment === 'pending').length,
      half_installment: projects.filter(p => p.payment === 'half-installment').length,
      completed: projects.filter(p => p.payment === 'completed').length
    };

    // Monthly project completion rate (last 6 months)
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthlyCompletions = projects.filter(p => {
        const projectDate = new Date(p.updatedAt);
        return projectDate.getMonth() === month &&
          projectDate.getFullYear() === year &&
          p.status === 'completed';
      }).length;

      monthlyStats.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        completions: monthlyCompletions
      });
    }
    stats.monthlyStats = monthlyStats;

    // Recent reviews (last 5)
    const recentReviews = await Review.find({
      designer: designerId,
      status: 'active'
    })
      .populate('client', 'full_name profilepic')
      .populate('project', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    stats.recentReviews = recentReviews;


    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching designer stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get designer performance metrics
const getDesignerPerformance = async (req, res) => {
  const designerId = req.params.designerId;

  try {
    const projects = await Project.find({ designer: designerId });

    // Calculate average project completion time
    const completedProjects = projects.filter(p => p.status === 'completed');
    let averageCompletionTime = 0;

    if (completedProjects.length > 0) {
      const totalDays = completedProjects.reduce((sum, project) => {
        const start = new Date(project.createdAt);
        const end = new Date(project.updatedAt);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

      averageCompletionTime = Math.round(totalDays / completedProjects.length);
    }

    // Calculate success rate (completed vs cancelled)
    const successRate = projects.length > 0
      ? Math.round((completedProjects.length / projects.length) * 100)
      : 0;

    // Recent activity (projects created/updated in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = projects.filter(p =>
      new Date(p.updatedAt) >= thirtyDaysAgo
    ).length;

    // Get rating breakdown
    const reviews = await Review.find({
      designer: designerId,
      status: 'active'
    });

    const ratingBreakdown = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    const performance = {
      averageCompletionTime,
      successRate,
      recentActivity,
      totalProjects: projects.length,
      activeProjects: projects.filter(p =>
        p.status === 'pending' || p.status === 'in_progress'
      ).length,
      ratingBreakdown,
      totalReviews: reviews.length
    };

    res.status(200).json(performance);
  } catch (error) {
    console.error("Error fetching designer performance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get project payment amounts for revenue calculation
const getProjectRevenue = async (req, res) => {
  const designerId = req.params.designerId;

  try {
    // You'll need to modify your Project model to include actual payment amounts
    // For now, this is a placeholder that returns estimated revenue
    const projects = await Project.find({
      designer: designerId,
      status: 'completed',
      payment: 'completed'
    });

    const revenue = {
      totalRevenue: projects.length * 1000, // Placeholder calculation
      monthlyRevenue: [],
      projectRevenue: projects.map(p => ({
        projectId: p._id,
        title: p.title,
        amount: 1000, // You should store actual amounts
        completedAt: p.updatedAt,
        client: p.client
      }))
    };

    // Calculate monthly revenue for the last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthlyAmount = projects.filter(p => {
        const projectDate = new Date(p.updatedAt);
        return projectDate.getMonth() === month &&
          projectDate.getFullYear() === year;
      }).length * 1000; // Placeholder calculation

      revenue.monthlyRevenue.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthlyAmount
      });
    }

    res.status(200).json(revenue);
  } catch (error) {
    console.error("Error fetching designer revenue:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createProject,
  getUserProjects,
  updateProjectStatus,
  updateProjectRoomDetails,
  getDesignerStats,
  getDesignerPerformance,
  getProjectRevenue
};