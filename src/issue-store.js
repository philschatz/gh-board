import _ from 'underscore';
import {EventEmitter} from 'events';
import Client from './github-client';
import {fetchAll, KANBAN_LABEL, ICEBOX_NAME} from './helpers';

const RELOAD_TIME = 60 * 1000;

const toIssueListKey = (repoOwner, repoName) => {
  return repoOwner + '/' + repoName + '/issues';
};
const toIssueKey = (repoOwner, repoName, issueNumber) => {
  return repoOwner + '/' + repoName + '/issues/' + issueNumber;
};
const toCommentListKey = (repoOwner, repoName, issueNumber) => {
  return repoOwner + '/' + repoName + '/issues/' + issueNumber + '/comments';
};
const toCommentKey = (repoOwner, repoName, issueNumber, commentId) => {
  return repoOwner + '/' + repoName + '/issues/' + issueNumber + '/comments/' + commentId;
};

let cacheIssues = {};
let cacheLastViewed = {};
const initialTimestamp = new Date();

class IssueStore extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  fetch(repoOwner, repoName, issueNumber) {
    const issue = Client.getOcto().repos(repoOwner, repoName).issues(issueNumber);
    const key = toIssueKey(repoOwner, repoName, issueNumber);
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
  fetchPullRequest(repoOwner, repoName, issueNumber) {
    const issue = Client.getOcto().repos(repoOwner, repoName).pulls(issueNumber);
    const key = toIssueKey(repoOwner, repoName, issueNumber);
    return issue.fetch()
    // .then((val) => {
    //   cacheIssues[key] = val;
    //   this.emit('change', key, val);
    //   this.emit('change:' + key, val);
    //   return val;
    // });
  }
  fetchAll(repoOwner, repoName) {
    const listKey = toIssueListKey(repoOwner, repoName);
    // Start polling
    if (!this.polling) {
      this.polling = setTimeout(() => {
        this.polling = null;
        this.fetchAll(repoOwner, repoName, true);
      }, RELOAD_TIME);
    }
    if (cacheIssues[listKey]) {
      return Promise.resolve(cacheIssues[listKey]);
    } else {
      const issues = Client.getOcto().repos(repoOwner, repoName).issues.fetch;
      return fetchAll(issues)
      .then((vals) => {
        cacheIssues[listKey] = vals;
        for (let issue of vals) {
          const issueNumber = issue.number;
          const key = toIssueKey(repoOwner, repoName, issueNumber);
          cacheIssues[key] = issue;
        }
        this.emit('change:' + listKey, vals);
        return vals;
      });
    }
  }
  update(repoOwner, repoName, issueNumber, opts) {
    const issue = Client.getOcto().repos(repoOwner, repoName).issues(issueNumber);
    const listKey = toIssueListKey(repoOwner, repoName);
    const key = toIssueKey(repoOwner, repoName, issueNumber);
    return issue.update(opts)
    .then((val) => {
      cacheIssues[key] = val;
      // invalidate the issues list
      delete cacheIssues[listKey];
      // this.emit('change', toIssueListKey(repoOwner, repoName));
      // this.emit('change', key, val);
      this.emit('change:' + key, val);
    });
  }
  move(repoOwner, repoName, issueNumber, newLabel) {
    // Find all the labels, remove the kanbanLabel, and add the new label
    const key = toIssueKey(repoOwner, repoName, issueNumber);
    const listKey = toIssueListKey(repoOwner, repoName);
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
  createLabel(repoOwner, repoName, opts) {
    return Client.getOcto().repos(repoOwner, repoName).labels.create(opts);
  }
  fetchComments(repoOwner, repoName, issueNumber) {
    const commentListKey = toCommentListKey(repoOwner, repoName, issueNumber);
    if (cacheIssues[commentListKey]) {
      return Promise.resolve(cacheIssues[commentListKey]);
    } else {
      return Client.getOcto().repos(repoOwner, repoName).issues(issueNumber).comments.fetch()
      .then((comments) => {
        cacheIssues[commentListKey] = comments;
        this.emit('change:' + commentListKey);
        return comments;
      });
    }
  }
  createComment(repoOwner, repoName, issueNumber, opts) {
    const listKey = toCommentListKey(repoOwner, repoName, issueNumber);
    const issueKey = toIssueKey(repoOwner, repoName, issueNumber);
    const issue = Client.getOcto().repos(repoOwner, repoName).issues(issueNumber);
    return issue.comments.create(opts)
    .then((val) => {
      const commentNumber = val.id;
      const key = toCommentKey(repoOwner, repoName, issueNumber, commentNumber);
      cacheIssues[key] = val;
      // invalidate the issues list
      delete cacheIssues[listKey];
      delete cacheIssues[issueKey];
      this.emit('change', issueKey);
      // this.emit('change', key, val);
      this.emit('change:' + key, val);
    });
  }
  setLastViewed(repoOwner, repoName, issue) {
    const issueKey = toIssueKey(repoOwner, repoName, issue.number);
    const now = new Date();
    const isNew = !cacheLastViewed[issueKey] || (now.getTime() - cacheLastViewed[issueKey].getTime() > 10000);
    cacheLastViewed[issueKey] = now;
    if (isNew) {
      this.emit('change:' + issueKey, issue);
    }
  }
  getLastViewed(repoOwner, repoName, issueNumber) {
    const issueKey = toIssueKey(repoOwner, repoName, issueNumber);
    return cacheLastViewed[issueKey] || initialTimestamp;
  }
}

const Store = new IssueStore();
export {toIssueKey, toIssueListKey, Store};
