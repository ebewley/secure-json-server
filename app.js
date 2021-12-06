// *** Module Imports ***
const express = require('express');
const fs = require('fs');
const https = require('https');
const jsonServer = require('json-server');
var middlewares = null;

// Application configuration
var appConfiguration = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

// Load the certificate files and create a secure server instance.
const certKey = fs.readFileSync(appConfiguration.certificateKeyFile);
const certCert = fs.readFileSync(appConfiguration.certificateFile);
const app = express();
const server = https.createServer({ key: certKey, cert: certCert }, app);

// Initialize the app with basic json-server middlewares.
if (appConfiguration.includeJsonServerMiddlewares !== false) {
  middlewares = jsonServer.defaults();
  app.use(middlewares);
  if (appConfiguration.logging === 'verbose')
    console.log('Loaded json-server middlewares.');
}

// Load a body parser.
if (appConfiguration.useJsonServerBodyParser !== false) {
  app.use(jsonServer.bodyParser);
  if (appConfiguration.logging === 'verbose')
    console.log('Using json-server body parser.');
}

// Load any configuration-specified modules which need to be loaded prior to the json-server router.
if (appConfiguration.modules) {
  if (appConfiguration.logging === 'verbose')
    console.log('\nLoading modules from configuration...');
  appConfiguration.modules.forEach(moduleCfg => {
    try {
      var module = require(moduleCfg.path);

      // If the module was successfully instantiated, attempt to register each of its handlers.
      if (module) {

        moduleCfg.handlers.forEach(moduleHandler => {
          try {
            // If a router type (get, post, put, etc.) is specified, register the module for the specified route.
            // An optional method name can be specified, allowing only the method to be registered instead of the module as the handler.
            // Example 1:  { path: "./cars", routeType: "post", route: "/api/v1/cars" }
            //    ...is equivalent to:  app.post('/api/v1/cars', module);
            // Example 2:  { path: "./animals", routeType: "get", route: "/api/v1/pets", method: "pets" }
            //    ...is equivalent to:  app.get('/api/v1/pets', module.pets);
            if (moduleHandler.routeType) {
              app[moduleHandler.routeType.toLowerCase()](moduleHandler.route, moduleHandler.method ? module[moduleHandler.method] : module);
              if (appConfiguration.logging === 'verbose')
                console.log(`    Successfully loaded action module handler "`
                  + `${moduleHandler.name || (moduleHandler.routeType.toUpperCase() + '" via "' + moduleHandler.route)}" from "${moduleCfg.path}".`);
            }
            // Otherwise, load the module as a specialized pass-through handler.  Example:  app.use(module);
            else {
              app.use(moduleHandler.method ? module[moduleHandler.method] : module);
              if (appConfiguration.logging === 'verbose')
                console.log(`    Successfully loaded pass-through module "${moduleHandler.name || (moduleCfg.name + '" from "' + moduleCfg.path)}".`);
            }
            // Check for being a public route.
            if (moduleHandler.isPublic) {
              appConfiguration.publicRoutes.push(moduleHandler.routeTest || "^" + moduleHandler.route + "(/.*)?$");
              if (appConfiguration.logging === 'verbose')
                console.log(`        Added public route "${moduleHandler.routeTest || "^" + moduleHandler.route + "(/.*)?$"}".`);
            }
            // Else check for a private route and rewrite specified (otherwise it would need to be added manually).
            else if (moduleHandler.routeTest && moduleHandler.routeRewrite) {
              appConfiguration.privateRoutes[moduleHandler.routeTest] = moduleHandler.routeRewrite;
              if (appConfiguration.logging === 'verbose')
                console.log(`        Added private route rewritter "${moduleHandler.routeTest} --> ${moduleHandler.routeRewrite}".`);
            }
          } catch (error) {
            // Log any handler error and continue loading other handlers.
            console.error(`        Error loading module handler "`
              + `${moduleHandler.name || (moduleHandler.routeType.toUpperCase() + ' ' + moduleHandler.route)}"!  `
              + `Details: ${error.message || error}\n`);
          }
        });
        // If the module has an onInit method, call it.
        if (module.onInit) {
          if (appConfiguration.logging === 'verbose')
            console.log(`        Calling onInit on module "${moduleCfg.name || moduleCfg.path}"...`);
          module.onInit(app, server, appConfiguration);
        }
      }
    } catch (error) {
      // Log any error and continue loading other modules.
      console.error(`        Error loading module "`
        + `${moduleCfg.name || (moduleCfg.routeType ? moduleCfg.routeType.toUpperCase() : moduleCfg.path)}"!  `
        + `Details: ${error.message || error}\n`);
    }
  });
  // Append a blank line in the console.
  console.log('');
}

// Load rewriter rules which provide access to private resources.  Resources not identified as public or private routes are unreachable.
if (appConfiguration.useJsonServerRewriter !== false) {
  app.use(jsonServer.rewriter(appConfiguration.privateRoutes));
  if (appConfiguration.logging === 'verbose')
    console.log('Using json-server rewriter module.');
}

// Add the json-server router to handle all requests.
// TODO:  Make this configurable and capable of supporting multiple route path prefixes.
//app.use('/api/v1', jsonServer.router(config.databaseFile || './db.json'));
if (appConfiguration.useJsonServerRouter !== false) {
  app.use(jsonServer.router(appConfiguration.databaseFile || './db.json'));
  if (appConfiguration.logging === 'verbose')
    console.log('Using json-server router module.');
}

// Add an error handler.
if (appConfiguration.includeDefaultErrorHandler !== false) {
  app.use((err, _req, _res, next) => {

    // If an error object was supplied, continue with that error object.
    if (err)
      return next(err);

    // Otherwise, create an error object and continue.
    return next(new Error('Unhandled error encountered'));
  });
  if (appConfiguration.logging === 'verbose')
    console.log('Using default error handler module.');
}

// Run the server and listen for requests.
server.listen(appConfiguration.port || 40000, () => {
  if (appConfiguration.logging !== 'none') {
    console.log(`\nsecure-json-server is now running at http://localhost:${appConfiguration.port || '40000 (default)'}`);
    console.log("Press [Ctrl] + C to exit.\n");
  }
});

