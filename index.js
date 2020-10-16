"use strict";

/* * * * * */
/* CHEF POINT - DAEMON PROCESS */
/* * */

/* * */
/* IMPORTS */
const config = require("config");
const database = require("./services/database");
const processAPI = require("./services/processAPI");
const Transaction = require("./models/Transaction");
const delay = require("./services/delay");

/* * */
/* This anonymous function initiates the program. */
/* Program settings and a timestamp are logged to the console to ensure proper functionality. */
/* A delay is introduced to give time to the user to cancel operation if settings are misconfigured, */
/* as well as to avoid hitting any limits with Vendus API infrastructure. */
/* Then, transactions are processed, one by one, by "processTransactions()". */
/* After that, the program logs operation metrics before shutting down. */
(async () => {
  // Store start time to calculate total duration of operation
  const startTime = process.hrtime();

  // Log current date and time
  console.log("****************************************");
  console.log(new Date().toISOString());
  console.log("****************************************");

  // Log the current settings
  console.log();
  console.log("----------------------------");
  console.log("Test Mode: " + config.get("settings.test-mode"));
  console.log("Send Emails: " + config.get("settings.send-digital-invoices"));
  console.log("Delay: " + config.get("settings.safety-delay") + " miliseconds");
  console.log("----------------------------");
  console.log();

  // Delay to ensure no limits are hit in Vendus API
  console.log("Waiting for safety delay...");
  await delay(config.get("settings.safety-delay"));

  // Connect to the database
  await database.connect();

  // Retrieve all transactions from the database
  const transactions = await Transaction.find({});

  // Begin processing transactions
  if (transactions.length) await processAPI.processTransactions(transactions);
  else console.log("No new transactions to process.");

  console.log();
  console.log("- - - - - - - - - - - - - - - - - - - -");
  console.log("Shutting down...");
  await database.disconnect();
  console.log("Operation took " + getDuration(startTime) / 1000 + " seconds.");
  console.log("- - - - - - - - - - - - - - - - - - - -");
  console.log();
})();

/* * */
/* Returns a time interval for a provided start time. */
const getDuration = (startTime) => {
  const interval = process.hrtime(startTime);
  return parseInt(
    // seconds -> miliseconds +
    interval[0] * 1000 +
      // + nanoseconds -> miliseconds
      interval[1] / 1000000
  );
};
