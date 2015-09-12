import _ from 'underscore';
import EventEmitter from 'events';
import Octo from 'octokat';

let cachedClient = null;

const cacheHandler = new class CacheHandler {
  constructor() {
    // Pull data from `sessionStorage`
    this.storage = window.sessionStorage;
    const cache = this.storage.getItem('octokat-cache');
    if (cache) {
      this.cachedETags = JSON.parse(cache);
    } else {
      this.cachedETags = {};
    }
  }
  get(method, path) {
    const ret = this.cachedETags[method + ' ' + path];
    if (ret) {
      const {data, linkRelations} = ret;
      _.each(linkRelations, (value, key) => {
        data[key] = value;
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
        linkRelations[key] = data[key];
      });
    }

    this.cachedETags[method + ' ' + path] = {eTag, data, status, linkRelations};
    if (Object.keys(this.cachedETags).length > 100) {
      // stop saving. blow the storage cache because
      // stringifying JSON and saving is slow
      this.storage.removeItem('octokat-cache');
    } else {
      // If sessionStorage fills up, just blow it away.
      try {
        this.storage.setItem('octokat-cache', JSON.stringify(this.cachedETags));
      } catch (e) {
        this.cachedETags = {};
        this.storage.removeItem('octokat-cache');
      }
    }
  }
};

class Client extends EventEmitter {
  constructor() {
    super();
    this.LOW_RATE_LIMIT = 10;
  }
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  getCredentials() {
    return {
      token: window.localStorage.getItem('gh-token'),
      username: window.localStorage.getItem('gh-username'),
      password: window.localStorage.getItem('gh-password'),
      cacheHandler,
      emitter: this
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
      this.on('request', (rateLimitRemaining) => {
        this.rateLimitRemaining = rateLimitRemaining;
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
