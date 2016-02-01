'use strict';

const Route = require('../model/route');
const ImageStream = require('./../mixins/image-stream');
const ProfileOperation = require('./../mixins/profile-operation');
const Convert = require('./../mixins/convert');

class Image extends ImageStream(ProfileOperation(Convert(Route))) {
  constructor(conf, method = 'GET', path = '/image/{profile}/{url}', description = 'Profile image conversion') {
    super(conf, method, path, description);
  }
}

module.exports = Image;