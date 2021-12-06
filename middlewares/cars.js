module.exports = (req, res, next) => {
  if (/\/cars(\/.*)?/.test(req.originalUrl))
    console.log(`Request received:  ${req.method} ${req.originalUrl}`);
  return next();
};
