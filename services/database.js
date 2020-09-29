"use strict";

/* * * * * */
/* DATABASE */
/* * */

/* * */
/* IMPORTS */
const config = require("config");
const mongoose = require("mongoose");
const logger = require("./logger");

exports.connect = async function () {
  logger("Connecting to MongoDB...");
  await mongoose
    .connect(config.get("secrets.database-connection-string"), {
      useFindAndModify: false,
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true, // Temporary fixes for deprecation warnings.
    })
    .then(() => logger("Connected."))
    .catch((error) => {
      logger("Connection to MongoDB failed.");
      logger("At database.js > mongoose.connect()");
      logger(error);
      process.exit();
    });
};

exports.disconnect = async function () {
  logger("Closing connection to MongoDB...");
  await mongoose
    .disconnect()
    .then(() => logger("Disconnected from MongoDB."))
    .catch((error) => {
      logger("Failed closing connection to MongoDB.");
      logger("At database.js > mongoose.disconnect()");
      logger(error);
    });
};
