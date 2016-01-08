import React from 'react';
import * as BS from 'react-bootstrap';
import classnames from 'classnames';

import IssueStore from '../issue-store';
import GithubFlavoredMarkdown from './gfm';

const IssueOrPullRequestBlurb = React.createClass({
  onClickNumber(evt) {
    const {card} = this.props;
    const {repoOwner, repoName, issue} = card;

    evt.stopPropagation();
    IssueStore.setLastViewed(repoOwner, repoName, issue.number);
  },
  // onClickIcon(evt) {
  //   evt.stopPropagation();
  //   evt.preventDefault(); // because it could be in a label for a checkbox
  // },
  render() {
    const {card, primaryRepoName, context} = this.props;
    const {issue, repoOwner, repoName} = card;

    const isPullRequest = !!issue.pullRequest || !!issue.base; // use .base in case we are given the PR JSON (which does not contain labels)
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
      const classes = {
        'blurb-icon': true,
        'octicon': true,
        'octicon-issue-opened': issue.state === 'open' && !issue.closedBy,
        'octicon-issue-reopened': issue.state === 'open' && issue.closedBy,
        'octicon-issue-closed': issue.state === 'closed'
      };
      icon = (
        <i title='Click for Issue Details' className={classnames(classes)} onClick={this.onClickIcon}/>
      );
    }

    let blurbContext;
    if (context) {
      blurbContext = (
        <span className='blurb-context'>{context}</span>
      );
    }

    const classes = {
      'issue-blurb': true,
      'is-pull-request': isPullRequest
    };

    return (
      <span className={classnames(classes)}>
        <a className='blurb-number-link'
          target='_blank'
          href={issue.htmlUrl}
          onClick={this.onClickNumber}
          >
          <span className='blurb-number'>{issue.number}</span>
        </a>
        <BS.OverlayTrigger
          rootClose
          trigger={['click', 'focus']}
          placement='bottom'
          overlay={bodyPopover}>
          <span className='-just-for-overlay-trigger'>
            {icon}
            <span className='blurb-secondary-repo'>{multipleRepoName}</span>
            {blurbContext}
          </span>
        </BS.OverlayTrigger>
      </span>
    );
  }
});

export default IssueOrPullRequestBlurb;
