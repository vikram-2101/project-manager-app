const Project = require("../models/Project");
const User = require("../models/User"); // Required for user role updates, etc.
const Task = require("../models/Task"); // For cascading delete (optional, but good practice)
const Comment = require("../models/Comment"); // For cascading delete (optional)
const Notification = require("../models/Notification"); // For cascading delete (optional)

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const NotificationService = require("../services/notificationService"); // Ensure this is imported

// Helper function to check if user is the project manager or a team member of a given project
// This is crucial for securing project-related operations.
const checkProjectAuthorization = async (
  projectId,
  userId,
  allowedRoles = []
) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError("No project found with that ID.", 404);
  }

  const isProjectManager =
    project.projectManager.toString() === userId.toString();
  const isTeamMember = project.teamMembers.some(
    (member) => member.toString() === userId.toString()
  );
  const isGlobalAdmin =
    allowedRoles.includes("admin") && userId.role === "admin"; // Pass req.user.role if using this check

  if (isGlobalAdmin) return true; // Global admin can do anything

  // Default: must be project manager or a team member to access a project's details/tasks
  if (!isProjectManager && !isTeamMember) {
    throw new AppError("You are not authorized to access this project.", 403);
  }

  // If specific roles are required (e.g., only project manager can update)
  if (allowedRoles.includes("projectManager") && !isProjectManager) {
    throw new AppError(
      "You must be the project manager to perform this action.",
      403
    );
  }
  // Add more specific role checks as needed (e.g., 'teamMember')

  return project; // Return the project if authorized, helpful for subsequent operations
};

exports.createProject = catchAsync(async (req, res, next) => {
  // Extract fields from the request body matching the schema
  const {
    name,
    description,
    type,
    clientName,
    startDate,
    endDate,
    deadline,
    priority,
    status,
    access,
    tags,
    attachments,
  } = req.body;

  // The user creating the project (req.user) will be the projectManager.
  // We already have req.user from the `authMiddleware.protect` middleware.
  const projectManagerId = req.user._id;

  // Create the project instance
  const newProject = await Project.create({
    name,
    description,
    type,
    clientName,
    startDate,
    endDate,
    deadline,
    projectManager: projectManagerId, // Assign the authenticated user as project manager
    teamMembers: [projectManagerId], // Automatically add the project manager to team members
    priority,
    status,
    access,
    tags,
    attachments,
  });
  if (req.user.role !== "admin") {
    await User.findByIdAndUpdate(
      req.user._id,
      { role: "admin" },
      { new: true, runValidators: false }
    );
  }

  // Notify the project manager that they created a project (optional, but good for confirmation)
  await NotificationService.createNotification(
    {
      userId: projectManagerId,
      message: `You created a new project: "${newProject.name}".`,
      type: "project",
      link: `/projects/${newProject._id}`,
    },
    req.io
  ); // Pass req.io here!

  res.status(201).json({
    status: "success",
    data: {
      project: newProject,
    },
  });
});
// Optional: Update the user's global role to 'admin' if they are the project manager
// This logic depends on whether 'admin' means global admin or just 'project creator' status.
// If 'admin' implies managing ALL users/projects, you might have a separate process for it.
// If it simply means a user who has created a project, this makes sense.
// For a more structured approach, 'admin' could be a separate global role assigned manually.
// If you want the project manager to have special project-level permissions (e.g., project-admin),
// you'd manage that within the project's internal member roles if you adapt the `members` array strategy from prior response.
// For this schema, `projectManager` directly implies the admin of THIS project.

// Example for promoting the *creator* to a global 'admin' role, only if they aren't already:
// Note: req.user.role in the current request won't reflect this change immediately,
// but it will be updated in the database for future requests.
// You might need to re-issue JWT or update frontend context if roles are frequently checked.

exports.getAllProjects = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Find projects where the user is either the projectManager or a teamMember
  const projects = await Project.find({
    $or: [{ projectManager: userId }, { teamMembers: userId }],
  }).sort("-createdAt"); // Sort by creation date descending

  res.status(200).json({
    status: "success",
    results: projects.length,
    data: {
      projects,
    },
  });
});

exports.getProject = catchAsync(async (req, res, next) => {
  const projectId = req.params.id;
  const userId = req.user._id;

  // Use the helper to check authorization
  const project = await checkProjectAuthorization(projectId, userId);

  // The project object is returned by checkProjectAuthorization if authorized
  res.status(200).json({
    status: "success",
    data: {
      project,
    },
  });
});
exports.updateProject = catchAsync(async (req, res, next) => {
  const projectId = req.params.id;
  const userId = req.user._id;

  // Restrict update primarily to the project manager or global admin
  // Pass req.user to checkProjectAuthorization if you want to use req.user.role inside it
  const project = await checkProjectAuthorization(projectId, userId, [
    "projectManager",
    "admin",
  ]);

  // Prevent direct update of projectManager or teamMembers via this route
  // These should be handled by specific endpoints like `addTeamMembers`
  const disallowedFields = ["projectManager", "teamMembers", "createdAt"];
  disallowedFields.forEach((field) => {
    if (req.body[field]) {
      delete req.body[field]; // Remove field from body if present
    }
  });

  const updatedProject = await Project.findByIdAndUpdate(projectId, req.body, {
    new: true, // Return the modified document rather than the original
    runValidators: true, // Run schema validators on the update operation
  });

  // Since updatedProject is populated by schema pre-hooks, we can use its name
  await NotificationService.createNotification(
    {
      userId: project.projectManager, // Notify project manager
      message: `Project "${updatedProject.name}" has been updated.`,
      type: "project",
      link: `/projects/${updatedProject._id}`,
    },
    req.io
  );
  // You might also notify all team members here, depending on update significance.

  res.status(200).json({
    status: "success",
    data: {
      project: updatedProject,
    },
  });
});
exports.deleteProject = catchAsync(async (req, res, next) => {
  const projectId = req.params.id;
  const userId = req.user._id;

  // Only the project manager or a global admin can delete a project
  const project = await checkProjectAuthorization(projectId, userId, [
    "projectManager",
    "admin",
  ]);

  // --- OPTIONAL: Cascading Delete ---
  // If you delete a project, you likely want to delete all associated tasks, comments, and notifications.
  // This helps maintain data integrity. Be very careful with this in production!
  await Task.deleteMany({ project: projectId });
  // Find all comments belonging to tasks within this project (more complex query if needed)
  // For simplicity, if comments are linked only to tasks, deleting tasks deletes comments via task_id.
  // If comments directly reference project, add: await Comment.deleteMany({ project: projectId });
  await Notification.deleteMany({
    link: { $regex: new RegExp(`/projects/${projectId}`) },
  }); // Delete notifications related to this project

  await Project.findByIdAndDelete(projectId);

  // Notify the project manager (creator) about deletion
  await NotificationService.createNotification(
    {
      userId: project.projectManager,
      message: `Project "${project.name}" has been deleted.`,
      type: "system", // Use a 'system' type for deletion notices
      link: `/dashboard`, // No specific project page to link to anymore
    },
    req.io
  );

  // You might also notify all previous team members that the project was deleted.

  res.status(204).json({
    // 204 No Content for successful deletion
    status: "success",
    data: null,
  });
});
// New endpoint to add team members to a project by an authorized user (projectManager or admin)
exports.addTeamMembers = catchAsync(async (req, res, next) => {
  const projectId = req.params.id;
  const { memberIds } = req.body; // Array of User IDs to add

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return next(
      new AppError("Please provide an array of team member IDs.", 400)
    );
  }

  const project = await Project.findById(projectId);

  if (!project) {
    return next(new AppError("No project found with that ID.", 404));
  }

  // Authorization check: Only the project manager or a global admin can add members
  if (
    project.projectManager.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new AppError(
        "You do not have permission to add members to this project.",
        403
      )
    );
  }
  const oldMembers = project.teamMembers.map((m) => m.toString());

  // Filter out members already present to avoid duplicates
  const uniqueNewMemberIds = memberIds.filter(
    (id) => !project.teamMembers.map((m) => m.toString()).includes(id)
  );

  if (uniqueNewMemberIds.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "All provided members are already part of the project.",
      data: {
        project,
      },
    });
  }

  // Find the actual User documents for validation (optional but good practice)
  const usersToAdd = await User.find({ _id: { $in: uniqueNewMemberIds } });
  if (usersToAdd.length !== uniqueNewMemberIds.length) {
    // This means some provided IDs don't correspond to actual users
    const missingIds = uniqueNewMemberIds.filter(
      (id) => !usersToAdd.some((user) => user._id.toString() === id)
    );
    return next(
      new AppError(
        `Some provided user IDs are invalid or do not exist: ${missingIds.join(
          ", "
        )}`,
        400
      )
    );
  }

  project.teamMembers.push(...uniqueNewMemberIds);
  await project.save(); // Mongoose will handle array uniqueness if schema options allow, or you do it manually above
  for (const member of usersToAdd) {
    await NotificationService.createNotification(
      {
        userId: member._id,
        message: `You have been added to the project: "${project.name}".`,
        type: "project",
        link: `/projects/${project._id}`,
      },
      req.io
    ); // Pass req.io
  }

  res.status(200).json({
    status: "success",
    message: "Team members added successfully.",
    data: {
      project, // Returns the project with populated teamMembers
    },
  });
});
