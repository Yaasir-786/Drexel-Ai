import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please Enter Name:"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Please Enter Email:"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Please Enter Phone:"],
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please Enter Password:"],
      select: false,
    },
    userType: {
      type: String,
      enum: ["USER", "ADMIN"],
      required: true,
      default: "USER",
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    credits: {
      type: Number,
      default: () => Number(process.env.DEFAULT_CREDITS) || 200,
      min: 0,
    },
    dailyUsed: {
      type: Number,
      default: 0,
    },
    dailyDate: {
      type: String,
      default: "",
    },
    totalCreditsUsed: {
      type: Number,
      default: 0,
    },
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    onboardingDone: {
      type: Boolean,
      default: false,
    },
    onboarding: {
      role: { type: String, default: "" },
      goal: { type: String, default: "" },
      teamSize: { type: String, default: "" },
    },
    passwordChangedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// safe shape sent to the client (never contains password / reset fields)
userSchema.methods.toClient = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    userType: this.userType,
    isActive: this.isActive,
    credits: Math.round(this.credits * 100) / 100,
    onboardingDone: this.onboardingDone,
    onboarding: this.onboarding,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
