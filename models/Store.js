/* * */
/* * */
/* * * * * */
/* STORE */
/* * */

/* * */
/* IMPORTS */
const mongoose = require("mongoose");

/* * */
/* Schema for MongoDB ["Store"] Object */
exports.Store = mongoose.model(
  "Store",
  new mongoose.Schema({
    name: {
      type: String,
      maxlength: 30,
      required: true,
    },
    squareLocationID: {
      type: String,
      maxlength: 30,
      required: true,
    },
    vendusRegisterID: {
      type: String,
      maxlength: 30,
      required: true,
    },
    timeSinceLastSync: {
      type: String,
      maxlength: 30,
      required: true,
    },
  })
);
