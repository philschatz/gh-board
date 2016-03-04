import {EventEmitter} from 'events';
import Client from './github-client';

const RELOAD_TIME = 10 * 60 * 1000;

class NewVersionChecker extends EventEmitter {
  constructor() {
    super();
    this.checkForNewVersion();
  }
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  checkForNewVersion() {
    // Start/keep polling
    if (!this.polling) {
      this.polling = setTimeout(() => {
        this.polling = null;
        this.checkForNewVersion();
      }, RELOAD_TIME);
    }

    return Client.getOcto().repos('philschatz/gh-board').branches('gh-pages').fetch().then((branch) => {
      const {sha} = branch.commit;
      const {date} = branch.commit.commit.author;
      const {message} = branch.commit.commit;

      if (!this.loadedVersion) {
        this.loadedVersion = {sha, date};
      } else {
        if (this.loadedVersion.sha !== sha) {
          this.newestVersion = {sha, date, message};
          this.emit('change', this.newestVersion);
        }
      }
      return {sha, date, message};
    });
  }
}

export default new NewVersionChecker();
