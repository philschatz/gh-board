import _ from 'underscore'

import { KANBAN_LABEL } from '../../../helpers'
import * as Database from './indexedDB'
import fetchLabels from './fetchLabels'
import { filterCard } from './filterCards'
import { _gotIssuesFromDB } from '../../ducks/issue'

function emptyFilter() {
  return {
    milestoneTitles: [],
    tagNames: [],
    states: ['open', 'close'],
    types: ['issue', 'pull-request'],
    columnLabels: [],
    columnRegExp: KANBAN_LABEL,
  }
}

function _getLabelsRemoved(newLabels, oldLabels) {
  oldLabels = oldLabels ? oldLabels.labels : []
  oldLabels = oldLabels || []
  const newLabelNames = newLabels.map(({ name }) => name).sort()
  const oldLabelNames = oldLabels.map(({ name }) => name).sort()
  return _.difference(oldLabelNames, newLabelNames)
}

function _getDidLabelsChange(newLabels, oldLabels) {
  oldLabels = oldLabels ? oldLabels.labels : []
  oldLabels = oldLabels || []
  const newLabelNames = newLabels.map(({ name }) => name)
  const oldLabelNames = oldLabels.map(({ name }) => name)
  return (
    _.intersection(oldLabelNames, newLabelNames).length !== newLabels.length
  )
}

function _fetchLastSeenUpdatesForRepo(
  githubClient,
  repoOwner,
  repoName,
  lastSeenAt,
  isPrivate,
  didLabelsChange
) {
  const opts = {
    per_page: 100,
    sort: 'updated',
    state: 'all', // fetch opened and closed Issues
    direction: 'desc',
  }
  if (lastSeenAt) {
    opts.since = lastSeenAt
  }
  const method = githubClient.canCacheLots() ? 'fetchAll' : 'fetchOne'
  return githubClient
    .getOcto()
    .then(({ repos }) => repos(repoOwner, repoName).issues[method](opts))
    .then(items => {
      // If a repository has 0 events it probably has not changed in a while
      // or never had any commits. Do not keep trying to fetch all the Issues though
      // so set the lastSeenAt to be something non-zero
      // since `null` means gh-board has not fetched all the Issues before.
      const newLastSeenAt = items.length ? items[0].updatedAt : null

      let cards = items.reduce((prev, issue) => {
        if (lastSeenAt === issue.updatedAt) {
          // If this Issue was updated at the same time then ignore it
          // TODO: this is a bit imprecise. maybe it's safer to not exclude it this way
          return prev
        }
        console.log(
          'Saw an updated/new issue!',
          repoName,
          issue.number,
          'updated:',
          issue.updatedAt,
          'last saw this repo:',
          lastSeenAt
        )

        prev.push({ repoOwner, repoName, number: issue.number, issue })
        return prev
      }, [])
      const ret = { cards, didLabelsChange }
      // only include the repository key if the lastSeenAt changed
      // That way fewer things will need to be saved to the DB
      if (lastSeenAt !== newLastSeenAt || !lastSeenAt) {
        ret.repository = {
          repoOwner,
          repoName,
          lastSeenAt: newLastSeenAt,
          isPrivate,
        }
      }
      return ret
    })
}

function _fetchUpdatesForRepo(githubClient, repo) {
  const repoOwner = repo.owner.login
  const repoName = repo.name
  const isPrivate = repo.private
  // Check if the set of labels have changed for this repo.
  // If so, then for every label that no longer exists we need to fetch the Issue and update it.
  // The reason is that the label _could_ have been renamed.
  return Promise.all([
    fetchLabels(githubClient, repoOwner, repoName),
    Database.getRepoLabelsOrNull(repoOwner, repoName),
  ]).then(([newLabels, oldLabels]) => {
    // Check if the labels have changed.
    const labelsRemoved = _getLabelsRemoved(newLabels, oldLabels || [])
    // TODO: when labelsRemoved (or when they changed at all, then we should refresh the board so the new columns show up)

    // find all the Issues that have labels that have been removed so we can update them
    return Database.fetchCards(emptyFilter(), [{ repoOwner, repoName }])
      .then(cards => {
        return cards.filter(card => {
          return labelsRemoved.some(label => {
            const filter = emptyFilter()
            if (KANBAN_LABEL.test(label)) {
              filter.columnLabels.push(label)
            } else {
              filter.tagNames.push(label)
            }
            return filterCard(card, filter, [{ repoOwner, repoName }])
          })
        })
      })
      .then(cardsArrays => {
        const cards = _.unique(_.flatten(cardsArrays))
        // Re-fetch each Issue
        return Promise.all(
          cards.map(card =>
            card.fetchIssue(githubClient, true /*skipSavingToDb*/)
          )
        )
      })
      .then(cards => {
        return Database.putCards(cards)
      })
      .then(() => {
        // Update the list of labels now that all the Issues have been updated
        return Database.putRepoLabels(repoOwner, repoName, newLabels)
      })
      .then(() => {
        // FINALLY, actually fetch the updates
        return Database.getRepoOrNull(repoOwner, repoName).then(_repo => {
          let lastSeenAt
          if (_repo && _repo.lastSeenAt) {
            lastSeenAt = _repo.lastSeenAt
          }
          return _fetchLastSeenUpdatesForRepo(
            githubClient,
            repoOwner,
            repoName,
            lastSeenAt,
            isPrivate,
            _getDidLabelsChange(newLabels, oldLabels)
          )
        })
      })
  })
}

export default function fetchIssues(githubClient, filter, repoInfos, dispatch) {
  const explicitlyListedRepos = {}
  repoInfos.forEach(({ repoOwner, repoName }) => {
    if (repoName !== '*') {
      explicitlyListedRepos[`${repoOwner}/${repoName}`] = true
    }
  })

  let fetched = false

  Database.fetchCards(filter, repoInfos)
    .then(cards => {
      if (!fetched) {
        dispatch(_gotIssuesFromDB(cards))
      }
    })
    .catch(() => {})

  return githubClient
    .getOcto()
    .then(client => {
      return Promise.all(
        repoInfos.map(({ repoOwner, repoName }) => {
          if (repoName === '*') {
            // Fetch all the repos, and then concat them
            // progress.addTicks(1, `Fetching list of all repositories for ${repoOwner}`);

            let fetchAllRepos
            if (githubClient.canCacheLots()) {
              // First, we have to determine if the repoOwner is an Organization or a User
              // so we can call .orgs or .users to get the list of repositories
              // .orgs returns Private+Public repos but .users only returns private repos
              fetchAllRepos = client
                .users(repoOwner)
                .fetch()
                .then(({ type }) => {
                  if ('Organization' === type) {
                    return client.orgs(repoOwner).repos.fetchAll()
                  } else {
                    return client.users(repoOwner).repos.fetchAll()
                  }
                })
            } else {
              // only get the 1st page of results if not logged in
              // since it's anonymous we only need to get public repos (.users only yields public repos)
              fetchAllRepos = client.users(repoOwner).repos.fetchOne()
            }
            return fetchAllRepos
              .then(repos => {
                // progress.tick(`Fetched list of all repositories for ${repoOwner}`);
                // Filter repos to only include ones that have been pushed in the last year
                // to avoid excessive polling
                repos = repos.filter(repo => {
                  const ret =
                    Date.now() - Date.parse(repo.updatedAt) <
                    1000 * 60 * 60 * 24 * 365
                  // if (!ret) {
                  //   console.log('Skipping over ', repo.name, 'because lastUpdated=', repo.updatedAt);
                  // }
                  return ret
                })
                // If anonymous mode is on then only poll 5 repositories
                if (!githubClient.canCacheLots()) {
                  if (repos.length > 5) {
                    repos = repos.slice(0, 5)
                  }
                }
                return Promise.all(
                  repos.map(repo => {
                    // Exclude repos that are explicitly listed (usually only the primary repo is listed so we know where to pull milestones/labesl from)
                    if (explicitlyListedRepos[`${repoOwner}/${repo.name}`]) {
                      return null
                    }
                    return _fetchUpdatesForRepo(githubClient, repo)
                  })
                )
              })
              .then(issuesByRepo => {
                // exclude the null repos (ones that were explicitly listed in the URL)
                return Object.keys(issuesByRepo).reduce((prev, v) => {
                  if (!v) {
                    return prev
                  }
                  return prev.concat(v)
                }, [])
              })
          } else {
            return client
              .repos(repoOwner, repoName)
              .fetch()
              .then(repo => {
                return _fetchUpdatesForRepo(githubClient, repo)
              })
          }
        })
      )
    })
    .then(repoAndCardsUpdate => {
      const repoAndCards = _.flatten(repoAndCardsUpdate, true /*shallow*/) // the asterisks in the URL become an array of repoAndCards so we need to flatten
      const repos = repoAndCards
        .map(({ repository }) => repository)
        .filter(v => !!v)
      // if the lastSeenAt did not change then repository field will be missing
      const cards = _.flatten(repoAndCards.map(x => x.cards), true /*shallow*/)
      // didLabelsChange is true if at least one of the repos labels changed
      const didLabelsChange =
        _.flatten(
          repoAndCards.map(x => x.didLabelsChange),
          true /*shallow*/
        ).indexOf(true) >= 0

      // Save the cards
      let putCardsAndRepos
      if (githubClient.canCacheLots()) {
        putCardsAndRepos = Database.putCardsAndRepos(cards, repos)
      } else {
        // when not logged in then do not bother saving the last-updated time for each repo
        // since we have only been asking for 1 page of results.
        putCardsAndRepos = Database.putCards(cards)
      }

      return putCardsAndRepos.then(() => ({ repos, cards, didLabelsChange }))
    })
    .then(() => {
      fetched = true
      return Database.fetchCards(filter, repoInfos)
    })
}
