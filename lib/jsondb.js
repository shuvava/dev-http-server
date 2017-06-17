const path = require('path');
const Fs = require('fs');
const find = require('lodash/find');
const findIndex = require('lodash/findIndex');
const remove = require('lodash/remove');

function hasProperty(object, objPath) {
    return object != null && Object.prototype.hasOwnProperty.call(object, objPath);
}

function hasValue(object, objPath, value) {
    return hasProperty(object, objPath) && object[objPath] == value; // eslint-disable-line eqeqeq
}

/**
 * Class implements CRUD operations with JSON file
 * @example
 * const JsonDB = require('./jsonDb');
 * const jsonDb = new JsonDB('./file.json, 'id');
 * jsonDb.get(1); // retrieve from db object with id = 1
 */
class JsonDb {
    /**
     * @param {string} fileName File name with full or relative path
     * @param {string} [lookupField='id'] primary key field name
     */
    constructor(fileName, lookupField = 'id') {
        this._lookupField = lookupField;
        this._content = {};
        if (path.isAbsolute(fileName)) {
            this._fileName = fileName;
        } else {
            const appDir = path.dirname(require.main.filename);
            this._fileName = path.join(appDir, fileName);
        }

        this.refresh();
        Fs.watch(this._fileName, () => {
            this.refresh();
        });
    }

    readFileAsync() {
        return new Promise((resolve, reject) => {
            Fs.readFile(this._fileName, (err, file) => {
                if (err) {
                    console.log(`Cannot read file ${this._fileName}`);
                    reject(err);
                } else {
                    resolve(JSON.parse(file));
                }
            });
        });
    }

    /**
     * reread content of file
     */
    refresh() {
        this.readFileAsync()
            .then((content) => {
                this._content = content;
            })
            .catch((reason) => {
                console.error(reason);
            });
    }

    /**
     * Looks up record by Id
     * @param {string|number} id Primary key value
     */
    get(id) {
        if (id == '') { // eslint-disable-line eqeqeq
            return this._content;
        }
        return find(this._content, el => hasValue(el, this._lookupField, id));
    }

    /**
     * Adds new record into database
     * @param {object} record New database record
     */
    put(record) {
        return new Promise((resolve, reject) => {
            if (!hasProperty(record, this._lookupField)) {
                reject(`Item doesn't have ${this._lookupField} field`);
                return;
            }
            const check = find(this._content, el => hasValue(el, this._lookupField, record));
            if (check) {
                reject(`Item with ${this._lookupField}=${record[this._lookupField]} field already exist in database`);
                return;
            }
            this._content.push(record);
            Fs.writeFile(this._fileName, JSON.stringify(this._content, null, 4), (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Update record into database
     * @param {object} record Database record
     */
    post(record) {
        return new Promise((resolve, reject) => {
            if (!hasProperty(record, this._lookupField)) {
                reject(`Item doesn't have ${this._lookupField} field`);
                return;
            }
            const index = findIndex(this._content, el => hasValue(el, this._lookupField, record));
            if (index === -1) {
                reject(`Item with ${this._lookupField}=${record[this._lookupField]} field doesn't exist in database`);
                return;
            }
            this._content[index] = record;
            Fs.writeFile(this._fileName, JSON.stringify(this._content, null, 4), (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Delete record from database
     * @param {string|number} id Primary key value
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            if (id === '') {
                reject(`Item with ${this._lookupField}=${id} doesn't exist`);
                return;
            }
            const arr = remove(this._content, el => hasValue(el, this._lookupField, id));
            if (arr.length === 0) {
                resolve(0);
            }
            Fs.writeFile(this._fileName, JSON.stringify(this._content, null, 4), (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve(arr.length);
                }
            });
        });
    }
}

module.exports = JsonDb;
