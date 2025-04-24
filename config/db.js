const mongoose = require("mongoose");

const connectDb = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/interiorline");
        console.log("connection success");
    } catch (e) {
        console.log("Failed")
    }
};
module.exports = connectDb;

