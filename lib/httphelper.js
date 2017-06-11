const Mine = require('mime');

const _httpMethods = Object.freeze({
    HEAD: 'HEAD',
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
});

function httpNotFound(req, res) {
    console.log(`No request handler found for ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.write('404 Not found');
    res.end();
}

function httpInternalError(req, res, err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.write(`Error 500 Internal server error: ${err}`);
    res.end();
}

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
