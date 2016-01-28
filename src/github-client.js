import _ from 'underscore';
import EventEmitter from 'events';
import Octo from 'octokat/dist/node/base';
import SimpleVerbsPlugin from 'octokat/dist/node/plugins/simple-verbs';
import NativePromiseOnlyPlugin from 'octokat/dist/node/plugins/promise/native-only';
import AuthorizationPlugin from 'octokat/dist/node/plugins/authorization';
import CamelCasePlugin from 'octokat/dist/node/plugins/camel-case';
import CacheHandlerPlugin from 'octokat/dist/node/plugins/cache-handler';

const MAX_CACHED_URLS = 2000;

let cachedClient = null;

const cacheHandler = new class CacheHandler {
  constructor() {
    // Pull data from `localStorage`
    this.storage = window.localStorage;
    const cache = this.storage.getItem('octokat-cache');
    if (cache) {
      this.cachedETags = JSON.parse(cache);
    } else {
      this.cachedETags = {};
    }
    // Async save once now new JSON has been fetched after X seconds
    this.pendingTimeout = null;
  }
  _dumpCache() {
    console.log('github-client: Dumping localStorage cache because it is too big');
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
};

class Client extends EventEmitter {
  constructor() {
    super();
    this.LOW_RATE_LIMIT = 60;
  }
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  getCredentials() {
    return {
      plugins: [SimpleVerbsPlugin, NativePromiseOnlyPlugin, AuthorizationPlugin, CamelCasePlugin, CacheHandlerPlugin],
      token: window.localStorage.getItem('gh-token'),
      username: window.localStorage.getItem('gh-username'),
      password: window.localStorage.getItem('gh-password'),
      cacheHandler,
      emitter: this.emit.bind(this)
    };
  }
  hasCredentials() {
    let {token, password} = this.getCredentials();
    return !!token || !!password;
  }
  getOcto() {
    if (!cachedClient) {
      let credentials = this.getCredentials();
      cachedClient = new Octo(credentials);
      // update the rateLimit for issue-store so it can gracefully back off
      // making requests when the rate limit is low
      this.on('request', ({rate: {remaining}}) => {
        this.rateLimitRemaining = remaining;
      });
    }
    return cachedClient;
  }
  readMessage() {
    return this.getOcto().zen.read();
  }
  getRateLimitRemaining() {
    return this.rateLimitRemaining;
  }

  setToken(token) {
    cachedClient = null;
    if (token) {
      window.localStorage.setItem('gh-token', token);
    } else {
      window.localStorage.removeItem('gh-token');
    }
    this.emit('changeToken');
  }
}

// Singleton
export default new Client();
