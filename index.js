"use strict";

/* * * * * */
/* CHEF POINT - DAEMON PROCESS */
/* * */

/* * */
/* IMPORTS */
const config = require("config");
const database = require("./services/database");
const logger = require("./services/logger");
const got = require("got");
const Transaction = require("./models/Transaction");
const _ = require("lodash");
const processAPI = require("./services/processAPI");
const vendusAPI = require("./services/vendusAPI");

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

  // Get all transactions from the database
  let transactions = await Transaction.find({});

  // If response is empty, return no new transactions to process
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
    // Set the request params
    const params = {
      method: "POST",
      url: vendusAPI.setAPIEndpoint("documents"),
      auth: { user: config.get("secrets.vendus-auth-token") },
      body: JSON.stringify(
        // Prepare the invoice details
        processAPI.prepareInvoice(transaction)
      ),
    };

    // Delay to ensure no limits are hit in Vendus API
    await new Promise((resolve) => setTimeout(resolve, 300));

    // For each transaction,
    // try to request for an invoice to be created.
    await vendusAPI
      .request(params)
      // If successful:
      .then(async ({ invoice }) => {
        console.log(invoice);
        // Check if transaction should be printed
        if (transaction.should_print) {
          // add it to the print queue.
          await new PrintQueue({
            locationShortName: transaction.locationShortName,
            squareLocationID: transaction.squareLocationID,
            vendusRegisterID: transaction.vendusRegisterID,
            invoice_id: invoice.id,
          }).save();
          logger.info("Invoice " + invoice.number + " will be printed.");
        }

        // Remove the processed transaction from the queue,
        await transaction.remove();
        // add +1 to the counter,
        invoicesCreated++;
        // and log it's basic details for debugging.
        logger(
          "[" +
            index +
            "/" +
            transactions.length +
            "] Invoice " +
            invoice.number +
            " created (" +
            invoice.date +
            ")."
        );
      })
      // If an error occurs,
      .catch((error) => {
        // add +1 to the counter
        transactionsWithErrors++;
        // and log it
        logger();
        logger("> Error occured while creating invoice.");
        logger("> Transaction ID: " + transaction.id);
        logger("> [" + error[0].code + "] " + error[0].message);
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
