import {EventEmitter} from 'events';
import Client from './github-client';
import {fetchAll} from './helpers';

const issueListKey = (repoOwner, repoName) => {
  return repoOwner + '/' + repoName + '/issues';
};
const issueKey = (repoOwner, repoName, issueNumber) => {
  return repoOwner + '/' + repoName + '/issues/' + issueNumber;
};

let cacheIssues = {};

class IssueStore extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  fetch(repoOwner, repoName, issueNumber) {
    const issue = Client.getOcto().repos(repoOwner, repoName).issues(issueNumber);
    const key = issueKey(repoOwner, repoName, issueNumber);
    if (cacheIssues[key]) {
      return Promise.resolve(cacheIssues[key]);
    } else {
      return issue.fetch()
      .then((val) => {
        cacheIssues[key] = val;
        this.emit('change', key, val);
        this.emit('change:' + key, val);
        return val;
      });
    }
  }
  fetchAll(repoOwner, repoName) {
    const listKey = issueListKey(repoOwner, repoName);
    if (cacheIssues[listKey]) {
      return Promise.resolve(cacheIssues[listKey]);
    } else {
      const issues = Client.getOcto().repos(repoOwner, repoName).issues.fetch;
      return fetchAll(issues)
      .then((vals) => {
        cacheIssues[listKey] = vals;
        for (let issue of vals) {
          const issueNumber = issue.number;
          const key = issueKey(repoOwner, repoName, issueNumber);
          cacheIssues[key] = issue;
        }
        this.emit('change:' + listKey, vals);
        return vals;
      });
    }
  }
  update(repoOwner, repoName, issueNumber, opts) {
    const issue = Client.getOcto().repos(repoOwner, repoName).issues(issueNumber);
    const listKey = issueListKey(repoOwner, repoName);
    const key = issueKey(repoOwner, repoName, issueNumber);
    return issue.update(opts)
    .then((val) => {
      cacheIssues[key] = val;
      // invalidate the issues list
      delete cacheIssues[listKey];
      // this.emit('change', issueListKey(repoOwner, repoName));
      // this.emit('change', key, val);
      this.emit('change:' + key, val);
    });
  }
}

const Store = new IssueStore();
export {issueKey, Store};
