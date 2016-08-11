/* @flow weak */

/**
 * Video preprocessor module
 * @module
 */

const ffmpeg = require('fluent-ffmpeg');
const Promise = require('bluebird');
const assign = require('lodash/assign');
const isFinite = require('lodash/isFinite');
const got = require('got');
const {ProcessingError, InvalidInputError} = require('../../util/errors');
const pkg = require('../../../package');
const {FILE, REMOTE} = require('../../model/reader-type');

const logger = require('../../logger').build('preprocessor:video');
const defaultProcessConf = {
  seekPercent: 0
};

/**
 * Builds a function that takes a reader result and transforms it into an image stream.
 * @param {FlamingoOperation} operation
 * @return {Function}
 */
module.exports = function (operation) {
  const conf = operation.config;
  const givenProcessConf = operation.preprocessorConfig;
  const processConf = assign({}, defaultProcessConf, givenProcessConf);

  return function (readerResult) {
    const ffmpegOptions = {};

    /* istanbul ignore else */
    if (conf.PREPROCESSOR.VIDEO.KILL_TIMEOUT) {
      ffmpegOptions.timeout = conf.PREPROCESSOR.VIDEO.KILL_TIMEOUT;
    }

    function videoProcessor(input) {
      return new Promise(function (resolve, reject) {
        ffmpeg.ffprobe(input, function (err, meta) {
          if (err) {
            reject(new InvalidInputError(err.message, err));
          }
          else {
            /* istanbul ignore next */
            if (!meta.hasOwnProperty('format')) {
              throw new InvalidInputError('Input format is undetectable by ffprobe');
            }

            const duration = isFinite(meta.format.duration) ? meta.format.duration : 0;

            // seek to time and save 1 frame
            resolve(ffmpeg(input, ffmpegOptions)
              .noAudio()
              .seekInput(duration * processConf.seekPercent)
              .frames(1)
              .format('image2')
              .on('codecData', function (data) {
                logger.debug(data);
              })
              .on('start', function (commandLine) {
                logger.info(`Spawned ffmpeg with command: ${commandLine}`);
              })
              .on('error', function (e) {
                throw new ProcessingError(e.message, e);
              })
              .on('end', function () {
                logger.debug('ffmpeg end');
              }));
          }
        });
      });
    }

    switch (readerResult.type) {
      case FILE: {
        return videoProcessor(readerResult.path);
      }
      case REMOTE: {
        let promise;
        if (conf.ALLOW_READ_REDIRECT) {
          promise = videoProcessor(readerResult.url.href);
        } else {
          // do HEAD to check if redirect response code because ffprobe/ffmpeg always follow redirects
          promise = got.head(readerResult.url.href, {
            timeout: conf.READER.REQUEST.TIMEOUT,
            headers: {'user-agent': pkg.name + '/' + pkg.version + ' (+' + pkg.bugs.url + ')'},
            followRedirect: false,
            retries: 0
          }).then(() => {
            return videoProcessor(readerResult.url.href);
          }).catch(err => new InvalidInputError('Error while doing a HEAD request to check for redirects', err));
        }
        return promise;
      }
      default: {
        return readerResult.stream()
          .then((stream) => videoProcessor(stream));
      }
    }
  };
};
