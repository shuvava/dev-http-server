const Mine = require('mime');

const _httpMethods = Object.freeze({
    HEAD: 'HEAD',
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
});

 /**
 * Default implementation of NotFound HTTP response
 * @param {Object} req HTTP request
 * @param {Object} res HTTP response
 */
function httpNotFound(req, res) {
    console.log(`No request handler found for ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.write('404 Not found');
    res.end();
}

 /**
 * Default implementation of InternalError HTTP response
 * @param {Object} req HTTP request
 * @param {Object} res HTTP response
 * @param {string} err Error message
 */
function httpInternalError(req, res, err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.write(`Error 500 Internal server error: ${err}`);
    res.end();
}

/**
 * Default implementation OK HTTP response on GET file request
 * @param {Object} req HTTP request
 * @param {Object} res HTTP response
 * @param {string} content File content
 * @param {string} fileExt File extension
 */
function httpOk(req, res, content, fileExt) {
    res.writeHead(200, {
        'Content-Type': Mine.lookup(fileExt),
    });
    res.write(content, 'binary');
    res.end();
}

module.exports = {
    HttpMethods: _httpMethods,
    notFound: httpNotFound,
    error: httpInternalError,
    ok: httpOk,
};
