/* * */
/* * */
/* * * * * */
/* PROCESS */
/* * */
/* * */

/* * */
/* IMPORTS */
const config = require("config");
const mongoose = require("mongoose");
const logger = require("../services/logger");
const processAPI = require("../services/processAPI");
const vendusAPI = require("../services/vendusAPI");
const { Store } = require("../models/Store");
const { Transaction } = require("../models/Transaction");
const { PrintQueue } = require("../models/PrintQueue");

/* * */
/* At program initiation all stores are retrieved from the database */
/* and, for each store, transactions are retrieved from the database. */
/* Each one is processed into an invoice by the Vendus API. */
module.exports = async (request, response) => {
  // Get all store locations from the database
  const stores = await Store.find({});

  // For each store, process it's transactions
  for (const store of stores) {
    logger.info("Processing transactions for [" + store.name + "]...");
    await processStoreTransactions(
      store.squareLocationID,
      store.vendusRegisterID
    );
  }

  // Disconnect from the database after program completion
  await mongoose.disconnect();
  logger.info("Disconnected from MongoDB.");
};

/* * */
/* At program initiation all stores are retrieved from the database */
const processStoreTransactions = async (squareLocationID, vendusRegisterID) => {
  // Get matching transactions from the database
  const transactions = await Transaction.find({
    location_id: squareLocationID
  });

  // If response is empty, return no new transactions to process
  if (!transactions.length)
    return logger.info("No new transactions to process.");
  else logger.info("Processing " + transactions.length + " transactions...");

  // Counters for logging progress
  let invoicesCreated = 0;
  let transactionsWithErrors = 0;

  // For each transaction
  for (const transaction of transactions) {
    // Set the request params
    const params = {
      method: "POST",
      url: vendusAPI.setAPIEndpoint("documents"),
      auth: { user: config.get("auth.vendusAPI") },
      body: JSON.stringify(
        // Prepare the invoice details
        processAPI.prepareInvoice(vendusRegisterID, transaction)
      )
    };

    // For each transaction,
    // try to request for an invoice to be created.
    console.log("Waiting...");
    await setTimeout(() => console.log("Waited 5 seconds."), 5000);
    await vendusAPI
      .request(params)
      // If successful:
      .then(async invoice => {
        // Check if transaction should be printed
        if (transaction.should_print) {
          // add it to the print queue.
          await new PrintQueue({
            location_id: transaction.location_id,
            invoice_id: invoice.id
          }).save();
          logger.info("Invoice (" + invoice.number + ") will be printed.");
        }

        // Remove the processed transaction from the queue,
        await transaction.remove();
        // add +1 to the counter,
        invoicesCreated++;
        // and log it's basic details for debugging.
        logger.info(
          "> Invoice (" + invoice.number + ") created at " + invoice.system_time
        );
      })
      // If an error occurs,
      .catch(error => {
        // add +1 to the counter
        transactionsWithErrors++;
        // and log it
        logger.error(
          "Error occured while creating invoice.",
          "Transaction ID: " + transaction.id,
          error
        );
      });
  }

  // Log end of operation.
  logger.info("Done. " + transactions.length + " transactions processed.");
  logger.info(invoicesCreated + " invoices created successfully.");
  logger.info(transactionsWithErrors + " transactions with errors.");
};
