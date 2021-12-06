module.exports = (req, res, next) => {
  if (/\/sample-pass-thru(\/.*)?/.test(req.originalUrl))
    console.log(`Request received:  ${req.method} ${req.originalUrl}`);
  return next();
}
