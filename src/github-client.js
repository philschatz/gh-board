import EventEmitter from 'events';
import Octo from 'octokat';

let cachedClient = null;

class Client extends EventEmitter {
  getCredentials() {
    return {
      token: window.localStorage.getItem('gh-token'),
      username: window.localStorage.getItem('gh-username'),
      password: window.localStorage.getItem('gh-password')
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
    }
    return cachedClient;
  }
  readMessage() {
    return this.getOcto().zen.read();
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
