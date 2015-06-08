import Octo from "octokat";

class Client {
  getCredentials() {
    return {
      token: window.localStorage.getItem("gh-token"),
      username: window.localStorage.getItem("gh-username"),
      password: window.localStorage.getItem("gh-password")
    };
  }
  hasCredentials() {
    let {token, password} = this.getCredentials();
    return !!token || !!password;
  }
  getOcto() {
    let credentials = this.getCredentials();
    return new Octo(credentials);
  }
  readMessage() {
    return this.getOcto().zen.read();
  }

  setToken(token) {
    if (token) {
      window.localStorage.setItem("gh-token", token);
    } else {
      window.localStorage.removeItem("gh-token");
    }
  }
}

// Singleton
export default new Client();
