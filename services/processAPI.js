"use strict";

/* * * * * */
/* PROCESS API */
/* * */

/* * */
/* IMPORTS */
const _ = require("lodash");
const config = require("config");
const moment = require("moment");
const axios = require("axios");
const delay = require("../services/delay");
const PrintQueue = require("../models/PrintQueue");

/* * */
/* This function is the one responsible for processing all transactions. */
/* First, transactions are ordered by date ascending, since it is not possible */
/* to process transactions with a date before the most recent processed one. */
/* Second, for each transaction, a new invoice object is populated with the */
/* transaction details by "prepareInvoice()". This sets all the items, taxes, clients, */
/* as well as the appropriate Vendus Register ID for that invoice. */
/* Then, the request options are set and the invoice data is stringified. */
/* Before the request is sent, there is a small delay to ensure the program */
/* does not run against any limits imposed by the Vendus API infrastructure. */
exports.processTransactions = async (transactions) => {
  console.log();
  console.log("----------------------------------------");
  console.log("Processing " + transactions.length + " transactions...");
  console.log("----------------------------------------");

  // Order transactions by date ascending
  transactions = _.orderBy(transactions, ["closed_at"], ["asc"]);

  // Counters for logging progress
  let invoicesCreated = 0;
  let transactionsWithErrors = 0;

  // For each transaction:
  for (const [index, transaction] of transactions.entries()) {
    //
    // If transactions are not from October
    if (moment(transaction.closed_at).isBefore("2020-10-01")) {
      console.log(
        "!!! Transaction skipped! " +
          moment(transaction.closed_at).format("YYYY[-]MM[-]DD")
      );
      continue;
    } // else {
    //   console.log(
    //     "!!! Transaction NOT skipped: " +
    //       moment(transaction.closed_at).format("YYYY[-]MM[-]DD")
    //   );
    // }

    // Prepare the invoice details
    const invoice = prepareInvoice(transaction);

    // Set the request options
    const options = {
      method: "POST",
      url: "https://www.vendus.pt/ws/v1.2/documents",
      auth: { username: config.get("secrets.vendus-api-key") },
      data: JSON.stringify(invoice),
    };

    // Delay to ensure no API limits are hit
    await delay(config.get("settings.safety-delay") / 200);

    // Request for an invoice to be created.
    await axios(options)
      // If successful:
      .then(async ({ data: invoice }) => {
        // If transaction should be printed add it to the print queue.
        if (transaction.should_print) {
          await new PrintQueue({
            locationShortName: transaction.locationShortName,
            squareLocationID: transaction.squareLocationID,
            invoice_id: invoice.id,
          }).save();
        }

        // Remove the processed transaction from the queue only if test mode is disabled.
        if (!config.get("settings.test-mode")) await transaction.remove();

        // Add +1 to the counter.
        invoicesCreated++;

        // Log it's basic details for debugging.
        console.log(
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
      // If an error occurs:
      .catch((error) => {
        // Add +1 to the counter
        transactionsWithErrors++;

        if (error.response) {
          // If there is a response available,
          // i.e. if the error is from Vendus API
          console.log();
          console.log("> [" + (index + 1) + "/" + transactions.length + "]");
          console.log("> Error occured while creating invoice.");
          console.log("> Transaction ID: " + transaction.id);
          console.log("> Code: " + error.response.data.errors[0].code);
          console.log("> Message: " + error.response.data.errors[0].message);
          console.log();
        } else {
          // If the error is NOT from Vendus API
          console.log();
          console.log(error);
          console.log();
        }
      });
  }

  console.log(); // Log end of operation.
  console.log("----------------------------------------");
  console.log("Done. " + transactions.length + " transactions processed.");
  console.log(invoicesCreated + " invoices created successfully.");
  console.log(transactionsWithErrors + " transactions with errors.");
  console.log("----------------------------------------");
};

/* * */
/* This function returns a new invoice object from the provided transaction, */
/* formated according to the Vendus API requirements. */
const prepareInvoice = (transaction) => {
  let invoice = {
    // If true, only fiscally invalid invoices will be created
    mode: config.get("settings.test-mode") ? "tests" : "normal",
    // To which store should this invoice be attributed
    register_id: config.get("settings.register-id"),
    // The date of the transaction
    date: moment(transaction.closed_at).format("YYYY[-]MM[-]DD"),
    // Prepare final invoice items details
    items: setInvoiceItems(transaction.line_items),
    // Set payment method so a receipt is issued
    payments: [{ id: config.get("settings.payment-id") }],
  };

  // If transaction has customer NIF, add it to invoice
  if (transaction.customer.fiscal_id) {
    invoice.client = setInvoiceClient(transaction.customer);
  }

  return invoice;
};

/* * */
/* This function sets the new invoice item details, */
/* according to the provided lineItems value of a transaction. */
const setInvoiceItems = (lineItems) => {
  var items = [];
  // Prepare each item for process
  for (const lineItem of lineItems) {
    items.push({
      reference: lineItem.reference.substring(0, 5),
      title: lineItem.title,
      qty: lineItem.qty,
      gross_price: lineItem.gross_price,
      tax_id: lineItem.tax_id,
    });
  }
  // Return prepared items array to the caller.
  return items;
};

/* * */
/* This function sets the new invoice client details, */
/* according to the provided customer value of a transaction. */
/* This includes Fiscal ID, Name and Email, as well as the option */
/* to send digital invoices to the customer if not in test mode. */
const setInvoiceClient = (customer) => {
  return {
    fiscal_id: customer.fiscal_id,
    name: customer.name,
    email: config.get("settings.test-mode")
      ? "contabilidade@dynamic-benefit.com"
      : customer.email,
    send_email: config.get("settings.send-digital-invoices") ? "yes" : "no",
  };
};
