const Path = require('path');
const Url = require('url');
const Fs = require('fs');
const QueryStr = require('querystring');

const HttpHelper = require('./httphelper');
const JsonDB = require('./jsondb');

const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isEmpty = require('lodash/isEmpty');
const isUndefined = require('lodash/isUndefined');
const filter = require('lodash/_arrayFilter');
const flatMap = require('lodash/flatMap');


const FilterType = Object.freeze({
    before: 'before',
    after: 'after',
});

function urlMatches(config, url) {
    if (config instanceof RegExp) {
        return config.test(url);
    }
    if (isFunction(config)) {
        return config(url);
    }
    return config === url;
}
function urlWeight(config) {
    if (isUndefined(config)) {
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

class HttpChain {
    constructor() {
        this.queue = [];
    }
    add(cb) {
        if (isFunction(cb)) {
            this.queue.push(cb);
        }
    }
    addAll(cbs) {
        if (!isArray(cbs)) {
            return;
        }
        cbs.forEach(cb => this.add(cb));
    }
    next(req, res) {
        const cb = this.queue.shift();
        if (isFunction(cb)) {
            cb(req, res, this);
        }
    }
    stop(req, res) { // eslint-disable-line class-methods-use-this
        res.end();
    }
    getWrapped(cb) { // eslint-disable-line class-methods-use-this
        return (req, res, chain) => {
            if (isFunction(cb)) {
                cb(req, res);
            }
            chain.next(req, res);
        };
    }
}

class HttpSrv {
    constructor() {
        this.listeners = [];
        this.filters = [];
    }
    //
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
    onError(cb) {
        this.errorListener = cb;
    }
    onHead(url, cb) {
        this.on(HttpHelper.HttpMethods.HEAD, url, cb);
    }
    onGet(url, cb) {
        this.on(HttpHelper.HttpMethods.GET, url, cb);
    }
    onPost(url, cb) {
        this.on(HttpHelper.HttpMethods.POST, url, cb);
    }
    onPut(url, cb) {
        this.on(HttpHelper.HttpMethods.PUT, url, cb);
    }
    onDelete(url, cb) {
        this.on(HttpHelper.HttpMethods.DELETE, url, cb);
    }
    beforeFilter(url, cb) {
        this.filter(FilterType.before, url, cb);
    }
    afterFilter(url, cb) {
        this.filter(FilterType.after, url, cb);
    }
    getListener(url, method) {
        const listner = filter(this.listeners, item =>
            item.method === method && urlMatches(item.url, url)
        ).sort((a, b) => urlWeight(b) - urlWeight(a));
        return isEmpty(listner) ? this.errorListener : listner[0].cb;
    }
    getFilters(url, type) {
        const filters = filter(this.filters, item =>
            item.type === type && urlMatches(item.url, url));
        return flatMap(filters, item => item.cb);
    }
    setStatic(url, folder, defaultFile) {
        const rexp = new RegExp(`^${url}`);
        this.onGet(rexp, (req, res) => {
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
    setJson(url, jsonFileName, lookupField, readOnly) {
        const rexp = new RegExp(`^${url}`);
        const jsondb = new JsonDB(jsonFileName, lookupField);
        const getQuery = (reqUrl) => reqUrl.replace(url, '').replace(/\//g, '');
        this.onGet(rexp, (req, res) => {
            const query = getQuery(req.url);
            const result = jsondb.get(query);
            if (!result) {
                this.errorListener(req, res);
                return;
            }
            HttpHelper.ok(req, res, JSON.stringify(result), 'json');
        });
        if (!readOnly) {
            this.onPost(rexp, (req, res) => {
                const query = getQuery(req.url);
                const item = JSON.parse(req.body);
                if (query) {
                    item[lookupField] = query;
                }
                jsondb.post(item)
                    .then(() => {
                        HttpHelper.ok(req, res, 'done', 'txt');
                    })
                    .catch((reason) => {
                        HttpHelper.error(req, res, reason);
                    });
            });
            this.onPut(rexp, (req, res) => {
                const query = getQuery(req.url);
                const item = JSON.parse(req.body);
                if (query) {
                    item[lookupField] = query;
                }
                jsondb.put(item)
                    .then(() => {
                        HttpHelper.ok(req, res, 'done', 'txt');
                    })
                    .catch((reason) => {
                        HttpHelper.error(req, res, reason);
                    });
            });
            this.onDelete(rexp, (req, res) => {
                const query = getQuery(req.url);
                jsondb.delete(query)
                    .then(() => {
                        HttpHelper.ok(req, res, 'done', 'txt');
                    })
                    .catch((reason) => {
                        HttpHelper.error(req, res, reason);
                    });
            });
        }
    }
    dispatch(req, res) {
        const url = Url.parse(req.url, true);
        const method = req.method.toUpperCase();
        const httpChain = new HttpChain();
        httpChain.addAll(this.getFilters(url.pathname, FilterType.before));
        const listener = this.getListener(url.pathname, method);
        httpChain.add(httpChain.getWrapped(listener));
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
}

module.exports = HttpSrv;
