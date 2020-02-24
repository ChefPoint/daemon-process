const winston = require("winston");

exports.info = message => {
  winston.info(message);
};

exports.error = (title, description, error, returnObject) => {
  winston.error("* * * * * * * * * * * *");
  winston.error(title);
  winston.error(description);
  console.log(error);
  winston.error("* * * * * * * * * * * *");
  return returnObject;
};
