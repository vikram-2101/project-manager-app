const Project = require("../models/Project");
const User = require("../models/User"); // Ensure User model is imported
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ... other imports

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

  // Optional: Update the user's global role to 'admin' if they are the project manager
  // This logic depends on whether 'admin' means global admin or just 'project creator' status.
  // If 'admin' implies managing ALL users/projects, you might have a separate process for it.
  // If it simply means a user who has created a project, this makes sense.
  // For a more structured approach, 'admin' could be a separate global role assigned manually.
  // If you want the project manager to have special project-level permissions (e.g., project-admin),
  // you'd manage that within the project's internal member roles if you adapt the `members` array strategy from prior response.
  // For this schema, `projectManager` directly implies the admin of THIS project.

  // Example for promoting the *creator* to a global 'admin' role, only if they aren't already:
  if (req.user.role !== "admin") {
    await User.findByIdAndUpdate(
      req.user._id,
      { role: "admin" },
      { new: true, runValidators: false }
    );
    // Note: req.user.role in the current request won't reflect this change immediately,
    // but it will be updated in the database for future requests.
    // You might need to re-issue JWT or update frontend context if roles are frequently checked.
  }

  res.status(201).json({
    status: "success",
    data: {
      project: newProject, // The populated newProject will be returned due to schema middleware
    },
  });
});

// You'll also need other CRUD operations for projects
// exports.getAllProjects = catchAsync(async (req, res, next) => { ... });
// exports.getProject = catchAsync(async (req, res, next) => { ... });
// exports.updateProject = catchAsync(async (req, res, next) => { ... });
// exports.deleteProject = catchAsync(async (req, res, next) => { ... });

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

  res.status(200).json({
    status: "success",
    message: "Team members added successfully.",
    data: {
      project, // Returns the project with populated teamMembers
    },
  });
});
