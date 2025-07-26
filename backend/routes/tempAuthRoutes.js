// routes/tempAuthRoutes.js
const express = require("express");
const router = express.Router();

// This is a completely static path with no parameters
router.get("/sanity-check", (req, res) => {
  res.status(200).send("Sanity check passed!");
});

module.exports = router;
