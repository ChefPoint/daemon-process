/* * */
/* * */
/* * * * * */
/* CONNECTION TO MONGODB */
/* * */

/* * */
/* IMPORTS */
const config = require("config");
const logger = require("./logger");
const mongoose = require("mongoose");

module.exports = async function() {
  await mongoose
    .connect(config.get("database.connection-string"), {
      useFindAndModify: false,
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true // Temporary fixes for deprecation warnings.
    })
    .then(() => logger.info("Connected to MongoDB."))
    .catch(error => {
      logger.error(
        "Connection to MongoDB failed.",
        "At database.js > mongoose.connect()",
        error
      );
    });
};
