const superAgent = require('superagent');

// Set up module configuration properties.
var defaultConfig = { publicRoutes: [], users: [{ username: "admin", password: "Password1" }] };
var config = defaultConfig;
var configConfirmed = false;

/**
 * Attempts to authenticate the specified user.  In this version, authenticate occurs for each call to a protected path.
 *
 * @param {object} req Request object
 * @param {object} res Response object
 * @param {*} next
 * @returns {any} Returns result of calling next().
 * @since 1.0.0
 */
module.exports.authenticate = (req, res, next) => {
  var username = req.headers['username'];
  var password = req.headers['password'];

  // Ensure a valid user ID and password are provided.
  if (!username || !password || !userList.find(a => a.username === username && a.password === password)) {
    var err = new Error('Invalid username or password.');
    err.status = 401;
    return next(err);
  }
  // Otherwise, create a sessionID, save it to the database, and return it.
  var sessionID = new Date().toISOString().substr(0, 23);

  // Push the new session ID to the response headers.
  res.set('sessionID', sessionID);

  sessionRecordExists = false;
  superAgent.get(`https://localhost:40001/api/v1/sessions`) // Find a way to request just a single record (without error).
    .trustLocalhost(true)
    .then(
      response => {
        if (response.body.find(a => a.id === username))
          superAgent.put(`https://localhost:40001/api/v1/sessions/${username}`)
            .trustLocalhost(true)
            .send({ id: username, sessionID: sessionID })
            .set('Accept', 'application/json')
            .then(
              () => {
                console.log(`Updated the session with ID ${username}`);
                next();
              },
              err => {
                console.log(err);
                res.status = 500;
                next(new Error(`Could not update session with ID ${username}.  Details: ${err}`));
              }
            );
        else
          superAgent.post('https://localhost:40001/api/v1/sessions')
            .trustLocalhost(true)
            .send({ id: username, sessionID: sessionID })
            .set('Accept', 'application/json')
            .then(
              () => {
                console.log(`Created the session with ID ${username}.`);
                next();
              },
              err => {
                console.log(err);
                res.status = 500;
                next(new Error(`Could not create the session with ID ${username}.  Details: ${err}`));
              }
            );
      },
      err => console.log(`Failed getting session with ID ${username}`)
    );
  //return next();
};

/**
 * Set/updates the configuration object of the module.
 * Defaults to no public routes, and a single username of "admin" with a password of "Password1".
 *
 * @param {object} cfg Configuration object specifying those values required by the module.
 * @since 1.0.0
 */
module.exports.onInit = (app, server, cfg) => {
  config = cfg;
  configConfirmed = false;
  console.log('        Authentication module configuration has been updated.');

  // // Add a route to support user authentication.
  // app.post('/api/v1/authenticate', this.authenticate);

  // // Add middleware to determine if the user is authorized to access secured resources.
  // app.use(this.isAuthorized);
};

/**
 * Returns whether the user specified in the request object is authorized for the call.
 *
 * @param {object} req Request object
 * @param {object} res Response object
 * @param {function} next Function to call once processing is complete.
 * @returns {boolean} True if the user is authorized for the request.
 * @since 1.0.0
 */
module.exports.isAuthorized = (req, res, next) => {

  // If no configuration data was set, use defaults.
  if (!configConfirmed) {
    config = config || defaultConfig;
    config.publicRoutes = config.publicRoutes || defaultConfig.publicRoutes;
    config.users = config.users || defaultConfig.users;
    configConfirmed = true;

    // If no users are defined and no public paths are defined, issue a warning.
    if (!config.publicRoutes.length && !config.users.length)
      console.warn('WARNING:  No users have been defined in the configuration object and no public routes exist!');

    // If the default user exists, warn that it should be replaced.
    if (config.users.find(user => user.username === defaultConfig.users[0].username
      && user.password === defaultConfig.users[0].password))
      console.warn('WARNING:  The default username/password remains defined and should be removed/changed!');
  }

  // If the collection of public paths contains the requested path, do not require authentication.
  if (config.publicRoutes.find(exp => (new RegExp(exp, "i")).test(req.originalUrl)))
    return next();

  // If the session record has no values, attempt to pull them from the request headers.
  var sessionID = req.get('sessionID') || req.params['sessionid'] || res.get('sessionID');

  // If no valid session ID (any value of 23 characters) is present, report not authorized.
  if (!sessionID || sessionID.length !== 23) {
    var err = new Error('Not authorized');

    err.status = 401;
    return next(err);
  }
  // Otherwise, consider the user authorized.
  return next()
};

