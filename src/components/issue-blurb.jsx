import React from 'react'
import classnames from 'classnames'
import { GitPullRequestIcon } from 'react-octicons'

class IssueOrPullRequestBlurb extends React.Component {
  render() {
    const { card, primaryRepoName, context } = this.props
    const { issue, repoName } = card

    const multipleRepoName = primaryRepoName === repoName ? null : repoName
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
          <a className="blurb-number-link" target="_blank" href={issue.htmlUrl}>
            {icon}
            <span className="blurb-number">{issue.number}</span>
          </a>
          <span className="blurb-secondary-repo">{multipleRepoName}</span>
          {blurbContext}
        </span>
      )
    } else {
      // no Issue found
      return (
        <span className="issue-blurb">
          <span className="blurb-number">{card.number}</span>
          <span className="blurb-secondary-repo">{multipleRepoName}</span>
          {blurbContext}
        </span>
      )
    }
  }
}

export default IssueOrPullRequestBlurb
