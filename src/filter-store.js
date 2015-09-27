import _ from 'underscore';
import {EventEmitter} from 'events';

import SettingsStore from './settings-store';
import {filterCards} from './issue-store';

import {contains} from './helpers';

let userFilter = null;
let milestoneFilter = null;
let filteredLabels = [];

const filterReferencedCards = (graph, cards, isFilteringPullRequests) => {
  const allPossiblyRelatedCards = {};
  _.each(cards, (card) => {
    // XOR
    if (isFilteringPullRequests ? !card.issue.pullRequest : card.issue.pullRequest) {
      allPossiblyRelatedCards[graph.cardToKey(card)] = true;
    }
  });
  return _.filter(cards, (card) => {
    // XOR
    if (isFilteringPullRequests ? card.issue.pullRequest : !card.issue.pullRequest) {
      // loop through all the related PR's. If one matches, remove this issue
      const graphGet = isFilteringPullRequests ? graph.getB : graph.getA;
      const hasVisiblePullRequest = _.filter(graphGet.bind(graph)(graph.cardToKey(card)), ({vertex: otherCard}) => {
        if (allPossiblyRelatedCards[graph.cardToKey(otherCard)]) {
          return true;
        }
        return false;
      });
      return !hasVisiblePullRequest.length;
    } else {
      return true;
    }
  });
};


class Store extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  clearFilters() {
    userFilter = null;
    milestoneFilter = null;
    filteredLabels = [];
    this.emit('change');
  }
  clearUser() {
    userFilter = null;
    this.emit('change');
    this.emit('change:user', null);
  }
  setUser(user) {
    userFilter = user;
    this.emit('change');
    this.emit('change:user', user);
  }
  getUser() {
    return userFilter;
  }
  getMilestone() {
    return milestoneFilter;
  }
  setMilestone(milestone) {
    milestoneFilter = milestone;
    this.emit('change');
    this.emit('change:milestone', milestone);
  }
  addLabel(label) {
    const containsLabel = contains(filteredLabels, (l) => {
      return l.name === label.name;
    });
    if (!containsLabel) {
      filteredLabels.push(label);
      this.emit('change');
      this.emit('change:labels', filteredLabels);
    }
  }
  removeLabel(label) {
    filteredLabels = _.filter(filteredLabels, (l) => {
      return label.name !== l.name;
    });
    this.emit('change');
    this.emit('change:labels', filteredLabels);
  }
  getLabels() {
    return filteredLabels;
  }

  filterAndSort(graph, cards) {

    // Filter all the cards
    let filteredCards = cards;
    if (userFilter) {
      filteredCards = _.filter(filteredCards, (card) => {
        const issue = card.issue;
        if (issue.assignee && issue.assignee.login === userFilter.login) {
          return true;
        } else if (issue.user.login === userFilter.login) {
          return true;
        }
      });
    }
    if (milestoneFilter) {
      filteredCards = _.filter(filteredCards, (card) => {
        const issue = card.issue;
        if (issue.milestone && issue.milestone.title === milestoneFilter.title) {
          return true;
        }
      });
    }

    filteredCards = filterCards(filteredCards, this.getLabels());

    // Sort the cards by `updatedAt`
    let sortedCards = _.sortBy(filteredCards, (card) => {
      return card.issue.updatedAt;
    });
    // Reverse so newest ones are on top
    sortedCards.reverse();

    // Filter out any Issues that are associated with at least one Pull request in the list of cards
    if (!SettingsStore.getRelatedShowAll()) {
      const isFilteringPullRequests = SettingsStore.getRelatedHidePullRequests();
      sortedCards = filterReferencedCards(graph, sortedCards, isFilteringPullRequests);
    }
    return sortedCards;
  }
}

export default new Store();
