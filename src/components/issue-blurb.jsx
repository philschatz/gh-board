import React from 'react';
import * as BS from 'react-bootstrap';
import classnames from 'classnames';

import GithubFlavoredMarkdown from './gfm';
import ColoredIcon from './colored-icon';
import {getFilters} from '../route-utils';

const IssueOrPullRequestBlurb = React.createClass({
  render() {
    const {card, primaryRepoName, context} = this.props;
    const {issue, repoOwner, repoName, number} = card;

    const multipleRepoName = primaryRepoName === repoName ? null : repoName;
    let blurbContext;
    if (context) {
      blurbContext = (
        <span className='blurb-context'>{context}</span>
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
          <i title='Click for Pull Request Details' className='blurb-icon octicon octicon-git-pull-request' onClick={this.onClickIcon} data-state={state}/>
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
          <i title='Click for Issue Details' className={classnames(classes)} onClick={this.onClickIcon} data-state={issue.state}/>
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
            <i className='octicon octicon-list-unordered'/>
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
          <span className='blurb-secondary-repo'>{multipleRepoName}</span>
          {blurbContext}
        </span>
      );

    }

  }
});

export default IssueOrPullRequestBlurb;
