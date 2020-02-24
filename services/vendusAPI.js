/* * */
/* * */
/* * * * * */
/* RETRIEVE TRANSACTIONS FROM QUEUE */
/* AND PROCESS THEM INTO VENDUS INVOICES */
/* * */

/* * */
/* IMPORTS */
const request = require("request");

/* * */
/* * */
/* Prepare the request parameters */
/* according to the Vendus API requirements. */
/* * */

/* * */
/* Where and which service to call the Vendus API. */
exports.setAPIEndpoint = service => {
  return "https://www.vendus.pt/ws/v1.2/" + service;
};

/* * */
/* Request the Vendus API for the specified params. */
exports.request = params => {
  // This method returns a Promise to it's caller,
  // which is only resolved after the correct response from the API.
  return new Promise((resolve, reject) => {
    // Perform the request
    request(params, async (err, res, body) => {
      // Reject if a connection error occurs
      if (err) reject(err);
      // Reject if there is an error with invoice creation
      else if (res.statusCode >= 400 && res.statusCode <= 500)
        reject(JSON.parse(body).errors);
      // Resolve promise with request result
      else resolve(JSON.parse(body));
    });
  });
};
