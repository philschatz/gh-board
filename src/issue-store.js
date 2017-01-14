import _ from 'underscore';
import {EventEmitter} from 'events';
import Client from './github-client';
import BipartiteGraph from './bipartite-graph';
import {getFilters, filterCardsByFilter, getFreshFilter} from './route-utils';
import {contains, KANBAN_LABEL, UNCATEGORIZED_NAME} from './helpers';
import Card from './card-model';
import Progress from './progress';
import Database from './database';

const RELOAD_TIME_SHORT = 30 * 1000;
const RELOAD_TIME_LONG = 10 * 60 * 1000;

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
    card.resetPromisesAndState(issue, pr, prStatuses);
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
    let fetchAllIssues;
    if (Client.canCacheLots()) {
      fetchAllIssues = Client.getOcto().repos(repoOwner, repoName).issues.fetchAll({state: issuesState, per_page: 100, sort: 'updated'});
    } else {
      fetchAllIssues = Client.getOcto().repos(repoOwner, repoName).issues.fetchOne({state: issuesState, per_page: 100, sort: 'updated'});
    }
    return fetchAllIssues
    .then((vals) => {
      progress.tick(`Fetched Issues for ${repoOwner}/${repoName}`);
      return vals.map((issue) => {
        return this.issueNumberToCard(repoOwner, repoName, issue.number, issue);
      });
    });
  }
  _fetchLastSeenUpdatesForRepo(repoOwner, repoName, progress, lastSeenAt, isPrivate, didLabelsChange) {
    const opts = {
      per_page: 100,
      sort: 'updated',
      state: 'all', // fetch opened and closed Issues
      direction: 'desc'
    };
    if (lastSeenAt) {
      opts.since = lastSeenAt;
    }
    let fetchPromise;
    if (Client.canCacheLots()) {
      fetchPromise = Client.getOcto().repos(repoOwner, repoName).issues.fetchAll(opts);
    } else {
      fetchPromise = Client.getOcto().repos(repoOwner, repoName).issues.fetchOne(opts);
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
      const ret = { cards, didLabelsChange };
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
    // Check if the set of labels have changed for this repo.
    // If so, then for every label that no longer exists we need to fetch the Issue and update it.
    // The reason is that the label _could_ have been renamed.
    return Promise.all([
      this.fetchLabels(repoOwner, repoName),
      Database.getRepoLabelsOrNull(repoOwner, repoName)
    ]).then(([newLabels, oldLabels]) => {

      // Check if the labels have changed.
      const labelsRemoved = this._getLabelsRemoved(newLabels, oldLabels || []);
      // TODO: when labelsRemoved (or when they changed at all, then we should refresh the board so the new columns show up)

      // find all the Issues that have labels that have been removed so we can update them
      return Promise.all(labelsRemoved.map((label) => {
        let filter = getFreshFilter().toggleState('closed')/*.toggleState('open')*/;  // TODO: open is toggled on by default
        filter.state.repoInfos = [{repoOwner, repoName}]; // HACK since there is no ggod way to do this directly on the filter
        if (getFilters().getState().columnRegExp.test(label)) {
          filter = filter.toggleColumnLabel(label);
        } else {
          filter = filter.toggleTagName(label);
        }
        return Database.fetchCards(filter);
      }))
      .then((cardsArrays) => {
        const cards = _.unique(_.flatten(cardsArrays));
        // Re-fetch each Issue
        return Promise.all(cards.map((card) => card.fetchIssue(true/*skipSavingToDb*/)))
        .then((newIssues) => {
          return Database.putCards(cards)
          .then(() => {
            // Update the list of labels now that all the Issues have been updated
            return Database.putRepoLabels(repoOwner, repoName, newLabels)
            .then(() => {


              // FINALLY, actually fetch the updates
              return Database.getRepoOrNull(repoOwner, repoName).then((repo) => {
                let lastSeenAt;
                if (repo && repo.lastSeenAt) {
                  lastSeenAt = repo.lastSeenAt;
                }
                return this._fetchLastSeenUpdatesForRepo(repoOwner, repoName, progress, lastSeenAt, isPrivate, this._getDidLabelsChange(newLabels, oldLabels));
              });

            });
          });
        });
      });

    });
  }
  fetchConcreteRepoInfos(repoInfos) {
    const allPromises = repoInfos.map(({repoOwner, repoName}) => {
      if (repoName === '*') {
        let fetchAllRepos;
        if (Client.canCacheLots()) {
          // First, we have to determine if the repoOwner is an Organization or a User
          // so we can call .orgs or .users to get the list of repositories
          // .orgs returns Private+Public repos but .users only returns private repos
          fetchAllRepos = Client.getOcto().users(repoOwner).fetch()
          .then(({type}) => {
            if ('Organization' === type) {
              return Client.getOcto().orgs(repoOwner).repos.fetchAll();
            } else {
              return Client.getOcto().users(repoOwner).repos.fetchAll();
            }
          });
        } else {
          // only get the 1st page of results if not logged in
          fetchAllRepos = Client.getOcto().users(repoOwner).repos.fetchOne();
        }
        return fetchAllRepos.then((repos) => {
          return repos.map((repo) => {return {repoOwner, repoName: repo.name, repo}; });
        });
      } else {
        return {repoOwner, repoName};
      }
    });

    return Promise.all(allPromises).then((repoInfosArrays) => {
      return _.unique(_.flatten(repoInfosArrays));
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

        let fetchAllRepos;
        if (Client.canCacheLots()) {
          // First, we have to determine if the repoOwner is an Organization or a User
          // so we can call .orgs or .users to get the list of repositories
          // .orgs returns Private+Public repos but .users only returns private repos
          fetchAllRepos = Client.getOcto().users(repoOwner).fetch()
          .then(({type}) => {
            if ('Organization' === type) {
              return Client.getOcto().orgs(repoOwner).repos.fetchAll();
            } else {
              return Client.getOcto().users(repoOwner).repos.fetchAll();
            }
          });
        } else {
          // only get the 1st page of results if not logged in
          // since it's anonymous we only need to get public repos (.users only yields public repos)
          fetchAllRepos = Client.getOcto().users(repoOwner).repos.fetchOne();
        }
        return fetchAllRepos
        .then((repos) => {
          progress.tick(`Fetched list of all repositories for ${repoOwner}`);
          // Filter repos to only include ones that have been pushed in the last year
          // to avoid excessive polling
          repos = _.filter(repos, (repo) => {
            const ret = Date.now() - Date.parse(repo.updatedAt) < 1000 * 60 * 60 * 24 * 365;
            // if (!ret) {
            //   console.log('Skipping over ', repo.name, 'because lastUpdated=', repo.updatedAt);
            // }
            return ret;
          });
          // If anonymous mode is on then only poll 5 repositories
          if (!Client.canCacheLots()) {
            if (repos.length > 5) {
              repos = repos.slice(0, 5);
            }
          }
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
      // didLabelsChange is true if at least one of the repos labels changed
      const didLabelsChange = _.flatten(repoAndCards.map(({didLabelsChange}) => { return didLabelsChange; }), true /*shallow*/).indexOf(true) >= 0;

      _buildBipartiteGraph(GRAPH_CACHE, cards);

      cacheCards = cards;
      cacheCardsRepoInfos = JSON.stringify(repoInfos);

      // Save the cards and then emit that they were changed
      let putCardsAndRepos;
      if (Client.canCacheLots()) {
        putCardsAndRepos = Database.putCardsAndRepos(cards, repos);
      } else {
        // when not logged in then do not bother saving the last-updated time for each repo
        // since we have only been asking for 1 page of results.
        putCardsAndRepos = Database.putCards(cards);
      }
      return putCardsAndRepos.then(() => {
        if (cards.length || didLabelsChange) {
          this.emit('change');
        }
        return cards;
      });

    });
  }
  loadCardsFromDatabase(filter) {
    return Database.fetchCards(filter).then((cards) => {
      _buildBipartiteGraph(GRAPH_CACHE, cards);
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

    Client.getOcto().repos(repoOwner, repoName).milestones.fetchAll()
    .then((milestones) => {
      // Find the milestone with a matching Title
      const matchingMilestone = _.filter(milestones, (milestone) => {
        return milestone.title === newMilestone.title;
      })[0];

      if (matchingMilestone) {
        return Client.getOcto().repos(repoOwner, repoName).issues(issue.number).update({milestone: matchingMilestone.number})
        .then(() => {
          // invalidate the issues list
          cacheCards = null;
          this.emit('change');
        });
      } else {
        alert(`It seems the target repository (${repoOwner}/${repoName}) does not have a matching milestone ${newMilestone.title} to move the Issue(s) to. Please create the milestone manually for now`);
      }

    });

  }
  createLabel(repoOwner, repoName, opts) {
    return Client.getOcto().repos(repoOwner, repoName).labels.create(opts);
  }

  _getLabelsRemoved(newLabels, oldLabels) {
    oldLabels = oldLabels ? oldLabels.labels : [];
    oldLabels = oldLabels || [];
    const newLabelNames = newLabels.map(({name}) => name).sort();
    const oldLabelNames = oldLabels.map(({name}) => name).sort();
    return _.difference(oldLabelNames, newLabelNames);
  }

  _getDidLabelsChange(newLabels, oldLabels) {
    oldLabels = oldLabels ? oldLabels.labels : [];
    oldLabels = oldLabels || [];
    const newLabelNames = newLabels.map(({name}) => name);
    const oldLabelNames = oldLabels.map(({name}) => name);
    return _.intersection(oldLabelNames, newLabelNames).length !== newLabels.length;
  }

  // Try to pull labels from the DB, and if they are not there then ask GitHub
  fetchRepoLabels(repoOwner, repoName) {
    return Database.getRepoLabelsOrNull(repoOwner, repoName)
    .then((val) => {
      if (val) {
        return val;
      } else {
        return Client.getOcto().repos(repoOwner, repoName).labels.fetchAll()
        .then((labels) => {
          return {repoOwner, repoName, labels};
        });
      }
    });
  }
};

export default issueStore;
