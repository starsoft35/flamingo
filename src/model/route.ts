/**
 * Flamingo route
 * @class
 */
import Hapi = require('hapi');

import Logger = require('../logger');
import errorReply = require('../util/error-reply');
import Server = require('./server');
import Config = require('../../config');
import FlamingoOperation = require('./flamingo-operation');

const { build } = Logger;
const logger = build('model.route');

/**
 * Route class is the basic class every route should extend.
 * The idea is that an incoming request generates a FlamingoOperation
 * which is passed through the route and used to store metadata.
 */
class Route {
  path: string;
  method: Hapi.HTTP_METHODS;
  config: Config;
  description: string;
  parseState: boolean = false;
  cors: boolean = true;
  server: Server;

  /**
   *
   * @param {Config} config
   * @param {string} method the routes http method
   * @param {string} path the routes url path
   * @param {string} [description=''] route description
   */
  constructor(config, method, path, description = '') {
    this.path = path;
    this.method = method;
    this.cors = true;
    this.config = config || {};
    if (description.length) {
      this.description = description;
    }
    this.parseState = false;
  }

  /**
   * Function that is called for each request.
   * To send the response, call `operation.reply()`.
   *
   * @see {@link http://hapijs.com/api#replyerr-result}
   * @param {FlamingoOperation} operation
   */
  handle(operation): Promise<any> {
    return Promise.reject(new Error('Method not implemented: Route.handle()'));
  }

  /**
   * Function to build the hapi route config object
   * @see {@link http://hapijs.com/api#new-serveroptions}
   * @param {Object} defaults
   */
  hapiConfig(defaults: any = {}): Hapi.RouteConfiguration {
    defaults.method = this.method;
    defaults.path = this.path;
    defaults.config = defaults.config || {
      cors: this.cors,
      state: { parse: this.parseState }
    };
    defaults.config.description = this.description;
    defaults.config.handler = (request, reply) =>
      this.buildOperation(request, reply)
        .then(operation =>
          this.handle(operation).catch(error =>
            this.handleError(request, reply, error, operation)
          )
        )
        .catch(error => this.handleError(request, reply, error));
    return defaults;
  }

  /**
   * Function to build the flamingo operation based on the incoming request + reply function.
   * Each extending class should call super.buildOperation to get a minimal working flamingo operation.
   * @param {Request} request
   * @param {function} reply
   * @returns {Promise.<FlamingoOperation>}
   * @see {@link http://hapijs.com/api#request-properties}
   */
  buildOperation(request, reply) {
    const op = new FlamingoOperation();
    op.request = request;
    op.reply = reply;
    op.config = this.config;
    return Promise.resolve(op);
  }

  /**
   * Function to log and reply errors
   * @param {Request} request
   * @param {function} reply function that replies to the request
   * @param {Error} error
   * @param {FlamingoOperation} [operation]
   * @return {*} reply return value
   */
  handleError(request, reply, error, operation = {}) {
    const message = `${error.name}: ${error.message} at '${request.path}'`;
    logger.error(
      {
        error,
        operation,
        request,
        route: this
      },
      message
    );
    return reply(errorReply(error, operation));
  }
}

export = Route;
