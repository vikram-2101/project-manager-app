// authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Check this path carefully!
const catchAsync = require("../utils/catchAsync"); // Check this path carefully!
const AppError = require("../utils/AppError"); // Check this path carefully!

const signToken = (id) => {
  console.log("Defining signToken function.");
  console.log("JWT Secret:", process.env.JWT_SECRET_KEY);
  console.log("JWT Expiry:", process.env.JWT_EXPIRES_IN);
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  console.log("JWT_COOKIE_EXPIRES_IN:", process.env.JWT_COOKIE_EXPIRES_IN);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    sameSite: "Lax",
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// --- Exported Handlers ---
exports.register = catchAsync(async (req, res, next) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      role: "team-member",
    });

    createSendToken(newUser, 201, req, res);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(400).json({
        status: "fail",
        message: "Email already in use. Please use another one.",
      });
    }

    // Default error handling
    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});
exports.getMe = (req, res) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
};

exports.login = catchAsync(async (req, res, next) => {
  console.log("Inside login handler definition.");
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  console.log("Inside logout handler definition.");
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};
