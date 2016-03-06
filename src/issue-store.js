import _ from 'underscore';
import {EventEmitter} from 'events';
import Client from './github-client';
import BipartiteGraph from './bipartite-graph';
import {getRelatedIssues} from './gfm-dom';
import {getFilters, filterCardsByFilter} from './route-utils';
import {fetchAll, FETCHALL_MAX, contains, KANBAN_LABEL, UNCATEGORIZED_NAME} from './helpers';
import Card from './card-model';

const RELOAD_TIME_SHORT = 30 * 1000;
const RELOAD_TIME_LONG = 5 * 60 * 1000;

const toIssueKey = (repoOwner, repoName, number) => {
  return `${repoOwner}/${repoName}#${number}`;
};

function getReloadTime() {
  if (document.hidden) {
    return RELOAD_TIME_LONG;
  } else {
    return RELOAD_TIME_SHORT;
  }
}

let GRAPH_CACHE = new BipartiteGraph();
let CARD_CACHE = {};
const cardFactory = (repoOwner, repoName, number, issue) => {
  const key = toIssueKey(repoOwner, repoName, number);
  let card = CARD_CACHE[key];
  if (card && issue) {
    card.resetPromisesAndState(issue);
    return card;
  } else if (card) {
    return card;
  } else {
    card = new Card(repoOwner, repoName, number, GRAPH_CACHE, issue);
    CARD_CACHE[key] = card;
    return card;
  }
};

export function filterCards(cards, labels) {
  let filtered = cards;
  // Curry the fn so it is not declared inside a loop
  const filterFn = (label) => (card) => {
    const containsLabel = contains(card.issue.labels, (cardLabel) => {
      return cardLabel.name === label.name;
    });
    if (containsLabel) {
      return true;
    } else if (UNCATEGORIZED_NAME === label.name) {
      // If the issue does not match any list then add it to the backlog
      for (const l of card.issue.labels) {
        if (KANBAN_LABEL.test(l.name)) {
          return false;
        }
      }
      // no list labels, so include it in the backlog
      return true;
    }
  };
  for (const i in labels) {
    const label = labels[i];
    filtered = _.filter(filtered, filterFn(label));
    if (filtered.length === 0) {
      return [];
    }
  }
  return filtered;
}

function _buildBipartiteGraph(graph, cards) {
  const allPullRequests = {};
  const allIssues = {};

  _.each(cards, (card) => {
    const cardPath = graph.cardToKey(card);
    if (card.issue.pullRequest) {
      // card is a Pull Request
      allPullRequests[cardPath] = card;
    } else {
      // or card is an Issue
      allIssues[cardPath] = card;
    }
  });

  _.each(cards, (card) => {
    const cardPath = GRAPH_CACHE.cardToKey(card);
    const relatedIssues = getRelatedIssues(card.issue.body, card.repoOwner, card.repoName);
    // NEW FEATURE: Show **all** related Issues/PR's (the graph is no longer bipartite)
    // TODO: Refactor to simplify this datastructure
    //if (card.issue.pullRequest) {
      // card is a Pull Request
      _.each(relatedIssues, ({repoOwner, repoName, number, fixes}) => {
        const otherCardPath = GRAPH_CACHE.cardToKey({repoOwner, repoName, issue: {number}});
        const otherCard = allIssues[otherCardPath] || allPullRequests[otherCardPath];
        if (otherCard) {
          GRAPH_CACHE.addEdge(otherCardPath, cardPath, otherCard, card, fixes);
        }
      });
    //}
  });
}

let cacheCardsRepoInfos = null;
let cacheCards = null;
let isPollingEnabled = false;

class IssueStore extends EventEmitter {
  constructor() {
    super();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        clearTimeout(this.polling);
        delete this.polling;
        if (isPollingEnabled) {
          this.fetchIssues(); // start Polling again
        }
      }
    });
  }
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  clearCacheCards() {
    cacheCards = null;
    cacheCardsRepoInfos = null;
    CARD_CACHE = {};
    GRAPH_CACHE = new BipartiteGraph();
  }
  stopPolling() {
    isPollingEnabled = false;
  }
  startPolling() {
    isPollingEnabled = true;
  }
  issueNumberToCard(repoOwner, repoName, number, issue=null) {
    if (!(repoOwner && repoName && number)) {
      throw new Error('BUG! Forgot to pass arguments in');
    }
    return cardFactory(repoOwner, repoName, number, issue);
  }
  issueToCard(repoOwner, repoName, issue) {
    if (!(repoOwner && repoName && issue)) {
      throw new Error('BUG! Forgot to pass arguments in');
    }
    return cardFactory(repoOwner, repoName, issue.number, issue);
  }
  // Fetch all the issues and then filter based on the URL
  fetchIssues() {
    const {repoInfos} = getFilters().getState();
    return this._fetchAllIssues(repoInfos).then((cards) => {
      return filterCardsByFilter(cards);
    });
  }
  _fetchAllIssuesForRepo(repoOwner, repoName) {
    const issues = Client.getOcto().repos(repoOwner, repoName).issues.fetch;
    return fetchAll(FETCHALL_MAX, issues)
    .then((vals) => {
      return _.map(vals, (issue) => {
        return this.issueNumberToCard(repoOwner, repoName, issue.number, issue, GRAPH_CACHE);
      });
    });
  }
  _fetchAllIssues(repoInfos, isForced) {
    // Start/keep polling
    if (!this.polling && isPollingEnabled) {
      this.polling = setTimeout(() => {
        this.polling = null;
        this._fetchAllIssues(repoInfos, true /*isForced*/);
      }, getReloadTime());
    }
    if (!isForced && cacheCards && cacheCardsRepoInfos === JSON.stringify(repoInfos)) {
      return Promise.resolve(cacheCards);
    }
    const explicitlyListedRepos = {};
    repoInfos.forEach(({repoOwner, repoName}) => {
      if (repoName !== '*') {
        explicitlyListedRepos[`${repoOwner}/${repoName}`] = true;
      }
    });

    const allPromises = _.map(repoInfos, ({repoOwner, repoName}) => {
      if (repoName === '*') {
        // Fetch all the repos, and then concat them
        return fetchAll(FETCHALL_MAX, Client.getOcto().orgs(repoOwner).repos.fetch)
        .then((repos) => {
          return Promise.all(repos.map((repo) => {
            // Exclude repos that are explicitly listed (usually only the primary repo is listed so we know where to pull milestones/labesl from)
            if (explicitlyListedRepos[`${repoOwner}/${repo.name}`]) {
              return null;
            }
            return this._fetchAllIssuesForRepo(repoOwner, repo.name);
          }));
        })
        .then((issuesByRepo) => {
          // exclude the null repos (ones that were explicitly listed in the URL)
          return _.flatten(_.filter(issuesByRepo, (v) => { return v; }), true/*shallow*/);
        });
      } else {
        return this._fetchAllIssuesForRepo(repoOwner, repoName);
      }
    });
    return Promise.all(allPromises).then((issues) => {
      const cards = _.flatten(issues, true /*shallow*/);

      _buildBipartiteGraph(GRAPH_CACHE, cards);

      cacheCards = cards;
      cacheCardsRepoInfos = JSON.stringify(repoInfos);
      if (isForced) {
        this.emit('change');
      }
      return cards;
    });
  }
  fetchMilestones(repoOwner, repoName) {
    return Client.getOcto().repos(repoOwner, repoName).milestones.fetch();
  }
  fetchLabels(repoOwner, repoName) {
    return Client.getOcto().repos(repoOwner, repoName).labels.fetch();
  }
  tryToMoveLabel(card, primaryRepoName, label) {
    this.emit('tryToMoveLabel', card, primaryRepoName, label);
  }
  tryToMoveMilestone(card, primaryRepoName, milestone) {
    this.emit('tryToMoveMilestone', card, primaryRepoName, milestone);
  }
  moveLabel(repoOwner, repoName, issue, newLabel) {
    // Find all the labels, remove the kanbanLabel, and add the new label
    // Exclude Kanban labels
    const labels = _.filter(issue.labels, (label) => {
      if (UNCATEGORIZED_NAME === label.name || KANBAN_LABEL.test(label.name)) {
        return false;
      }
      return true;
    });
    const labelNames = _.map(labels);
    // When moving back to uncategorized do not add a new label
    if (UNCATEGORIZED_NAME !== newLabel.name) {
      labelNames.push(newLabel.name);
    }

    return Client.getOcto().repos(repoOwner, repoName).issues(issue.number).update({labels: labelNames})
    .then(() => {

      // invalidate the issues list
      cacheCards = null;
      this.emit('change');
    });
  }
  moveMilestone(repoOwner, repoName, issue, newMilestone) {
    // TODO: Check if the milestone exists. If not, create it

    Client.getOcto().repos(repoOwner, repoName).milestones.fetch()
    .then((milestones) => {
      // Find the milestone with a matching Title
      const matchingMilestone = _.filter(milestones, (milestone) => {
        return milestone.title === newMilestone.title;
      })[0];

      return Client.getOcto().repos(repoOwner, repoName).issues(issue.number).update({milestone: matchingMilestone.number})
      .then(() => {

        // invalidate the issues list
        cacheCards = null;
        this.emit('change');
      });

    });

  }
  createLabel(repoOwner, repoName, opts) {
    return Client.getOcto().repos(repoOwner, repoName).labels.create(opts);
  }
}

export default new IssueStore();
