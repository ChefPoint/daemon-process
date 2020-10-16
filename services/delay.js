"use strict";

/* * * * * */
/* DELAY */
/* * */

/* * */
/* A promised is resolved after the provided miliseconds. */
module.exports = async function (miliseconds) {
  await new Promise((resolve) => setTimeout(resolve, miliseconds));
};
