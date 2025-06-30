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

    // ✅ Step 3: Create notification for the designer
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


module.exports = { createProject, getUserProjects, updateProjectStatus };