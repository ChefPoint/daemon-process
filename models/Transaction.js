"use strict";

/* * * * * */
/* TRANSACTION */
/* * */

/* * */
/* IMPORTS */
const mongoose = require("mongoose");

/* * */
/* Schema for MongoDB ["Transaction"] Object */
module.exports = mongoose.model(
  "Transaction",
  new mongoose.Schema({
    order_id: {
      type: String,
      maxlength: 100,
      required: true,
    },
    locationShortName: {
      type: String,
      maxlength: 100,
      required: true,
    },
    squareLocationID: {
      type: String,
      maxlength: 100,
      required: true,
    },
    closed_at: {
      type: String,
      maxlength: 100,
      required: true,
    },
    payment_methods: [
      {
        type: String,
        maxlength: 100,
        required: true,
      },
    ],
    line_items: [
      {
        reference: {
          type: String,
          maxlength: 100,
          required: true,
        },
        title: {
          type: String,
          maxlength: 100,
          required: true,
        },
        qty: {
          type: Number,
          maxlength: 5,
          required: true,
        },
        gross_price: {
          type: Number,
          maxlength: 5,
          required: true,
        },
        tax_id: {
          type: String,
          maxlength: 3,
        },
      },
    ],
    customer: {
      fiscal_id: {
        type: String,
        maxlength: 100,
      },
      name: {
        type: String,
        maxlength: 100,
      },
      email: {
        type: String,
        maxlength: 100,
      },
    },
    should_print: {
      type: Boolean,
      default: false,
    },
  })
);
