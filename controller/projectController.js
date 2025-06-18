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

module.exports = { createProject, getUserProjects };
