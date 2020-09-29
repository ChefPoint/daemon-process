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
module.exports = mongoose.model(
  "PrintQueue",
  new mongoose.Schema({
    locationShortName: {
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
    invoice_id: {
      type: String,
      maxlength: 30,
      required: true,
    },
  })
);
