import {EventEmitter} from 'events';
import Client from './github-client';

const issueKey = (repoOwner, repoName, issueNumber) => {
  return repoOwner + '/' + repoName + '/issues/' + issueNumber;
};

let issues = {};

class Store extends EventEmitter {
  update(repoOwner, repoName, issueNumber, opts) {
    const issue = Client.getOcto().repos(repoOwner, repoName).issues(issueNumber);
    const key = issueKey(repoOwner, repoName, issueNumber);
    return issue.update(opts).then((val) => {
      issues[key] = val;
      this.emit('change', key, val);
      this.emit('change:' + key, val);
    });
  }
}

// export {issueKey};
export default new Store();
