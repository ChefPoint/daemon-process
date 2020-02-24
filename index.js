/* * */
/* * */
/* * * * * */
/* CHEF POINT */
/* PROCESS */
/* * */
/* * */

/* Initiate error handling module */
require("./services/errorHandling")();

/* Connect to the database */
require("./services/database")();

/* Start Process module */
require("./app/process")();
