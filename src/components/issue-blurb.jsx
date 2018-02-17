import React from 'react'
import classnames from 'classnames'
import { GitPullRequestIcon } from 'react-octicons'

class IssueOrPullRequestBlurb extends React.Component {
  render() {
    const {
      card,
      primaryRepoName,
      primaryRepoOwner,
      context,
      href,
    } = this.props
    const { issue, repoName, repoOwner } = card

    const multipleRepoName =
      primaryRepoOwner !== repoOwner
        ? `${repoOwner}/${repoName}`
        : primaryRepoName !== repoName ? repoName : null

    let blurbContext
    if (context) {
      blurbContext = <span className="blurb-context">{context}</span>
    }

    if (issue) {
      const isPullRequest = card.isPullRequest() || issue.base // use .base in case we are given the PR JSON (which does not contain labels)

      let icon = null
      if (isPullRequest) {
        let state
        if (card.isPullRequestMerged()) {
          state = 'merged'
        } else {
          state = issue.state
        }
        icon = (
          <GitPullRequestIcon
            title="Click for Pull Request Details"
            className="blurb-icon"
            onClick={this.onClickIcon}
            data-state={state}
          />
        )
      }

      const classes = {
        'issue-blurb': true,
        'is-pull-request': isPullRequest,
        'is-merged': card.isPullRequestMerged(),
      }

      return (
        <span className={classnames(classes)}>
          <a
            className="blurb-number-link"
            target="_blank"
            href={href || issue.htmlUrl}
          >
            {icon}
            <span className="blurb-secondary-repo">{multipleRepoName}</span>
            <span className="blurb-number">#{card.number}</span>
          </a>
          {blurbContext}
        </span>
      )
    } else {
      // no Issue found
      return (
        <span className="issue-blurb">
          <a className="blurb-number-link" target="_blank" href={href}>
            <span className="blurb-secondary-repo">{multipleRepoName}</span>
            <span className="blurb-number">#{card.number}</span>
          </a>
          {blurbContext}
        </span>
      )
    }
  }
}

export default IssueOrPullRequestBlurb
