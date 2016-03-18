import SettingsStore from './settings-store';
import Client from './github-client';
import {getDataFromHtml} from './gfm-dom';
import Database from './database';

const MAX_LISTENERS = 5;

export default class Card {
  constructor(repoOwner, repoName, number, graph, issue, pr, prStatuses) {
    if (!repoOwner) { throw new Error('BUG! missing repoOwner'); }
    if (!repoName) { throw new Error('BUG! missing repoName'); }
    if (!number) { throw new Error('BUG! missing number'); }
    if (!graph) { throw new Error('BUG! missing graph'); }
    this.repoOwner = repoOwner;
    this.repoName = repoName;
    this.number = number;
    this.issue = issue;
    this._graph = graph;
    this._pr = pr;
    this._prStatuses = prStatuses;
    this._prPromise = pr ? Promise.resolve(pr) : null;
    this._prStatusesPromise = prStatuses ? Promise.resolve(prStatuses) : null;
    this._changeListeners = [];
  }
  key() {
    const {repoOwner, repoName, number} = this;
    return `${repoOwner}/${repoName}#${number}`;
  }
  onChange(listener) {
    const len = this._changeListeners.length;
    if (len > MAX_LISTENERS) {
      /*eslint-disable no-console */
      console.warn('MAX_LISTENERS reached. Maybe a bug?', len);
      /*eslint-enable no-console */
    }
    this._changeListeners.push(listener);
  }
  offChange(listener) {
    this._changeListeners = this._changeListeners.filter(item => item !== listener);
  }
  isPullRequest() {
    if (this.issue) {
      return !!this.issue.pullRequest;
    } else {
      return false;
    }
  }
  isPullRequestMerged() {
    return !! this.isPullRequest() && this._pr && this._pr.mergedAt;
  }
  hasMergeConflict() {
    if (this._pr) {
      if (this._pr.merged) { return false; }
      return !this._pr.mergeable;
    } else {
      return false; // return false for now just to be safe
    }
  }
  getPullRequestStatus() {
    if (!this._prStatuses) {
      return {};
    }
    // TODO: check when there are multiple statuses
    if (this._prStatuses.length) {
      return this._prStatuses[0];
    } else {
      return {};
    }
  }
  getRelated() {
    const key = this._graph.cardToKey(this);
    // return this._graph.getB(key).concat(this._graph.getA(key));
    return this._graph.getB(key);
  }
  getRelatedIssues() {
    return this._graph.getB(this._graph.cardToKey(this));
  }
  getRelatedPullRequests() {
    return this._graph.getA(this._graph.cardToKey(this));
  }
  getUpdatedAt() {
    if (this.isPullRequest() && !this._pr) {
      // TODO: Fetch the Pull Request Promise
    }
    if (this.isPullRequest() && this._pr) {
      return this._pr.updatedAt;
    } else {
      return this.issue.updatedAt;
    }
  }
  _getDataFromHtml() {
    if (this.__cachedHtmlBody !== this.issue.body) {
      this.__cachedHtmlData = getDataFromHtml(this.issue.body, this.repoOwner, this.repoName);
      this.__cachedHtmlBody = this.issue.body;
    }
    return this.__cachedHtmlData;
  }
  getTaskCounts() {
    return this._getDataFromHtml().taskCounts;
  }
  getDueAt() {
    return this._getDataFromHtml().dueAt;
  }
  // getRelatedIssues() {
  //   return getRelatedIssues(this.issue.body);
  // }
  getCommentCount() {
    let count = this.issue.comments;
    // include comments on code in the count
    if (this._pr) {
      count += this._pr.reviewComments;
    }
    return count;
  }
  _getOcto() {
    return Client.getOcto().repos(this.repoOwner, this.repoName);
  }
  fetchPR() {
    if (!this.isPullRequest()) { throw new Error('BUG! Should not be fetching PR for an Issue'); }
    if (!SettingsStore.getShowPullRequestData()) { return Promise.resolve('user selected not to show additional PR data'); }
    if (Client.getRateLimitRemaining() < Client.LOW_RATE_LIMIT) { return Promise.resolve('Rate limit low'); }
    if (!this._prPromise) {
      return this._prPromise = this._getOcto().pulls(this.number).fetch().then((pr) => {
        if (!pr.head) { throw new Error('BUG! PR from Octokat should be an object!'); }
        const isSame = this._pr && pr && JSON.stringify(this._pr) === JSON.stringify(pr);
        this._pr = pr;
        if (!isSame) {
          Database.putCard(this);
        }
        this._emitChange();
      });
    }
    return this._prPromise;
  }
  fetchPRStatuses() {
    if (!SettingsStore.getShowPullRequestData()) { return Promise.resolve('user selected not to show additional PR data'); }
    if (Client.getRateLimitRemaining() < Client.LOW_RATE_LIMIT) { return Promise.resolve('Rate limit low'); }
    return this.fetchPR().then(() => {
      if (!this._prStatusesPromise) {
        this._prStatusesPromise = this._getOcto().commits(this._pr.head.sha).statuses.fetchAll().then((statuses) => {
          const isSame = this._prStatuses && statuses && JSON.stringify(this._prStatuses) === JSON.stringify(statuses);
          this._prStatuses = statuses;
          if (!isSame) {
            Database.putCard(this);
          }
          this._emitChange();
        });
      }
    });
  }
  fetchIssue() {
    return this._getOcto().issues(this.number).fetch().then((issue) => {
      this.issue = issue;
      Database.putCard(this);
    });
  }
  resetPromisesAndState(issue) {
    if (!issue) {
      throw new Error('BUG: resetPromisesAndState requires an issue arg');
    }
    this.issue = issue;
    const {_pr, _prStatuses} = this; // squirrel so UI doesn't see blips
    delete this._prPromise;
    delete this._prStatusesPromise;
    if (_prStatuses) {
      this.fetchPRStatuses(); // Trigger fetching PR and status
    } else if (_pr) {
      this.fetchPR(); // Trigger fetching PR
    } else {
      this._emitChange();
    }
  }
  _emitChange() {
    this._changeListeners.forEach(function (listener) {
      listener();
    });
  }
  isLoaded() {
    if (!this.issue) { return false; }
    if (SettingsStore.getShowPullRequestData() && this.isPullRequest()) {
      // Check if the statuses are loaded
      return !!this._prStatuses;
    }
    return true; // It is an issue and is loaded
  }
  load() {
    if (this.issue) {
      if (this.isPullRequest()) {
        return Promise.all([this.fetchIssue(), this.fetchPRStatuses()]);
      } else {
        return this.fetchIssue(); // fetch it again
      }
    } else {
      return this.fetchIssue();
    }
  }
}
