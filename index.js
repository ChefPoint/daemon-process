"use strict";

/* * * * * */
/* CHEF POINT - DAEMON PROCESS */
/* * */

/* * */
/* IMPORTS */
const _ = require("lodash");
const config = require("config");
const axios = require("axios");
const database = require("./services/database");
const processAPI = require("./services/processAPI");
const Transaction = require("./models/Transaction");
const PrintQueue = require("./models/PrintQueue");
const logger = require("./services/logger");

(async () => {
  // Store start time for logging purposes
  const startTime = process.hrtime();

  logger("****************************************");
  logger(new Date().toISOString());
  logger("****************************************");

  logger();

  logger("Starting...");
  await database.connect();
  logger();

  if (config.get("settings.test-mode")) logger("> Test mode enabled.");
  logger();

  // Get all transactions from the database
  let transactions = await Transaction.find({});

  // Process transactions
  if (transactions.length) await processTransactions(transactions);
  else logger("No new transactions to process.");

  logger();
  logger("- - - - - - - - - - - - - - - - - - - -");
  logger("Shutting down...");
  await database.disconnect();
  logger("Operation took " + getDuration(startTime) / 1000 + " seconds.");
  logger("- - - - - - - - - - - - - - - - - - - -");
  logger();
})();

/* * */
/* The caller provides the store object containing squareLocationID and lastSyncTime. */
/* Two operations are performed in this function: */
/* First, orders are retrieved from Square, formated into transactions */
/* and saved to the database. */
/* Second, for the most recent transaction, it's closed_at date value */
/* is saved as the lastSyncTime value for the store. */
/* This is what keeps track of which transactions were synced and which were not. */
const processTransactions = async (transactions) => {
  logger("----------------------------------------");
  logger("Processing " + transactions.length + " transactions...");
  logger("----------------------------------------");

  // Order transactions by date ascending
  transactions = _.orderBy(transactions, ["closed_at"], ["asc"]);

  // Counters for logging progress
  let invoicesCreated = 0;
  let transactionsWithErrors = 0;

  // For each transaction
  for (const [index, transaction] of transactions.entries()) {
    // Set the request options
    const options = {
      method: "POST",
      url: "https://www.vendus.pt/ws/v1.2/documents",
      auth: { username: config.get("secrets.vendus-api-key") },
      data: JSON.stringify(
        // Prepare the invoice details
        processAPI.prepareInvoice(transaction)
      ),
    };

    // Delay to ensure no limits are hit in Vendus API
    await new Promise((resolve) => setTimeout(resolve, 300));

    // For each transaction,
    // try to request for an invoice to be created.
    await axios(options)
      // If successful:
      .then(async ({ data: invoice }) => {
        // const invoice = data;
        // Check if transaction should be printed
        if (transaction.should_print) {
          // add it to the print queue.
          await new PrintQueue({
            locationShortName: transaction.locationShortName,
            squareLocationID: transaction.squareLocationID,
            vendusRegisterID: transaction.vendusRegisterID,
            invoice_id: invoice.id,
          }).save();
        }

        // Remove the processed transaction from the queue only if test mode is disabled.
        if (!config.get("settings.test-mode")) await transaction.remove();

        // Add +1 to the counter,
        invoicesCreated++;

        // and log it's basic details for debugging.
        logger(
          "[" +
            (index + 1) +
            "/" +
            transactions.length +
            "] Invoice " +
            invoice.number +
            " created (" +
            invoice.date +
            ")" +
            (transaction.should_print ? " [ print ]" : "")
        );
      })
      // If an error occurs,
      .catch(({ response }) => {
        // add +1 to the counter
        transactionsWithErrors++;
        // and log it
        logger();
        logger("> Error occured while creating invoice.");
        logger("> Transaction ID: " + transaction.id);
        logger(
          "> [" +
            response.data.errors[0].code +
            "] " +
            response.data.errors[0].message
        );
        logger();
      });
  }

  logger(); // Log end of operation.
  logger("----------------------------------------");
  logger("Done. " + transactions.length + " transactions processed.");
  logger(invoicesCreated + " invoices created successfully.");
  logger(transactionsWithErrors + " transactions with errors.");
  logger("----------------------------------------");
};

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
