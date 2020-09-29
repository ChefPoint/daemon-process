"use strict";

/* * * * * */
/* DELAY */
/* * */

module.exports = async function (miliseconds) {
  await new Promise((resolve) => setTimeout(resolve, miliseconds));
};
