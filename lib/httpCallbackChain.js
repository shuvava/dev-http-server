const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');

/**
 * Class manages queue of callbacks
 */
class HttpCallbackChain {
    constructor() {
        this.queue = [];
    }
    /**
     * Add callback function into queue
     * @param {Function} cb Callback
     */
    add(cb) {
        if (isFunction(cb)) {
            this.queue.push(cb);
        }
    }
    /**
     * Add array of callback function into queue
     * @param {Array.<Function>} cb Array fo callbacks
     */
    addAll(cbs) {
        if (!isArray(cbs)) {
            return;
        }
        cbs.forEach(cb => this.add(cb));
    }
    /**
     * Execute next callback function in queue
     * @param {Object} req HTTP request
     * @param {Object} res HTTP response
     */
    next(req, res) {
        const cb = this.queue.shift();
        if (isFunction(cb)) {
            cb(req, res, this);
        }
    }
    /**
     * End callback execution in queue
     * @param {Object} req HTTP request
     * @param {Object} res HTTP response
     */
    stop(req, res) { // eslint-disable-line class-methods-use-this
        res.end();
    }
    /**
     * @param {Function} cb Callback
     */
    getDecoratedCallback(cb) { // eslint-disable-line class-methods-use-this
        return (req, res, chain) => {
            if (isFunction(cb)) {
                cb(req, res);
            }
            chain.next(req, res);
        };
    }
}

module.exports = HttpCallbackChain;
