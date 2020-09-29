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
const got = require("got");

const logger = require("../services/logger");
const _ = require("lodash");
const processAPI = require("../services/processAPI");
const vendusAPI = require("../services/vendusAPI");
const { Transaction } = require("../models/Transaction");
const { PrintQueue } = require("../models/PrintQueue");

/* * */
/* At program initiation all stores are retrieved from the database */
/* and, for each store, transactions are retrieved from the database. */
/* Each one is processed into an invoice by the Vendus API. */
module.exports = async () => {
  // If there are transactions to process
  if (transactions.length) {
    logger.info("Processing " + transactions.length + " transactions...");

    // Order transactions by date ascending
    transactions = _.orderBy(transactions, ["closed_at"], ["asc"]);

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
          processAPI.prepareInvoice(transaction)
        ),
      };

      // For each transaction,
      // try to request for an invoice to be created.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await vendusAPI
        .request(params)
        // If successful:
        .then(async (invoice) => {
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
          logger.info(
            "> Invoice " + invoice.number + " created (" + invoice.date + ")."
          );
        })
        // If an error occurs,
        .catch((error) => {
          // add +1 to the counter
          transactionsWithErrors++;
          // and log it
          logger.error(
            "Error occured while creating invoice.",
            "Transaction ID: " + transaction.id,
            "[" + error[0].code + "] " + error[0].message
          );
        });
    }

    // Log end of operation.
    logger.info("---------------------------------------------------------");
    logger.info("Done. " + transactions.length + " transactions processed.");
    logger.info(invoicesCreated + " invoices created successfully.");
    logger.info(transactionsWithErrors + " transactions with errors.");
    logger.info("---------------------------------------------------------");

    // If response is empty, return no new transactions to process
  } else logger.info("No new transactions to process.");

  // Disconnect from the database after program completion
  await mongoose.disconnect();
  logger.info("Disconnected from MongoDB.");
};
