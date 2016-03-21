import _ from 'underscore';
import {EventEmitter} from 'events';
import Client from './github-client';
import BipartiteGraph from './bipartite-graph';
import {getFilters, filterCardsByFilter} from './route-utils';
import {contains, KANBAN_LABEL, UNCATEGORIZED_NAME} from './helpers';
import Card from './card-model';
import Progress from './progress';
import Database from './database';

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
const cardFactory = (repoOwner, repoName, number, issue, pr=null, prStatuses=null) => {
  const key = toIssueKey(repoOwner, repoName, number);
  let card = CARD_CACHE[key];
  if (card && issue) {
    card.resetPromisesAndState(issue);
    return card;
  } else if (card) {
    return card;
  } else {
    card = new Card(repoOwner, repoName, number, GRAPH_CACHE, issue, pr, prStatuses);
    _buildBipartiteGraph(GRAPH_CACHE, [card]);
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
    if (card.isPullRequest()) {
      // card is a Pull Request
      allPullRequests[cardPath] = card;
    } else {
      // or card is an Issue
      allIssues[cardPath] = card;
    }
  });

  _.each(cards, (card) => {
    const cardPath = GRAPH_CACHE.cardToKey(card);
    if (card.issue) { // If an issue refers to some random repo then card.issue might be null
      const relatedIssues = card.getRelatedIssuesFromBody();
      // NEW FEATURE: Show **all** related Issues/PR's (the graph is no longer bipartite)
      // TODO: Refactor to simplify this datastructure
      //if (card.issue.pullRequest) {
        // card is a Pull Request
        _.each(relatedIssues, ({repoOwner, repoName, number, fixes}) => {
          const otherCardPath = GRAPH_CACHE.cardToKey({repoOwner, repoName, issue: {number}});
          const otherCard = issueStore.issueNumberToCard(repoOwner, repoName, number);
          if (otherCard) {
            GRAPH_CACHE.addEdge(otherCardPath, cardPath, otherCard, card, fixes);
          }
        });
      //}
    }
  });
}

let cacheCardsRepoInfos = null;
let cacheCards = null;
let isPollingEnabled = false;

const issueStore = new class IssueStore extends EventEmitter {
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
  issueNumberToCard(repoOwner, repoName, number, issue=null, pr=null, prStatuses=null) {
    if (!(repoOwner && repoName && number)) {
      throw new Error('BUG! Forgot to pass arguments in');
    }
    return cardFactory(repoOwner, repoName, number, issue, pr, prStatuses);
  }
  issueToCard(repoOwner, repoName, issue) {
    if (!(repoOwner && repoName && issue)) {
      throw new Error('BUG! Forgot to pass arguments in');
    }
    return cardFactory(repoOwner, repoName, issue.number, issue);
  }
  // Fetch all the issues and then filter based on the URL
  fetchIssues(progress) {
    const {repoInfos} = getFilters().getState();
    if (!progress) {
      // If no progress is passed in then just use a dummy progress
      progress = new Progress();
    }
    return Client.dbPromise().then(() => this._fetchAllIssues(repoInfos, progress).then((cards) => {
      return filterCardsByFilter(cards);
    }));
  }
  _fetchAllIssuesForRepo(repoOwner, repoName, progress) {
    progress.addTicks(1, `Fetching Issues for ${repoOwner}/${repoName}`);
    const issuesState = Client.canCacheLots() ? 'all' : 'open';
    return Client.getOcto().repos(repoOwner, repoName).issues.fetchAll({state: issuesState, per_page: 100, sort: 'updated'})
    .then((vals) => {
      progress.tick(`Fetched Issues for ${repoOwner}/${repoName}`);
      return vals.map((issue) => {
        return this.issueNumberToCard(repoOwner, repoName, issue.number, issue);
      });
    });
  }
  _fetchLastSeenUpdatesForRepo(repoOwner, repoName, progress, lastSeenAt, isPrivate) {
    const opts = {
      per_page: 100,
      sort: 'updated',
      direction: 'desc'
    };
    if (lastSeenAt) {
      opts.since = lastSeenAt;
    }
    let fetchPromise;
    if (Client.canCacheLots()) {
      opts.state = 'all'; // fetch opened and closed Issues
      fetchPromise = Client.getOcto().repos(repoOwner, repoName).issues.fetchAll(opts);
    } else {
      fetchPromise = Client.getOcto().repos(repoOwner, repoName).issues.fetch(opts).then(({items}) => {
        // fetch() yields `{ items: [...] }` while fetchAll() yields `[...]`
        // so unwrap.
        return items;
      });
    }
    return fetchPromise
    .then((items) => {
      progress.tick(`Fetched Updates for ${repoOwner}/${repoName}`);
      let newLastSeenAt;
      if (items.length) {
        newLastSeenAt = items[0].updatedAt;
      } else {
        // If a repository has 0 events it probably has not changed in a while
        // or never had any commits. Do not keep trying to fetch all the Issues though
        // so set the lastSeenAt to be something non-zero
        // since falsy means gh-board has not fetched all the Issuese before.
        newLastSeenAt = null;
      }
      let cards = items.map((issue) => {
        if (lastSeenAt === issue.updatedAt) {
          // If this Issue was updated at the same time then ignore it
          // TODO: this is a bit imprecise. maybe it's safer to not exclude it this way
          return null;
        }
        console.log('Saw an updated/new issue!', repoName, issue.number, 'updated:', issue.updatedAt, 'last saw this repo:', lastSeenAt);
        return this.issueNumberToCard(repoOwner, repoName, issue.number, issue);
      });
      // remove the null cards (null because they are not new events)
      cards = _.filter(cards, (card) => { return !!card; });
      const ret = { cards };
      // only include the repository key if the lastSeenAt changed
      // That way fewer things will need to be saved to the DB
      if (lastSeenAt !== newLastSeenAt || !lastSeenAt) {
        ret.repository = {repoOwner, repoName, lastSeenAt: newLastSeenAt, isPrivate};
      }
      return ret;
    });
  }
  // _fetchUpdatesForRepo(repoOwner, repoName, progress) {
  //   progress.addTicks(1, `Fetching Updates for ${repoOwner}/${repoName}`);
  //   return Database.getRepoOrNull(repoOwner, repoName).then((repo) => {
  //     let lastSeenAt;
  //     if (repo && repo.lastSeenAt) {
  //       lastSeenAt = repo.lastSeenAt;
  //     }
  //     return this._fetchLastSeenUpdatesForRepo(repoOwner, repoName, progress, lastSeenAt);
  //   });
  // }
  _fetchUpdatesForRepo(repo, progress) {
    const repoOwner = repo.owner.login;
    const repoName = repo.name;
    const isPrivate = repo.private;
    progress.addTicks(1, `Fetching Updates for ${repoOwner}/${repoName}`);
    return Database.getRepoOrNull(repoOwner, repoName).then((repo) => {
      let lastSeenAt;
      if (repo && repo.lastSeenAt) {
        lastSeenAt = repo.lastSeenAt;
      }
      return this._fetchLastSeenUpdatesForRepo(repoOwner, repoName, progress, lastSeenAt, isPrivate);
    });
  }
  _fetchAllIssues(repoInfos, progress, isForced) {
    // Start/keep polling
    if (!this.polling && isPollingEnabled) {
      this.polling = setTimeout(() => {
        this.polling = null;
        this._fetchAllIssues(repoInfos, progress, true /*isForced*/);
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
        progress.addTicks(1, `Fetching list of all repositories for ${repoOwner}`);

        // // This method searches for all repos that have been pushed in the last year.
        // // DISADVANTAGES: searches only **public** repos, not private ones
        // const lastSeenAt = '2015-01-01T00:00:00Z'; // Only poll repos that were pushed in the last year
        // const q = `user:${repoOwner} pushed:>=${lastSeenAt}`;
        // return Client.getOcto().search.repositories.fetchAll({sort:'pushed', q:q})
        // .then((repos) => {
        //   progress.tick(`Fetched list of all repositories for ${repoOwner}`);
        //   return Promise.all(repos.map((repo) => {
        //     // Exclude repos that are explicitly listed (usually only the primary repo is listed so we know where to pull milestones/labesl from)
        //     if (explicitlyListedRepos[`${repoOwner}/${repo.name}`]) {
        //       return null;
        //     }
        //     return this._fetchUpdatesForRepo(repo, progress);
        //   }));
        // })
        // .then((issuesByRepo) => {
        //   // exclude the null repos (ones that were explicitly listed in the URL)
        //   return _.flatten(_.filter(issuesByRepo, (v) => { return !!v; }), true/*shallow*/);
        // });


        // // This method searches for all issues that have updated since a certain date.
        // // This has the DISADVANTAGE of maybe missing some updates,
        // // missing new repos that have been added
        // // missing new issues in a repo that has not been fetched yet (since the lastUpdated date should be null)
        // // and having to calculate 1 timestamp from all the repos
        // const lastSeenAt = '2016-03-19T22:32:14Z';
        // const q = `user:${repoOwner} updated:>=${lastSeenAt}`;
        // return Client.getOcto().search.issues.fetchAll({sort:'updated', q:q})
        // .then((issues) => {
        //   return issues.map((issue) => {
        //     // Parse repository_url becaue the repo info is not anywhere else
        //     // repository_url = "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}"
        //     const [repoOwner, repoName] = /repos\/(.*)/.exec(issue.repositoryUrl)[1].split('/');
        //     return this.issueNumberToCard(repoOwner, repoName, issue.number, issue);
        //   });
        // });


        return Client.getOcto().orgs(repoOwner).repos.fetchAll()
        .then((repos) => {
          progress.tick(`Fetched list of all repositories for ${repoOwner}`);
          // Filter repos to only include ones that have been pushed in the last year
          // to avoid excessive polling
          repos = _.filter(repos, (repo) => {
            const ret = Date.now() - Date.parse(repo.updatedAt) < 1000 * 60 * 60 * 24 * 365
            // if (!ret) {
            //   console.log('Skipping over ', repo.name, 'because lastUpdated=', repo.updatedAt);
            // }
            return ret;
          });
          return Promise.all(repos.map((repo) => {
            // Exclude repos that are explicitly listed (usually only the primary repo is listed so we know where to pull milestones/labesl from)
            if (explicitlyListedRepos[`${repoOwner}/${repo.name}`]) {
              return null;
            }
            return this._fetchUpdatesForRepo(repo, progress);
          }));
        })
        .then((issuesByRepo) => {
          // exclude the null repos (ones that were explicitly listed in the URL)
          return _.flatten(_.filter(issuesByRepo, (v) => { return !!v; }), true/*shallow*/);
        });
      } else {
        return Client.getOcto().repos(repoOwner, repoName).fetch()
        .then((repo) => {
          return this._fetchUpdatesForRepo(repo, progress);
        });
      }
    });
    return Promise.all(allPromises).then((repoAndCards) => {
      repoAndCards = _.flatten(repoAndCards, true /*shallow*/); // the asterisks in the URL become an array of repoAndCards so we need to flatten
      const repos = _.filter(repoAndCards.map(({repository}) => { return repository; }), (v) => { return !!v; }); // if the lastSeenAt did not change then repository field will be missing
      const cards = _.flatten(repoAndCards.map(({cards}) => { return cards; }), true /*shallow*/);

      _buildBipartiteGraph(GRAPH_CACHE, cards);

      cacheCards = cards;
      cacheCardsRepoInfos = JSON.stringify(repoInfos);

      // Save the cards and then emit that they were changed
      return Database.putCardsAndRepos(cards, repos).then(() => {
        if (cards.length) {
          this.emit('change');
        }
        return cards;
      });

    });
  }
  fetchMilestones(repoOwner, repoName) {
    return Client.dbPromise().then(() => Client.getOcto().repos(repoOwner, repoName).milestones.fetchAll());
  }
  fetchLabels(repoOwner, repoName) {
    return Client.dbPromise().then(() => Client.getOcto().repos(repoOwner, repoName).labels.fetchAll());
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

export default issueStore;
