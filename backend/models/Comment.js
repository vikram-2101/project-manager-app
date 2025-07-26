const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, "Comment cannot be empty!"],
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Comment must belong to a user"],
  },
  task: {
    type: mongoose.Schema.ObjectId,
    ref: "Task",
    required: [true, "Comment must belong to a task"],
  },
  parentComment: {
    // For threaded comments
    type: mongoose.Schema.ObjectId,
    ref: "Comment",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Populate author and task details when comments are queried
commentSchema.pre(/^find/, function (next) {
  this.populate({
    path: "author",
    select: "name photo",
  }).populate({
    path: "task",
    select: "title project assignee", // Get enough info to notify or check project membership
  });
  next();
});

// Index for faster querying by task
commentSchema.index({ task: 1 });

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
