const userModel = require("../models/user.model");
const userService = require("../services/user.service");
const { validationResult } = require("express-validator");
const blackListTokenModel = require("../models/blacklistToken.model");

module.exports.registerUser = async (req, res, next) => {
  console.log("=== REGISTER USER ===");
  console.log("Request body:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullname, email, password } = req.body;
  console.log("Email:", email);

  const isUserAlready = await userModel.findOne({ email });

  if (isUserAlready) {
    console.log("User already exists:", email);
    return res.status(400).json({ message: "User already exist" });
  }

  const hashedPassword = await userModel.hashPassword(password);
  console.log("Password hashed successfully");

  const user = await userService.createUser({
    firstname: fullname.firstname,
    lastname: fullname.lastname,
    email,
    password: hashedPassword,
  });
  console.log("User created:", user._id);

  const token = user.generateAuthToken();
  console.log("Token generated:", token.substring(0, 20) + "...");

  res.status(201).json({ token, user });
};

module.exports.loginUser = async (req, res, next) => {
  console.log("=== LOGIN USER ===");
  console.log("Request body:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  console.log("Login attempt for email:", email);

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    console.log("User not found:", email);
    return res.status(401).json({ message: "Invalid email or password" });
  }

  console.log("User found:", user._id);
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    console.log("Password mismatch for user:", email);
    return res.status(401).json({ message: "Invalid email or password" });
  }

  console.log("Password match successful");
  const token = user.generateAuthToken();
  console.log("Token generated:", token.substring(0, 20) + "...");

  res.cookie("token", token);

  res.status(200).json({ token, user });
};

module.exports.getUserProfile = async (req, res, next) => {
  console.log("=== GET USER PROFILE ===");
  console.log("User ID:", req.user._id);
  console.log("User email:", req.user.email);
  res.status(200).json(req.user);
};

module.exports.logoutUser = async (req, res, next) => {
  console.log("=== LOGOUT USER ===");
  console.log("User ID:", req.user?._id);

  res.clearCookie("token");
  const token = req.cookies.token || req.headers.authorization.split(" ")[1];
  console.log("Token blacklisted:", token.substring(0, 20) + "...");

  await blackListTokenModel.create({ token });

  res.status(200).json({ message: "Logged out" });
};
