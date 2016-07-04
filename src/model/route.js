'use strict';

/**
 * Flamingo route
 * @class
 */

const FlamingoOperation = require('./flamingo-operation');
const logger = require('../logger').build('model.route');
const errorReply = require('../util/error-reply');
const Promise = require('bluebird');

/**
 * Route class is the basic class every route should extend.
 * The idea is that an incoming request generates a FlamingoOperation
 * which is passed through the route and used to store metadata.
 */
class Route {
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
    if (this.config.descriptiom || description.length) {
      this.description = this.config.description || description;
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
  handle(operation) {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Function to build the hapi route config object
   * @see {@link http://hapijs.com/api#new-serveroptions}
   * @param {Object} defaults
   */
  hapiConfig(defaults) {
    defaults = defaults || {};
    defaults.method = this.method;
    defaults.path = this.path;
    defaults.config = defaults.config || {cors: this.cors, state: {parse: this.parseState}};
    defaults.config.description = this.description;
    defaults.config.handler = (request, reply) =>
      this.buildOperation(request, reply).then(operation =>
        this.handle(operation)
          .catch(error => this.handleError(request, reply, error, operation)))
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
    logger.error({
      error: error,
      operation: operation
    }, 'Convert error for ' + request.path);
    return reply(errorReply(error, operation));
  }
}

// global hash of all profiles
Route.profiles = {};

module.exports = Route;
