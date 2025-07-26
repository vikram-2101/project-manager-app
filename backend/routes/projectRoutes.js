const express = require("express");
const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all project routes
router.use(authMiddleware.protect);

// Routes for creating and fetching projects
router
  .route("/")
  .post(projectController.createProject) // Only authenticated users can create
  .get(projectController.getAllProjects); // You'll need to implement getAllProjects

// Routes for specific project operations
router
  .route("/:id")
  .get(projectController.getProject) // Get single project
  .patch(
    authMiddleware.restrictTo("admin"), // Or a more granular project-level admin check
    projectController.updateProject // Update project
  )
  .delete(
    authMiddleware.restrictTo("admin"), // Only global admin can delete for now
    projectController.deleteProject // Delete project
  );

// Route to add team members to a project
// Only projectManager or global admin can do this
router.patch("/:id/add-members", projectController.addTeamMembers);

// You'll likely need routes for:
// - Getting projects a user is part of (e.g., /api/v1/users/:userId/projects)
// - Removing team members from a project
// - Managing tasks within a project (will be nested routes or separate task routes)

module.exports = router;
