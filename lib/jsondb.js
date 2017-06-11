const Fs = require('fs');
const find = require('lodash/find');
const findIndex = require('lodash/findIndex');
const remove = require('lodash/remove');


class JsonDb {
    constructor(fileName, lookupField) {
        this._fileName = fileName;
        this._lookupField = lookupField || 'id';
        this._content = {};
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
    refresh() {
        this.readFileAsync()
            .then((content) => {
                this._content = content;
            })
            .catch((reason) => {
                console.error(reason);
            });
    }
    get(val) {
        if (val == '') {
            return this._content;
        }
        return find(this._content, (el) => el.hasOwnProperty(this._lookupField) && el[this._lookupField] == val);
    }
    put(val) {
        return new Promise((resolve, reject) => {
            if (!val.hasOwnProperty(this._lookupField)) {
                reject(`Item doesn\'t have ${this._lookupField} field`);
                return;
            }
            const check = find(this._content, (el) => el.hasOwnProperty(this._lookupField) && el[this._lookupField] == val[this._lookupField]);
            if (check) {
                reject(`Item with ${this._lookupField}=${val[this._lookupField]} field already exist in database`);
                return;
            }
            this._content.push(val);
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
    post(val) {
        return new Promise((resolve, reject) => {
            if (!val.hasOwnProperty(this._lookupField)) {
                reject(`Item doesn\'t have ${this._lookupField} field`);
                return;
            }
            const index = findIndex(this._content, (el) => el.hasOwnProperty(this._lookupField) && el[this._lookupField] == val[this._lookupField]);
            if (index === -1) {
                reject(`Item with ${this._lookupField}=${val[this._lookupField]} field doen\'t exist in database`);
                return;
            }
            this._content[index] = val;
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
    delete(val) {
        return new Promise((resolve, reject) => {
            if (val == '') {
                reject(`Item with ${this._lookupField}=${val} doesn\'t exist`);
                return;
            }
            const arr = remove(this._content, (el) => el.hasOwnProperty(this._lookupField) && el[this._lookupField] == val);
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
