import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `DB CONNECTION SUCCESSFULLY...${conn.connection.name}`.bgGreen.black,
    );
  } catch (error) {
    console.log(`DB CONNECTION FAILED... ${error.message}`.bgRed);
    process.exit(1);
  }
};

export default connectDb;
