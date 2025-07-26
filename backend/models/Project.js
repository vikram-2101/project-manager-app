const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A project must have a name"],
    unique: true,
    trim: true, // Remove whitespace from both ends of a string
  },
  description: String,
  type: String, // e.g., 'Web Development', 'Mobile App', 'Marketing Campaign'
  clientName: String,
  startDate: Date,
  endDate: Date,
  deadline: Date,
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "A project must have a project manager"],
  },
  // The creator of the project will also be the initial projectManager
  // We'll update the 'teamMembers' array to include the project manager
  teamMembers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium",
  },
  status: {
    type: String,
    enum: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"], // More robust statuses
    default: "Not Started",
  },
  access: {
    type: String,
    enum: ["Public", "Private"],
    default: "Private", // Only accessible to team members
  },
  tags: [String], // Array of strings for categorization (e.g., ['backend', 'frontend', 'UI/UX'])
  attachments: [String], // Array of file URLs (e.g., cloud storage links)
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add an index to the project name for faster lookups and unique constraint enforcement
ProjectSchema.index({ name: 1 });

// Middleware to populate projectManager and teamMembers when queried
ProjectSchema.pre(/^find/, function (next) {
  this.populate({
    path: "projectManager",
    select: "name email photo", // Select specific fields to return
  }).populate({
    path: "teamMembers",
    select: "name email photo",
  });
  next();
});

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project;
