module.exports.cats = (req, res, next) => {
  if (/\/cats(\/.*)?/.test(req.originalUrl))
    console.log(`Request received:  ${req.method} ${req.originalUrl}`);
  return next();
};

module.exports.dogs = (req, res, next) => {
  if (/\/dogs(\/.*)?/.test(req.originalUrl))
    console.log(`Request received:  ${req.method} ${req.originalUrl}`);
  return next();
};
