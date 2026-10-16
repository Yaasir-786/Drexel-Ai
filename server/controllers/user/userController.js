import User from "../../models/userModel.js";

const completeOnboarding = async (req, res) => {
  const { name, role, goal, teamSize } = req.body;

  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        name,
        "onboarding.role": role,
        "onboarding.goal": goal,
        "onboarding.teamSize": teamSize,
        onboardingDone: true,
      },
    },
  );

  const user = await User.findById(req.user._id);

  res.status(200).json(user.toClient());
};

const updateProfile = async (req, res) => {
  const { name, phone, role, goal, teamSize } = req.body;

  // only these fields can be changed (userType, credits, isActive can never be changed here)
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (role !== undefined) updates["onboarding.role"] = role;
  if (goal !== undefined) updates["onboarding.goal"] = goal;
  if (teamSize !== undefined) updates["onboarding.teamSize"] = teamSize;

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("Nothing To Update...");
  }

  await User.updateOne({ _id: req.user._id }, { $set: updates });

  const user = await User.findById(req.user._id);

  res.status(200).json(user.toClient());
};

const userController = { completeOnboarding, updateProfile };

export default userController;
