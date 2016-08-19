import _ from 'underscore';
import {EventEmitter} from 'events';

import SettingsStore from './settings-store';
// import {filterCards} from './issue-store';

import {contains} from './helpers';

let userFilter = null;
let filteredMilestones = [];
let filteredLabels = [];

const filterReferencedCards = (cards, isFilteringPullRequests) => {
  const allPossiblyRelatedCards = {};
  _.each(cards, (card) => {
    // XOR
    if (isFilteringPullRequests ? !card.isPullRequest() : card.isPullRequest()) {
      allPossiblyRelatedCards[card.key()] = true;
    }
  });
  return _.filter(cards, (card) => {
    // XOR
    if (isFilteringPullRequests ? card.isPullRequest() : !card.isPullRequest()) {
      // loop through all the related PR's. If one matches, remove this issue
      let related = [];
      if (isFilteringPullRequests &&  card.isPullRequest()) {
        related = card.getRelated().filter(({vertex}) => { return !vertex.isPullRequest(); });
      } else if (!isFilteringPullRequests && !card.isPullRequest()) {
        related = card.getRelated().filter(({vertex}) => { return vertex.isPullRequest(); });
      }
      const hasVisiblePullRequest = _.filter(related, ({vertex: otherCard}) => {
        if (allPossiblyRelatedCards[otherCard.key()]) {
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
  // clearFilters() {
  //   userFilter = null;
  //   filteredMilestones = [];
  //   filteredLabels = [];
  //   this.emit('change');
  // }
  // clearUser() {
  //   userFilter = null;
  //   this.emit('change');
  //   this.emit('change:user', null);
  // }
  setUser(user) {
    userFilter = user;
    this.emit('change');
    this.emit('change:user', user);
  }
  getUser() {
    return userFilter;
  }
  getMilestones() {
    return filteredMilestones;
  }
  toggleMilestone(milestone) {
    const index = _.findIndex(filteredMilestones, (ms) => {
      return milestone.title === ms.title;
    });
    if (index >= 0) {
      // Remove the milestone from the list
      filteredMilestones.splice(index, 1);
    } else {
      filteredMilestones.push(milestone);
    }
    this.emit('change');
    this.emit('change:milestone', milestone);
  }
  clearMilestoneFilter() {
    filteredMilestones = [];
    this.emit('change');
  }
  setMilestones(milestones) {
    filteredMilestones = milestones;
    this.emit('change');
  }
  isMilestoneIncluded(milestone) {
    if (!filteredMilestones.length) {
      return true;
    }
    return !!_.filter(filteredMilestones, (ms) => {
      return ms.title === milestone.title;
    })[0];
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

  filterAndSort(cards) {

    // Filter all the cards
    let filteredCards = cards;
    // if (userFilter) {
    //   filteredCards = _.filter(filteredCards, (card) => {
    //     const issue = card.issue;
    //     if (issue.assignee && issue.assignee.login === userFilter.login) {
    //       return true;
    //     } else if (issue.user.login === userFilter.login) {
    //       return true;
    //     }
    //   });
    // }
    // if (filteredMilestones.length) {
    //   filteredCards = _.filter(filteredCards, (card) => {
    //     const issue = card.issue;
    //     if (isShowingMilestones && !issue.milestone) {
    //       return true;
    //     }
    //     // Check if any of the milestones match
    //     if (issue.milestone && this.isMilestoneIncluded(issue.milestone)) {
    //       return true;
    //     }
    //   });
    // }
    //
    // filteredCards = filterCards(filteredCards, this.getLabels());

    // Sort the cards by `dueAt` and then by `updatedAt` (if `dueAt` does not exist)
    let sortedCards = filteredCards.sort((a, b) => {
      if (a.getDueAt() && b.getDueAt()) {
        return a.getDueAt() - b.getDueAt();
      } else if (a.getDueAt()) {
        return -1;
      } else if (b.getDueAt()) {
        return 1;
      } else {
        // newest on top
        return Date.parse(b.getUpdatedAt()) - Date.parse(a.getUpdatedAt());
      }
    });

    // Filter out any Issues that are associated with at least one Pull request in the list of cards
    if (!SettingsStore.getRelatedShowAll()) {
      const isFilteringPullRequests = SettingsStore.getRelatedHidePullRequests();
      sortedCards = filterReferencedCards(sortedCards, isFilteringPullRequests);
    }
    return sortedCards;
  }
}

export default new Store();
