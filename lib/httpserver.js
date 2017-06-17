const Path = require('path');
const Url = require('url');
const Fs = require('fs');
const QueryStr = require('querystring');
const http = require('http');

const HttpHelper = require('./httpHelper');
const JsonDB = require('./jsonDb');
const HttpChain = require('./httpCallbackChain');

const isFunction = require('lodash/isFunction');
const isEmpty = require('lodash/isEmpty');
const isUndefined = require('lodash/isUndefined');
const filter = require('lodash/_arrayFilter');
const flatMap = require('lodash/flatMap');


const FilterType = Object.freeze({
    before: 'before',
    after: 'after',
});

/**
 * @param {string|RegExp} pattern URL pattern to check
 * @param {string} url URL to check
 * @return {boolean}
 */
function urlMatches(pattern, url) {
    if (pattern instanceof RegExp) {
        return pattern.test(url);
    }
    if (isFunction(pattern)) {
        return pattern(url);
    }
    return pattern === url;
}

/**
 * Calculate relative weight of URL comparing object
 * @param {Object} config Internal object of URL comparing
 * @param {string|RegExp} [config.url] URL pattern to compare
 * @return {number} relative weight
 */
function urlWeight(config) {
    if (isUndefined(config) || config.url == undefined) { // eslint-disable-line eqeqeq
        return 0;
    }
    if (config.url instanceof RegExp) {
        return 1 + config.url.toString().length;
    }
    if (isFunction(config.url)) {
        return 1;
    }
    return 100 + config.url.length;
}

/**
 * @example
 * const HttpSrv = require('./httpserver');
 * const httpSrv = new HttpSrv();
 *
 * httpSrv.onError((req, res) => {
 *  res.writeHead(404);
 *  res.end();
 * });
 *
 * // set route handler for url /page2
 * httpSrv.onHead('/page2', (req, res) => {
 *  res.writeHead(200, { 'Content-Type': 'text/plain' });
 *  res.end();
 * });
 *
 * // set handler(mediator) executes before and url handler
 * httpSrv.beforeFilter(/\//, (req, res, chain) => { // any url
 *  console.time(req.url);
 *  chain.next(req, res, chain);
 * });
 * httpSrv.afterFilter(/\//, (req, res, chain) => { // any url
 *     console.timeEnd(req.url);
 *     chain.next(req, res, chain);
 * });
 *
 * // html pages
 * httpSrv.setStatic('/', '..\\www', 'index.html');
 */
class HttpSrv {
    constructor() {
        this.listeners = [];
        this.filters = [];
    }
    errorListener(req, res) { // eslint-disable-line class-methods-use-this
        HttpHelper.notFound(req, res);
    }
    on(method, url, cb) {
        this.listeners.push({
            method: method,
            cb: cb,
            url: url,
        });
    }
    filter(type, url, cb) {
        this.filters.push({
            type: type,
            cb: cb,
            url: url,
        });
    }
    /**
     * Set error handler
     * @param {Function} cb Callback function
     */
    onError(cb) {
        this.errorListener = cb;
    }
    /**
     * Set HEAD request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    onHead(url, cb) {
        this.on(HttpHelper.HttpMethods.HEAD, url, cb);
    }
    /**
     * Set GET request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    onGet(url, cb) {
        this.on(HttpHelper.HttpMethods.GET, url, cb);
    }
    /**
     * Set POST request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    onPost(url, cb) {
        this.on(HttpHelper.HttpMethods.POST, url, cb);
    }
    /**
     * Set PUT request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    onPut(url, cb) {
        this.on(HttpHelper.HttpMethods.PUT, url, cb);
    }
    /**
     * Set DELETE request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    onDelete(url, cb) {
        this.on(HttpHelper.HttpMethods.DELETE, url, cb);
    }
    /**
     * Set handler(filter) executes before any request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    beforeFilter(url, cb) {
        this.filter(FilterType.before, url, cb);
    }
    /**
     * Set handler(filter) executes after any request handler
     * @param {string|RegExp} url Relative URL or regexp
     * @param {Function} cb Callback function
     */
    afterFilter(url, cb) {
        this.filter(FilterType.after, url, cb);
    }
    /**
     * Returns first listener (callback added by onGet ... onDelete) matching provided URL
     * @param {string|RegExp} url Relative URL or regexp
     * @param {object} method Type of HTTP request
     */
    getListener(url, method) {
        const listener = filter(this.listeners, item => item.method === method && urlMatches(item.url, url))
            .sort((a, b) => urlWeight(b) - urlWeight(a));
        return isEmpty(listener) ? this.errorListener : listener[0].cb;
    }
    /**
     * Returns first filter matching provided URL
     * @param {string|RegExp} url Relative URL or regexp
     * @param {object} method type of filter
     */
    getFilters(url, type) {
        const filters = filter(this.filters, item =>
            item.type === type && urlMatches(item.url, url));
        return flatMap(filters, item => item.cb);
    }
    /**
     * Adds mapping of local folder to specific URL
     * @param {string|RegExp} url Relative URL or regexp
     * @param {string} folder Relative or absolute path to specific folder
     * @param {string} defaultFile File name which will return in case empty pass
     */
    setStatic(url, folder, defaultFile) {
        const regExp = new RegExp(`^${url}`);
        this.onGet(regExp, (req, res) => {
            const reqUrl = Url.parse(req.url, true);
            const fileName = Path.relative(url, reqUrl.pathname) === '' ? defaultFile : Path.relative(url, reqUrl.pathname);
            const fileFullName = Path.join(folder, fileName);
            if (fileFullName.indexOf(folder) !== 0) {
                this.errorListener(req, res);
                return;
            }
            Fs.readFile(fileFullName, (err, file) => {
                if (err) {
                    this.errorListener(req, res);
                    return;
                }
                HttpHelper.ok(req, res, file, fileFullName);
            });
        });
    }
    /**
     * Adds mapping JSON file to specific URL
     * @param {string|RegExp} url Relative URL or regexp
     * @param {string} jsonFileName Relative or absolute path to JSON file
     * @param {string} lookupField Primary key(lookup field)
     * @param {boolean} [readOnly=true] Type of access
     */
    setJson(url, jsonFileName, lookupField, readOnly = true) {
        const regExp = new RegExp(`^${url}`);
        const jsonDb = new JsonDB(jsonFileName, lookupField);
        const getQuery = reqUrl => reqUrl.replace(url, '').replace(/\//g, '');
        this.onGet(regExp, (req, res) => {
            const query = getQuery(req.url);
            const result = jsonDb.get(query);
            if (!result) {
                this.errorListener(req, res);
                return;
            }
            HttpHelper.ok(req, res, JSON.stringify(result), 'json');
        });
        if (!readOnly) {
            this.onPost(regExp, (req, res) => {
                const query = getQuery(req.url);
                const item = JSON.parse(req.body);
                if (query) {
                    item[lookupField] = query;
                }
                jsonDb.post(item)
                    .then(() => {
                        HttpHelper.ok(req, res, 'done', 'txt');
                    })
                    .catch((reason) => {
                        HttpHelper.error(req, res, reason);
                    });
            });
            this.onPut(regExp, (req, res) => {
                const query = getQuery(req.url);
                const item = JSON.parse(req.body);
                if (query) {
                    item[lookupField] = query;
                }
                jsonDb.put(item)
                    .then(() => {
                        HttpHelper.ok(req, res, 'done', 'txt');
                    })
                    .catch((reason) => {
                        HttpHelper.error(req, res, reason);
                    });
            });
            this.onDelete(regExp, (req, res) => {
                const query = getQuery(req.url);
                jsonDb.delete(query)
                    .then(() => {
                        HttpHelper.ok(req, res, 'done', 'txt');
                    })
                    .catch((reason) => {
                        HttpHelper.error(req, res, reason);
                    });
            });
        }
    }
    /**
     * Main loop of server
     * @param {Object} req HTTP request
     * @param {Object} res HTTP response
     */
    dispatch(req, res) {
        const url = Url.parse(req.url, true);
        const method = req.method.toUpperCase();
        const httpChain = new HttpChain();
        httpChain.addAll(this.getFilters(url.pathname, FilterType.before));
        const listener = this.getListener(url.pathname, method);
        httpChain.add(httpChain.getDecoratedCallback(listener));
        httpChain.addAll(this.getFilters(url.pathname, FilterType.after));
        if (method === HttpHelper.HttpMethods.POST || method === HttpHelper.HttpMethods.PUT) {
            let body = '';
            req.on('data', (data) => { body += data; });
            req.on('end', () => {
                const post = QueryStr.parse(body);
                req.body = body;
                req.params = post;
                httpChain.next(req, res);
            });
        } else {
            const urlParts = Url.parse(req.url, true);
            req.params = urlParts.query;
            httpChain.next(req, res);
        }
    }

    static Run(address, port) {
        const httpSrv = new HttpSrv();
        http.createServer((req, res) => {
            httpSrv.dispatch(req, res);
        }).listen(port, address);
        console.log(`Http Server started on ${address}:${port}`);
        return httpSrv;
    }
}

module.exports = HttpSrv;
