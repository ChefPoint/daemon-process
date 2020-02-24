/* * */
/* * */
/* * * * * */
/* PRINTQUEUE */
/* * */

/* * */
/* IMPORTS */
const mongoose = require("mongoose");

/* * */
/* Schema for MongoDB ["PrintQueue"] Object */
exports.PrintQueue = mongoose.model(
  "PrintQueue",
  new mongoose.Schema({
    location_id: {
      type: String,
      maxlength: 30,
      required: true
    },
    invoice_id: {
      type: String,
      maxlength: 30,
      required: true
    }
  })
);
