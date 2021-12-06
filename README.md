# SecureJsonServer

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 12.2.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

# Setting Up a Secure Dev Server

This project is for **DEVELOPMENT USE ONLY!!!** The app creates a [json-server](https://github.com/typicode/json-server) REST API against a JSON document in order to mimic the functionality of a simple REST API. It is then wrapped by an instance of the [https](https://www.npmjs.com/package/https) module to provide basic HTTPS secure transport functionality. Additional middleware modules can be added to simulate business logic which occurs in addition to common CRUD operations.

## Setup

The following steps must be followed in order to support the execution of the HTTPS protocol.
Begin by creating a self-signed certificate to use with your localhost environment (development machine). This process will use [OpenSSL](https://slproweb.com/products/Win32OpenSSL.html) to generate the keys.

The following steps are based on an [IBM help page](https://www.ibm.com/docs/en/api-connect/2018.x?topic=overview-generating-self-signed-certificate-using-openssl).

- Generate Your Private Key
  ...by executing the following command in a command window.

```
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out self-signed-certificate.pem
```

- Review the certificate

```
openssl x509 -text -noout -in self-signed-certificate.pem
```

- Combine your key and certificate into a PKCS#12 (P12) bundle.

```
 openssl pkcs12 -inkey key.pem -in self-signed-certificate.pem -export -out self-signed-certificate.p12
```

- Validate your p12 bundle.

```
openssl pkcs12 -in certificate.p12 -noout -info
```

- Follow the steps on [this page](https://asu.secure.force.com/kb/articles/FAQ/How-Do-I-Add-Certificates-to-the-Trusted-Root-Certification-Authorities-Store-for-a-Local-Computer) (thanks ASU) to insert the certificate into your local trusted keystore.

- Store a decrypted copy of the key for use with the https server instance. (Yes, really. This is why you should not use this outside of a local development environment.)

```
openssl rsa -in self-signed-certificate.pem -out self-signed-certificate.key
```

## Execution

The secure-json-server instance is a NodeJS/Express application which does the following:

- reads configuration information
- loads modules, routes, and rewriters specified by the configuration
- loads a body content parser
- loads a router providing basic CRUD functionality via a REST API
- loads the certificate file and decrypted key
- instantiates an instance of the _https_ module to facilitate secure communications
- begins listening on the specified port as a REST API

**NOTE:** If you are making use of a self-signed certificate, browsers may still complain that it is not signed by a legitimate certificate authority (CA). This is ok and you can continue forward with the requests within a development environment.

## Configuration

The secure-json-server is designed to eliminate the need for most code changes by adjusting execution and functionality according to the information provided in the _secure-json-server.config.json_ file. Following are the options provided by the configuration system:

### Certificate

The _secure-json-server_ uses a certificate to encrypt/decrypt transferred information.

- _certificateFile_ _(Required)_ -- Path to the certificate to use for communications.
- _certificateKeyFile_ _(Required)_ -- Path to the decrypted key file used to decrypt information.

### Logging

Version 1.0.0 only provides logging to the console.

- _logging_ _(Optional)_ -- Indicates the desired level of logging.
  - _none_ -- No information is reported.
  - _normal_ _(default)_ -- Common information such as that describing the start-up, connection information, requests received, and shut-down processes.
  - _verbose_ -- All information is reported.

### Connection

- \_port (Optional) -- The port on which the server will listen for requests. When not specified, the port defaults to 40000.

### Module Loading

All modules can be loaded into the server via the _modules_ array of the configuration file. This includes, but is not limited to, routing modules and module methods, pass-through modules, and error-handling modules. Each module is instantiated and connected in the order that they are listed in the configuration file, making it easy to indicate those modules which may need to be loaded prior to other modules. Routing information can be included for some module types, and if specified, those routing entries will automatically be appended to the end of the _publicRoutes_ or _privateRoutes_ lists.

Each module may contain any number of exported methods defined. If a module provides only one method, its signature is often written as follows:

module.exports = (request, response, next) => { ... }

If a module contains multiple methods/handlers, the signature changes to indicate the specific method of the module which will provide the handler functionality:

module.exports.firstHandler = (request, response, next) => { ... },
module.exports.secondHandler = (request, response, next) => { ... },
module.exports.myErrorHandler = (error, request, response, next) => { ... }

When specifying routing information, it is common to use test and rewriter values which are parameterized and may duplicate those specified by other modules. Each test value and rewriter value are stored in key/value pairs in which the test value is the key. This design prevents the existence of duplicated routes.

- **Pass-Through Modules**

  Pass-through modules are those modules which receive each request which is received by the server, performs an action based on internal filtering criteria, and then passes execution on to the next module in the system. Pass-through modules are not tied specifically to a route, yet they may specify one public or private route associated with its functionality. If needed, additional routes can be specified during the call to the optional _onInit_ method of the module.

  - **name** _(Optional)_ -- Specifies a human-readable name for the module. When not supplied, the module will be referred to by its path.
  - **path** _(Required)_ -- Specifies the path to the module file without the ".js" extension.

  All pass-through modules must provide a method signature to accept a reference to the _request_ object, _response_ object, and _next_ synchronization method:

  module.exports = (request, response, next) => { ... }
  -- or --
  module.exports.myMethod = (request, response, next) => { ... }

  - **Example: Pass-Through Module Without Routing**

    Every request received will pass through the module. The module is responsible for determining if and how it should respond to the request.

    ```
    {
      ...
      "modules": [
        ...
        {
          "name": "myModule",
          "path": "./middlewares/my-module"
        },
        ...
      ]
    }
    ```

  - **Example: Pass-Through Module Specifying A Public Route**

    While a pass-through module is not tied directly to a specific route, it can specify a route which should be included within the routing information of the server. In this example, the _isPublic_ property indicates that the route specified by the _route_ property of the handler should be added to the list of public routes (requiring no authentication) of the server.

    **NOTE:** DO NOT provide multiple handlers in order to load additional routes. Adding multiple handlers will cause the module to be loaded multiple times.

    ```
    {
      ...
      "modules": [
        ...
        {
          "name": "myPassThruModule",
          "path": "./middlewares/my-pass-thru-module",
          "handlers": [
            {
              "isPublic": true,
              "route": "/api/v1/cars"
            }
          ]
        }
      ]
    }
    ```

  - **Example: Pass-Through Module Specifying A Private Route**

    See the previous example for more information. When specifying a private route, or a route rewriter instruction, the _isPublic_ property of the handler is omitted or set to _false_, the _routeTest_ property specifies the regular expression test to apply to the request URL, and the _routeRewrite_ property is used to specify the manner in which the route matching _routeTest_ should be formatted. For more information on how to specify the rewriter format, refer to the _json-server_ documentataion.

    ```
    {
      ...
      "modules": [
        ...
        {
          "name": "myPassThruModule",
          "path": "./middlewares/my-pass-thru-module",
          "handlers": [
            {
              "routeTest": "/api/v1/cars",
              "routeRewrite": "/$1"
            }
          ]
        }
      ]
    }
    ```

- **Error-Handler Modules**

  An error-handler module is a pass-through module with a method argument list which takes four (4) arguments instead of the typical three (3):

  module.exports = (error, request, response, next) => { ... }

  See the pass-through module examples above for more information on registering an error-handler module.

- **Action Handler Modules**

  A module may contain any number of methods which are tied directly to an action (request method) type and route. The route associated with these handler declarations are required in order to direct matching requests to the handlers. Unlike pass-through module handlers, an action handler only receives those requests which match its signature (action + route). To aid in the filtering of calls, a regular expression is used to route requests.

  - **route** _(Optional)_ -- Used only in reporting the human-readable route of the handler.
  - **routeTest** _(Required)_ -- Determines the requests which be routed to the handler.
  - **routeRewrite** _(Required only for private routes)_ -- Used to register a private route or private route rewritter.
  - **routeType** _(Required)_ -- Indicates the action/method type (GET, PUT, POST, DELETE, etc.)

  - **Example: Public GET Handler**

    The following module definition provides a handler which responds to only those requests which specify an action/method type of "GET" and a URL path of "/api/v1/cats":

    ```
    {
      ...
      "modules": [
        ...
        {
          "name": "GET cats",
          "path": "./middlewares/cats",
          "handlers": [
            {
              "isPublic": true,
              "route": "/api/v1/cats",
              "routeTest": "^/api/v1/cats(/.*)?$",
              "routeType": "GET"
            }
          ]
        }
      ]
    }
    ```

  - **Example: Private Handlers**

    The following module definition provides a handler which responds to only those requests which specify an action/method type of "POST" and a URL path of "/api/v1/cats". Authenitication is required for this handler, therefore it is registered with a private route or route rewritter format. Many modules supporting action methods, will contain multiple handler methods -- one per action. This example illustrates the use of multiple private action types:

    ```
    {
      ...
      "modules": [
        ...
        {
          "name": "cats",
          "path": "./middlewares/cats",
          "handlers": [
            {
              "name": "Create a Cat",
              "route": "/api/v1/cats",
              "routeTest": "/api/v1/cats",
              "routeRewriter": "/$1",
              "routeType": "POST"
            }
            {
              "name": "Update a Cat",
              "route": "/api/v1/cats",
              "routeTest": "/api/v1/:resource/:id",
              "routeRewriter": "/:resource/:id",
              "routeType": "PUT"
            }
            {
              "name": "Delete a Cat",
              "route": "/api/v1/cats",
              "routeTest": "/api/v1/:resource/:id",
              "routeRewriter": "/:resource/:id",
              "routeType": "DELETE"
            }
          ]
        }
      ]
    }
    ```

### Routing

The _secure-json-server_ simply adds secure communication functionality (https) to the common _json-server_ utility. For this reason, you should review the documentation for _json-server_ to understand how routing is performed. The _secure-json-server_ utility starts with a predefined list of public routes via the _publicRoutes_ property, and appends additional routes as modules are loaded. When a request is received, its URL is checked against the test patterns of the public routes list to see if there is a match. If a match is found, the default authentication process provided in the supplied _auth_ middleware module skips authentication checks altogether. While this may not be the desired behavior for production systems, it is important to note that the _secure-json-server_ is designed for development use only. If different authentication functionality is required, a different module other than the existing _auth_ module can be used.

When the URL of a request does not match one of the public routes, it is then subject to authtication by the supplied _auth_ module, or other authentication module processes you may supply. If using a versioned approach to REST API construction, the rewriter routes come into play and are required to rewrite the URL to fit the path supported by the underlying _json-server_. The list of private routes can be predefined via the _privateRoutes_ property, and then additional rewritters are appended as modules are defined.

### Authentication

The _secure-json-server_ maintains a list of permitted users within the configuration file. Since this utility is designed for development use only, the default method of authentication is minimal and MUST NOT be used in a production environment. The supplied _auth_ module references this list of users in the configuration file/object to provide basic username and password authentication.

## Credits & Licensing

This first, rather rushed and crude implementation of providing a _json-server_ instance via secure HTTP transport (https) was developed by Eric Bewley of Bewley Software Productions, Inc. (BSP). It draws significantly upon the functionality of the existing [_json-server_ utility](https://github.com/typicode/json-server) by typecode.

This utility is provided as-is with no implied warranties or guarantes under the standard MIT License. By using this utility, you agree to hold Eric Bewley and Bewley Software Productions, Inc. free from ALL liability.

Please understand that this utility is expected to evolve over time into something equally simple yet more powerful. Apologies in advance for any breaking changes in future versions which require some degree of modification of your code.

Enjoy!
The BSP Team
