const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A task must have a title"],
      trim: true,
    },
    description: String,
    project: {
      type: mongoose.Schema.ObjectId,
      ref: "Project",
      required: [true, "A task must belong to a project"],
    },
    assignee: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ["To-Do", "In Progress", "Done", "Blocked"],
      default: "To-Do",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Populate assignee and project when tasks are queried
taskSchema.pre(/^find/, function (next) {
  this.populate({
    path: "assignee",
    select: "name photo",
  }).populate({
    path: "project",
    select: "name clientName", // Or whatever project details you want to see
  });
  next();
});

// Virtual populate for comments
taskSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "task", // 'task' field in the Comment model
  localField: "_id", // '_id' field in the Task model
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
