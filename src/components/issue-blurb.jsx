import React from 'react';
import * as BS from 'react-bootstrap';

import IssueStore from '../issue-store';
import GithubFlavoredMarkdown from './gfm';

const IssueOrPullRequestBlurb = React.createClass({
  onClickNumber(evt) {
    const {card} = this.props;
    const {repoOwner, repoName, issue} = card;

    evt.stopPropagation();
    IssueStore.setLastViewed(repoOwner, repoName, issue.number);
  },
  onClickIcon(evt) {
    evt.stopPropagation();
    evt.preventDefault(); // because it could be in a label for a checkbox
  },
  render() {
    const {card, primaryRepoName, context} = this.props;
    const {issue, repoOwner, repoName} = card;

    const isPullRequest = !!issue.pullRequest;
    const multipleRepoName = primaryRepoName === repoName ? null : repoName;
    const popoverTitle = isPullRequest ? 'Pull Request Description' : 'Issue Description';

    const bodyPopover = (
      <BS.Popover id="popover-${issue.id}" className='issue-body' title={popoverTitle}>
        <GithubFlavoredMarkdown
          disableLinks={false}
          repoOwner={repoOwner}
          repoName={repoName}
          text={issue.body}/>
      </BS.Popover>
    );

    let icon = null;
    if (isPullRequest) {
      icon = (
        <i title='Click for Pull Request Details' className='blurb-icon octicon octicon-git-pull-request' onClick={this.onClickIcon}/>
      );
    } else {
      icon = (
        <i title='Click for Issue Details' className='blurb-icon octicon octicon-issue-opened' onClick={this.onClickIcon}/>
      );
    }

    return (
      <span className='issue-blurb'>
        <span className='blurb-context'>{context}</span>
        <BS.OverlayTrigger
          rootClose
          trigger={['click', 'focus']}
          placement='bottom'
          overlay={bodyPopover}>
          {icon}
        </BS.OverlayTrigger>
        <a className='blurb-number-link'
          target='_blank'
          href={issue.htmlUrl}
          onClick={this.onClickNumber}
          >
          <span className='blurb-secondary-repo'>{multipleRepoName}</span>
          <span className='blurb-number'>{'#' + issue.number}</span>
        </a>
      </span>
    );
  }
});

export default IssueOrPullRequestBlurb;
