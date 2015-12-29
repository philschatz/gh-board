import SettingsStore from './settings-store';
import Client from './github-client';
import {getTaskCounts} from './gfm-dom';

const MAX_LISTENERS = 5;

export default class Card {
  constructor(repoOwner, repoName, number, graph, issue) {
    if (!repoOwner) { throw new Error('BUG! missing repoOwner'); }
    if (!repoName) { throw new Error('BUG! missing repoName'); }
    if (!number) { throw new Error('BUG! missing number'); }
    if (!graph) { throw new Error('BUG! missing graph'); }
    this.repoOwner = repoOwner;
    this.repoName = repoName;
    this.number = number;
    this.issue = issue;
    this._graph = graph;
    this._pr = null;
    this._prPromise = null;
    this._changeListeners = [];
  }
  key() {
    const {repoOwner, repoName, number} = this;
    return `${repoOwner}/${repoName}#${number}`;
  }
  onChange(listener, context) {
    const len = this._changeListeners.length;
    if (len > MAX_LISTENERS) {
      console.warn('MAX_LISTENERS reached. Maybe a bug?', len);
    }
    this._changeListeners.push(listener);
  }
  offChange(listener) {
    this._changeListeners = this._changeListeners.filter(item => item !== listener);
  }
  isPullRequest() {
    return !!this.issue.pullRequest;
  }
  isPullRequestMergeable() {
    if (this._pr) {
      return this._pr.mergeable || this._pr.mergedAt;
    } else {
      return false; // return false for now just to be safe
    }
  }
  getPullRequestStatus() {
    if (!this._prStatuses) {
      return null;
    }
    // TODO: check when there are multiple statuses
    if (this._prStatuses.length) {
      return this._prStatuses[0].state;
    } else {
      return null;
    }
  }
  getRelated() {
    const key = this._graph.cardToKey(this);
    return this._graph.getB(key).concat(this._graph.getA(key));
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
  getTaskCounts() {
    if (!this._taskCounts) {
      this._taskCounts = getTaskCounts(this.issue.body);
    }
    return this._taskCounts;
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
        this._pr = pr;
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
        this._prStatusesPromise = this._getOcto().commits(this._pr.head.sha).statuses.fetch().then((statuses) => {
          this._prStatuses = statuses;
          this._emitChange();
        });
      }
    });
  }
  fetchIssue() {
    return this._getOcto().issues(this.number).fetch().then((issue) => {
      this.issue = issue;
    });
  }
  resetPromisesAndState(issue) {
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
    if (this.isPullRequest()) {
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
