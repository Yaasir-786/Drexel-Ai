import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/userModel.js";

// used so a wrong email takes as long as a wrong password (no user guessing by timing)
const DUMMY_HASH = bcrypt.hashSync("delux-dummy-password-1", 10);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

const userRegister = async (req, res) => {
  const { name, phone, email, password } = req.body;

  // check user exists
  const existing = await User.findOne({ $or: [{ email }, { phone }] });

  if (existing) {
    res.status(409);
    throw new Error(
      existing.email === email
        ? "Email Already Registered..."
        : "Phone Number Already Registered...",
    );
  }

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    phone,
    email,
    password: hashedPassword,
  });

  res.status(201).json({
    ...user.toClient(),
    message: "Account SuccessFully Has Been Created...",
  });
};

const userLogin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  const isMatch = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );

  if (!user || !isMatch) {
    res.status(401);
    throw new Error("Invalid Credentials...");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your Account Has Been Blocked...");
  }

  res.status(200).json({
    ...user.toClient(),
    token: generateToken(user._id),
  });
};

const getMyProfile = async (req, res) => {
  res.status(200).json(req.user.toClient());
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Current Password Is Incorrect...");
  }

  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error("New Password Must Be Different...");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await User.updateOne(
    { _id: user._id },
    { $set: { password: hashedPassword, passwordChangedAt: new Date() } },
  );

  // old tokens stop working, so a fresh token is returned
  res.status(200).json({
    message: "Password Changed SuccessFully...",
    token: generateToken(user._id),
  });
};

const authController = {
  userRegister,
  userLogin,
  getMyProfile,
  changePassword,
};

export default authController;
