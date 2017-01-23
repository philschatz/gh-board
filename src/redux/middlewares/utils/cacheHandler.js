import _ from 'underscore';
// 3 implementations: indexedDB, LocalStorage, In-mem
import levelup from 'levelup';
import leveljs from 'level-js';
// + querying the data
import levelQuery from 'level-queryengine';
import jsonqueryEngine from 'jsonquery-engine';

const MAX_CACHED_URLS = 2000;

export default class CacheHandler {
  constructor() {
    // Pull data from `localStorage`
    this.storage = window.localStorage;
    const cache = this.storage.getItem('octokat-cache');
    if (cache) {
      this.cachedETags = JSON.parse(cache);
    } else {
      this.cachedETags = {};
    }

    // See https://github.com/Level/levelup/wiki/Modules for more
    let driver;
    // driver = memdown;
    driver = leveljs;
    // driver = localstorage;

    const dbOpts = {db: driver, asBuffer:false, raw:true, storePrefix:'', dbVersion:1, /*indexes: indexes,*/ valueEncoding: 'none'};
    let db;
    try {
      db = levelup('octokatCache', dbOpts);
    } catch (err) {
      alert('It looks like your browser is in private browsing mode. gh-board uses IndexedDB to cache requests to GitHub. Please disable Private Browsing to see it work.');
      this.dbPromise = Promise.resolve('Running without indexedDB');
      return;
    }
    db = levelQuery(db);
    db.query.use(jsonqueryEngine());

    this._opts = {asBuffer:false, raw:true};

    this.dbPromise = new Promise((resolve) => {
      db.open((err) => {
        if (err) {
          alert('Problem opening database. are you incognito? ' + err.message);
        }
        db.query({})
        .on('data', (entry) => {
          let {methodAndPath, eTag, data, status} = entry;
          this.cachedETags[methodAndPath] = {eTag, data, status};
        })
        .on('stats', () => {
          this._db = db;
          resolve();
        });
      });
    });

    // Async save once now new JSON has been fetched after X seconds
    this.pendingTimeout = null;
  }
  _save(method, path, eTag, data, status) {
    const methodAndPath = method + ' ' + path;
    // This returns a promise but we ignore it. TODO: Batch the updates ina transaction maybe
    this._db.put(methodAndPath, {methodAndPath, eTag, data, status}, this._opts);
  }
  _dumpCache() {
    /* eslint-disable no-console */
    console.log('github-client: Dumping localStorage cache because it is too big');
    /* eslint-enable no-console */
    this.storage.removeItem('octokat-cache');
  }
  get(method, path) {
    const ret = this.cachedETags[method + ' ' + path];
    if (ret) {
      const {data, linkRelations} = ret;
      _.each(linkRelations, (value, key) => {
        if (value) {
          data[key] = value;
        }
      });
    }
    return ret;
  }
  add(method, path, eTag, data, status) {
    const linkRelations = {};
    // if data is an array, it contains additional link relations (to other pages)
    if (_.isArray(data)) {
      _.each(['next', 'previous', 'first', 'last'], (name) => {
        const key = name + '_page_url';
        if (data[key]) {
          linkRelations[key] = data[key];
        }
      });
    }

    if (status !== 403) { // do not cache if you do not have permissions
      this.cachedETags[method + ' ' + path] = {eTag, data, status, linkRelations};
      // Try to use IndexedDB but fall back to localStorage (Firefox/Safari in incognito mode)
      if (this._db) {
        this._save(method, path, eTag, data, status, linkRelations);
      } else {
        // fallback to localstorage
        if (Object.keys(this.cachedETags).length > MAX_CACHED_URLS) {
          // stop saving. blow the storage cache because
          // stringifying JSON and saving is slow
          this._dumpCache();
        } else {
          if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
          }
          const saveCache = () => {
            this.pendingTimeout = null;
            // If localStorage fills up, just blow it away.
            try {
              this.storage.setItem('octokat-cache', JSON.stringify(this.cachedETags));
            } catch (e) {
              this.cachedETags = {};
              this._dumpCache();
            }
          };
          this.pendingTimeout = setTimeout(saveCache, 5 * 1000);
        }

      }
    }
  }
}
