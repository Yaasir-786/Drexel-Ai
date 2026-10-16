import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

// shared by forUser and forAdmin: Bearer token -> verified, active user
const getUserFromToken = async (req, res) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("No Token Found...");
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Given Token Is Incorrect Or Expired...");
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    res.status(401);
    throw new Error("User Of This Token No Longer Exists...");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your Account Has Been Blocked...");
  }

  // token issued before the last password change is not valid anymore
  if (
    user.passwordChangedAt &&
    decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
  ) {
    res.status(401);
    throw new Error("Password Was Changed, Please Login Again...");
  }

  return user;
};

const forUser = async (req, res, next) => {
  req.user = await getUserFromToken(req, res);
  next();
};

const forAdmin = async (req, res, next) => {
  const user = await getUserFromToken(req, res);

  if (user.userType !== "ADMIN") {
    res.status(403);
    throw new Error("Only Admin Can Access This Route...");
  }

  req.user = user;
  next();
};

const protect = { forUser, forAdmin };

export default protect;
