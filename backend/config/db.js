const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://samarth123:samarth@cluster0.heiczbp.mongodb.net/hospitalDB"
    );
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;
