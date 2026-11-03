import mongoose from "mongoose";
import Document from "../models/documentModel.js";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(
      `DB CONNECTION SUCCESSFULLY...${conn.connection.name}`.bgGreen.black,
    );

    // drop the old TTL index on documents so the saved zips stop expiring
    try {
      await Document.syncIndexes();
    } catch (error) {
      console.log(`DOCUMENT INDEX SYNC FAILED... ${error.message}`);
    }
  } catch (error) {
    console.log(`DB CONNECTION FAILED... ${error.message}`.bgRed);
    process.exit(1);
  }
};

export default connectDb;
