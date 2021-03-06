import validImageStream = require('../util/valid-image-stream');
import Route = require('../model/route');
import FlamingoOperation = require('../model/flamingo-operation');
import Constructor from '../model/Constructor';
import Hapi = require('hapi');
import Config = require('../../config');
import Server = require('../model/server');

export = function<T extends Constructor<Route>>(Base: T) {
  /**
   * Mixin that validates that the incoming process stream is an image.
   * @mixin
   */
  return class extends Base {
    /**
     * Validates read stream to be a valid image
     * @param {FlamingoOperation} op
     * @returns {Promise}
     */
    validStream(op: FlamingoOperation): (stream) => Promise<any> {
      return validImageStream(op);
    }
  };
};
