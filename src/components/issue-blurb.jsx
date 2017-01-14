import React from 'react';
import * as BS from 'react-bootstrap';
import classnames from 'classnames';
import {LockIcon, ListUnorderedIcon, GitPullRequestIcon, IssueOpenedIcon, IssueReopenedIcon, IssueClosedIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import Database from '../database';

import GithubFlavoredMarkdown from './gfm';
import Loadable from './loadable';
import ColoredIcon from './colored-icon';

const IssueOrPullRequestBlurb = React.createClass({
  render() {
    const {card, primaryRepoName, context, repo} = this.props;
    const {issue, repoOwner, repoName, number} = card;
    const isPrivate = repo && repo.isPrivate;

    const multipleRepoName = primaryRepoName === repoName ? null : repoName;
    let blurbContext;
    if (context) {
      blurbContext = (
        <span className='blurb-context'>{context}</span>
      );
    }

    let privateEl;
    if (isPrivate) {
      privateEl = (
        <LockIcon className='private' title='Private Repository'/>
      );
    }
    if (issue) {
      const isPullRequest = card.isPullRequest() || issue.base; // use .base in case we are given the PR JSON (which does not contain labels)
      const popoverTitle = (
        <GithubFlavoredMarkdown
          disableLinks={true}
          inline={true}
          text={issue.title}/>
      );

      const bodyPopover = (
        <BS.Popover id={`popover-${repoOwner}-${repoName}-${number}`} className='issue-body' title={popoverTitle}>
          <GithubFlavoredMarkdown
            disableLinks={false}
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.body}/>
        </BS.Popover>
      );

      let icon = null;
      if (isPullRequest) {
        let state;
        if (card.isPullRequestMerged()) {
          state = 'merged';
        } else {
          state = issue.state;
        }
        icon = (
          <GitPullRequestIcon title='Click for Pull Request Details' className='blurb-icon' onClick={this.onClickIcon} data-state={state}/>
        );
      } else {
        let iconType;
        if (issue.state === 'open' && !issue.closedBy) {
          iconType = IssueOpenedIcon;
        } else if (issue.state === 'open' && issue.closedBy) {
          iconType = IssueReopenedIcon;
        } else if (issue.state === 'closed') {
          iconType = IssueClosedIcon;
        } else {
          iconType = QuestionIcon;
        }
        icon = (
          <iconType title='Click for Issue Details' className='blurb-icon' onClick={this.onClickIcon} data-state={issue.state}/>
        );
      }

      const classes = {
        'issue-blurb': true,
        'is-pull-request': isPullRequest,
        'is-merged': card.isPullRequestMerged()
      };

      let kanbanColumnIcon;
      const kanbanColumn = issue.labels.filter((label) => {
        return getFilters().getState().columnRegExp.test(label.name);
      })[0];
      if (kanbanColumn) {
        const {color, name} = kanbanColumn;
        kanbanColumnIcon = (
          <ColoredIcon color={color} name={name}>
            <ListUnorderedIcon/>
          </ColoredIcon>
        );
      }

      return (
        <span className={classnames(classes)}>
          {kanbanColumnIcon}
          <a className='blurb-number-link'
            target='_blank'
            href={issue.htmlUrl}
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
              {privateEl}
              <span className='blurb-secondary-repo'>{multipleRepoName}</span>
              {blurbContext}
            </span>
          </BS.OverlayTrigger>
        </span>
      );
    } else {
      // no Issue found
      return (
        <span className='issue-blurb'>
          <span className='blurb-number'>{card.number}</span>
          {privateEl}
          <span className='blurb-secondary-repo'>{multipleRepoName}</span>
          {blurbContext}
        </span>
      );

    }

  }
});


const IssueOrPullRequestBlurbShell = React.createClass({
  render() {
    const {card, primaryRepoName, context} = this.props;
    const {repoOwner, repoName} = card;
    const promise = Database.getRepoOrNull(repoOwner, repoName);

    return (
      <Loadable
        promise={promise}
        renderLoaded={(repo) => (<IssueOrPullRequestBlurb repo={repo} card={card} primaryRepoName={primaryRepoName} context={context} />)}
      />
    );
  }
});

export default IssueOrPullRequestBlurbShell;
