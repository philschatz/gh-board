import _ from 'underscore'
import * as Database from '../../middlewares/utils/indexedDB'
import { getDataFromHtml } from '../../../gfm-dom'

export const toIssueKey = (repoOwner, repoName, number) => {
  return `${repoOwner}/${repoName}#${number}`
}

export const cardFactory = (CARD_CACHE, GRAPH_CACHE) => (
  { repoOwner, repoName, number, issue, pr = null, prStatuses = null },
  cast
) => {
  const key = toIssueKey(repoOwner, repoName, number)
  let card = CARD_CACHE[key]
  if (card && issue) {
    card.resetPromisesAndState(issue, pr, prStatuses)
    return card
  } else if (card) {
    return card
  } else {
    card = new Card(
      repoOwner,
      repoName,
      number,
      GRAPH_CACHE,
      issue,
      pr,
      prStatuses
    )
    if (!cast) {
      GRAPH_CACHE.addCards([card], cardFactory(CARD_CACHE, GRAPH_CACHE))
    }
    CARD_CACHE[key] = card
    return card
  }
}

export default class Card {
  constructor(repoOwner, repoName, number, graph, issue, pr, prStatus) {
    if (!repoOwner) {
      throw new Error('BUG! missing repoOwner')
    }
    if (!repoName) {
      throw new Error('BUG! missing repoName')
    }
    if (!number) {
      throw new Error('BUG! missing number')
    }
    this.repoOwner = repoOwner
    this.repoName = repoName
    this.number = number
    this.issue = issue
    this._graph = graph
    this.pr = pr
    this.prStatus = prStatus
    this._prPromise = pr ? Promise.resolve(pr) : null
    this._prStatusPromise = prStatus ? Promise.resolve(prStatus) : null
  }
  key() {
    const { repoOwner, repoName, number } = this
    return `${repoOwner}/${repoName}#${number}`
  }
  isPullRequest() {
    return this.issue && !!this.issue.pullRequest
  }
  isPullRequestMerged() {
    return !!this.isPullRequest() && this.pr && this.pr.mergedAt
  }
  hasMergeConflict() {
    if (this.pr) {
      if (this.pr.merged) {
        return false
      }
      return !this.pr.mergeable
    } else {
      return false // return false for now just to be safe
    }
  }
  getPullRequestStatus() {
    if (!this.prStatus) {
      return {}
    }

    const { state, statuses } = this.prStatus
    // Pull out the 1st status which matches the overall status of the commit.
    // That way we get the targetURL and message.
    // When 'pending', there might not be entries in statuses
    const theStatus = _.filter(statuses, status => {
      return status.state === state
    })[0]
    if (!theStatus) {
      return {}
    }
    return theStatus
  }
  isPullRequestToDefaultBranch() {
    if (!this.isPullRequest()) {
      throw new Error('BUG! Did not check if this was a PullRequest first')
    }
    if (!this.pr) {
      return true
    }
    return this.pr.base.ref === this.pr.base.repo.defaultBranch
  }
  getIssueType() {
    return this.isPullRequest() ? 'pull-request' : 'issue'
  }
  getRelated() {
    // return this._graph.getB(key).concat(this._graph.getA(key));
    return this._graph.getB(this._graph.cardToKey(this))
  }
  getRelatedIssues() {
    return this._graph.getB(this._graph.cardToKey(this))
  }
  getRelatedPullRequests() {
    return this._graph.getA(this._graph.cardToKey(this))
  }
  getUpdatedAt() {
    if (this.isPullRequest() && !this.pr) {
      // TODO: Fetch the Pull Request Promise
    }
    if (this.isPullRequest() && this.pr) {
      return this.pr.updatedAt
    } else {
      return this.issue.updatedAt
    }
  }
  _getDataFromHtml() {
    if (this.__cachedHtmlBody !== this.issue.body) {
      this.__cachedHtmlData = getDataFromHtml(
        this.issue.body,
        this.repoOwner,
        this.repoName
      )
      this.__cachedHtmlBody = this.issue.body
    }
    return this.__cachedHtmlData
  }
  getTaskCounts() {
    return this._getDataFromHtml().taskCounts
  }
  getDueAt() {
    return this._getDataFromHtml().dueAt
  }
  getFeaturedImageSrc() {
    return this._getDataFromHtml().featuredImageSrc
  }
  getRelatedIssuesFromBody() {
    return this._getDataFromHtml().relatedIssues
  }
  getCommentCount() {
    let count = this.issue.comments
    // include comments on code in the count
    if (this.pr) {
      count += this.pr.reviewComments
    }
    return count
  }
  fetchPR(githubClient, shouldShowPullRequestData, isForced) {
    if (!this.isPullRequest()) {
      throw new Error('BUG! Should not be fetching PR for an Issue')
    }
    if (!shouldShowPullRequestData) {
      return Promise.resolve('user selected not to show additional PR data')
    }
    if (githubClient.getRateLimitRemaining() < githubClient.LOW_RATE_LIMIT) {
      return Promise.resolve('Rate limit low')
    }
    if (!this._prPromise || isForced) {
      const oldHead = this.pr && this.pr.head.sha
      return (this._prPromise = githubClient
        .getOcto()
        .then(({ repos }) =>
          repos(this.repoOwner, this.repoName)
            .pulls(this.number)
            .fetch()
        )
        .then(pr => {
          if (!pr.head) {
            throw new Error('BUG! PR from Octokat should be an object!')
          }
          if (pr.head.sha !== oldHead) {
            this.prStatus = null
            this._prStatusPromise = null
          }
          const isSame =
            this.pr && pr && JSON.stringify(this.pr) === JSON.stringify(pr)
          this.pr = pr
          if (!isSame) {
            Database.putCard(this)
          }
        }))
    }
    return this._prPromise
  }
  fetchPRStatus(githubClient, shouldShowPullRequestData, isForced) {
    if (!shouldShowPullRequestData) {
      return Promise.resolve('user selected not to show additional PR data')
    }
    if (githubClient.getRateLimitRemaining() < githubClient.LOW_RATE_LIMIT) {
      return Promise.resolve('Rate limit low')
    }
    return this.fetchPR(isForced).then(() => {
      if (!this._prStatusPromise || isForced) {
        // Stop fetching the status once it is success. Some failed tests might get re-run.
        if (!this.prStatus || this.prStatus.state !== 'success') {
          this._prStatusPromise = githubClient
            .getOcto()
            .then(({ repos }) =>
              repos(this.repoOwner, this.repoName)
                .commits(this.pr.head.sha)
                .status.fetch()
            )
            .then(status => {
              const isSame =
                this.prStatus &&
                status &&
                JSON.stringify(this.prStatus) === JSON.stringify(status)
              this.prStatus = status
              if (!isSame) {
                Database.putCard(this)
              }
            })
        }
      }
    })
  }
  fetchIssue(githubClient, skipSavingToDb) {
    return githubClient
      .getOcto()
      .then(({ issues }) => issues(this.number).fetch())
      .then(issue => {
        this.issue = issue
        if (!skipSavingToDb) {
          Database.putCard(this)
        }
        return issue
      })
  }
  resetPromisesAndState(issue, pr, prStatus) {
    if (!issue) {
      throw new Error('BUG: resetPromisesAndState requires an issue arg')
    }
    delete this._prPromise
    delete this._prStatusPromise
    this.issue = issue
    if (pr) {
      this.pr = pr
      this._prPromise = Promise.resolve(
        'PR resolved because it was loaded from DB'
      )
    }
    if (prStatus) {
      this.prStatus = prStatus
      this._prStatusPromise = Promise.resolve(
        'PRStatus resolved because it was loaded from DB'
      )
    }
    // if (prStatus) {
    //   this.fetchPRStatus(); // Trigger fetching PR and status
    // } else if (pr) {
    //   this.fetchPR(); // Trigger fetching PR
    // }
  }
  isLoaded(shouldShowPullRequestData) {
    if (!this.issue) {
      return false
    }
    if (shouldShowPullRequestData && this.isPullRequest()) {
      // Check if the statuses are loaded
      return !!this.prStatus
    }
    return true // It is an issue and is loaded
  }
  load() {
    if (this.issue) {
      if (this.isPullRequest()) {
        return this.fetchPRStatus()
      } else {
        return Promise.resolve(
          'There is already an issue. no need to fetch again'
        )
      }
    } else {
      return this.fetchIssue()
    }
  }
}
