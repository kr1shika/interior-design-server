const Project = require("../model/project.js");
const Chatroom = require("../model/chat-room.js");
const Notification = require("../model/user-notification.js");
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

// Add this to the module.exports
module.exports = {
  createProject,
  getUserProjects,
  updateProjectStatus,
  updateProjectRoomDetails
};