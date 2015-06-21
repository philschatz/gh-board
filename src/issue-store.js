import _ from 'underscore';
import {EventEmitter} from 'events';
import Client from './github-client';
import {fetchAll, KANBAN_LABEL, ICEBOX_NAME} from './helpers';

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
  move(repoOwner, repoName, issueNumber, newLabel) {
    // Find all the labels, remove the kanbanLabel, and add the new label
    const key = issueKey(repoOwner, repoName, issueNumber);
    const listKey = issueListKey(repoOwner, repoName);
    const issue = cacheIssues[key];
    // Exclude Kanban labels
    const labels = _.filter(issue.labels, (label) => {
      if (ICEBOX_NAME === label.name || KANBAN_LABEL.test(label.name)) {
        return false;
      }
      return true;
    });
    const labelNames = _.map(labels);
    // When moving back to icebox do not add a new label
    if (ICEBOX_NAME !== newLabel.name) {
      labelNames.push(newLabel.name);
    }

    return Client.getOcto().repos(repoOwner, repoName).issues(issueNumber).update({labels: labelNames})
    .then(() => {

      // invalidate the issues list
      delete cacheIssues[listKey];
      this.emit('change');
      this.emit('change:' + key);
      this.emit('change:' + listKey);
    });
  }
}

const Store = new IssueStore();
export {issueKey, Store};
