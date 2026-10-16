import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./server/models/userModel.js";

dotenv.config();

// =====================================================
// ADMIN USER (email + password come from .env)
// =====================================================

const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || "admin@delux.ai").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";

  if (!process.env.MONGO_URI) {
    console.log("MONGO_URI is missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`DB CONNECTION SUCCESSFULLY...${mongoose.connection.name}`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.updateOne(
      { email },
      {
        $set: {
          name: "Admin",
          email,
          password: hashedPassword,
          userType: "ADMIN",
          isActive: true,
          onboardingDone: true,
          credits: 1000000,
        },
      },
      { upsert: true },
    );

    console.log(`ADMIN READY... email: ${email}`);

    if (!process.env.ADMIN_PASSWORD) {
      console.log("WARNING: ADMIN_PASSWORD not set in .env, default password was used. Change it!");
    }
  } catch (error) {
    console.log(`SEED FAILED... ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
