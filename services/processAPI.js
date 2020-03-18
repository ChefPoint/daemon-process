/* * */
/* * */
/* * * * * */
/* PROCESS API */
/* * */
/* * */

/* * */
/* IMPORTS */
const config = require("config");
const moment = require("moment");

exports.prepareInvoice = transaction => {
  let invoice = {
    // Global setting: If true, only fiscally invalid invoices will be created
    mode: config.get("settings.test-mode-enabled") ? "tests" : "normal",
    // To which store should this invoice be attributed
    register_id: transaction.vendusRegisterID,
    // The date of the transaction
    date: moment(transaction.closed_at).format("YYYY[-]MM[-]DD"),
    // Prepare final invoice items details
    items: setInvoiceItems(transaction.line_items),
    // Set payment method so a receipt is issued
    payments: [{ id: 5957845 }]
  };

  // If transaction has customer NIF, add it to invoice
  if (transaction.customer.fiscal_id)
    invoice.client = setInvoiceClient(transaction.customer);

  return invoice;
};

const setInvoiceItems = lineItems => {
  var items = [];
  // Prepare each item for process
  for (const lineItem of lineItems) {
    items.push({
      reference: lineItem.reference.substring(0, 5),
      title: lineItem.title,
      qty: lineItem.qty,
      gross_price: lineItem.gross_price,
      tax_id: lineItem.tax_id
    });
  }
  // Return prepared items array to the caller.
  return items;
};

const setInvoiceClient = customer => {
  // Return prepared client details to the caller.
  return {
    fiscal_id: customer.fiscal_id,
    name: customer.name,
    email: customer.email,
    send_email: config.get("settings.send-digital-invoices") ? "yes" : "no"
  };
};
