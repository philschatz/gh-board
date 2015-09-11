import React from 'react';
import * as BS from 'react-bootstrap';
import _ from 'underscore';
import { DragSource } from 'react-dnd';

import {KANBAN_LABEL} from '../helpers';
import {Store} from '../issue-store';
import {FilterStore} from '../filter-store';
import {getTaskCounts} from '../gfm-dom';
import Loadable from './loadable.jsx';
import GithubFlavoredMarkdown from './gfm.jsx';
import Time from './time.jsx';
import LabelBadge from './label-badge.jsx';

const ItemTypes = {
  CARD: 'card'
};

const issueSource = {
  beginDrag(props) {
    // Return the data describing the dragged item
    const item = props;
    return item;
  },

  endDrag(props, monitor) {
    if (!monitor.didDrop()) {
      return;
    }

    // When dropped on a compatible target, do something
    const {card} = monitor.getItem();
    const {repoOwner, repoName, issue} = card;
    const dropResult = monitor.getDropResult();

    Store.move(repoOwner, repoName, issue, dropResult.label);
  }
};


function collect(connect, monitor) {
  return {
    // Call this function inside render()
    // to let React DnD handle the drag events:
    connectDragSource: connect.dragSource(),
    // You can ask the monitor about the current drag state:
    isDragging: monitor.isDragging()
  };
}


const IssueOrPullRequestBlurb = React.createClass({
  onClickNumber(evt) {
    const {card} = this.props;
    const {repoOwner, repoName, issue} = card;

    evt.stopPropagation();
    Store.setLastViewed(repoOwner, repoName, issue.number);
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
        <i title='Click for Pull Request Details' className='blurb-icon octicon octicon-git-pull-request'/>
      );
    } else {
      icon = (
        <i title='Click for Issue Details' className='blurb-icon octicon octicon-issue-opened'/>
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

// `GET .../issues` returns an object with `labels` and
// `GET .../pulls` returns an object with `mergeable` so for Pull Requests
// we have to have both to fully render an Issue.
let Issue = React.createClass({
  displayName: 'Issue',
  getInitialState() {
    return {taskFinishedCount: 0, taskTotalCount: 0};
  },
  update(issue) {
    this.setState({issue});
  },
  onClickNumber(evt) {
    const {card} = this.props;
    const {repoOwner, repoName, issue} = card;

    evt.stopPropagation();
    Store.setLastViewed(repoOwner, repoName, issue.number);
  },
  onDragStart() {
    // Rotate the div just long enough for the browser to get a screenshot
    // so the element looks like it is being moved
    const {style} = this.getDOMNode();
    style.transform = 'rotate(5deg)';
    style.webkitTransform = 'rotate(5deg)';
    setTimeout(() => {
      style.transform = '';
      style.webkitTransform = '';
    }, 100);

  },
  render() {
    const {card, graph, pullRequest, status, primaryRepoName} = this.props;
    const {issue, repoOwner, repoName} = card;
    const {taskFinishedCount, taskTotalCount} = getTaskCounts(issue.body);

    // Defined by the collector
    const { isDragging, connectDragSource } = this.props;

    // PR updatedAt is updated when commits are pushed
    const updatedAt = pullRequest ? pullRequest.updatedAt : issue.updatedAt;
    const isMergeable = pullRequest ? pullRequest.mergeable : false;
    const isPullRequest = pullRequest || issue.pullRequest;

    if (!issue) {
      return (<span>Maybe moving Issue...</span>);
    }
    const user = issue.assignee ? issue.assignee : issue.user;
    const assignedAvatar = (
      <img
        key='avatar'
        className='avatar-image'
        title={'Click to filter on ' + user.login}
        onClick={() => FilterStore.setUser(user)}
        src={user.avatar.url}/>
    );
    const nonKanbanLabels = _.filter(issue.labels, (label) => {
      if (!KANBAN_LABEL.test(label.name)) {
        return label;
      }
    });
    const labels = _.map(nonKanbanLabels, (label) => {
      const tooltip = (
        <BS.Tooltip id="tooltip-${issue.id}-${label.name}">{label.name}. Click to filter</BS.Tooltip>
      );
      return (
        <BS.OverlayTrigger
          key={label.name}
          placement='top'
          delayShow={1000}
          overlay={tooltip}>
          <LabelBadge
            label={label}
            onClick={() => FilterStore.addLabel(label)}
            />
        </BS.OverlayTrigger>
      );
    });
    let taskCounts = null;
    if (taskTotalCount) {
      const taskListPopover = (
        <BS.Popover id="popover-${issue.id}-task-list" className='task-list-details' title='Task List'>
          <GithubFlavoredMarkdown
            disableLinks={false}
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.body}/>
        </BS.Popover>
      );

      taskCounts = (
        <BS.OverlayTrigger
          rootClose
          trigger={['click', 'focus']}
          placement='bottom'
          overlay={taskListPopover}>
          <span className='task-list-overview'>
            <i className='fa fa-check-square-o'/>
            {taskFinishedCount}/{taskTotalCount}
          </span>
        </BS.OverlayTrigger>
      );
    }

    const lastViewed = Store.getLastViewed(repoOwner, repoName, issue.number);
    const isUpdated = lastViewed < updatedAt;

    let relatedIssues = null;
    let relatedPullRequests = null;
    relatedIssues = _.map(graph.getB(graph.cardToKey(card)), (issueCard) => {
      return (
        <span className='related-issue'>
          <IssueOrPullRequestBlurb card={issueCard} primaryRepoName={primaryRepoName} context='fixes'/>
        </span>
      );
    });
    relatedPullRequests = _.map(graph.getA(graph.cardToKey(card)), (issueCard) => {
      return (
        <span className='related-issue'>
          <IssueOrPullRequestBlurb card={issueCard} primaryRepoName={primaryRepoName} context='fixed by'/>
        </span>
      );
    });

    const header = [
      <div className='issue-labels'>
        {labels}
      </div>,
      <div className='related-issues'>
        {relatedIssues}
        {relatedPullRequests}
      </div>,
      <a
        key='link'
        target='_blank'
        href={issue.html.url}
        onClick={this.onClickNumber}>
          {issue.title}</a>
    ];
    const classes = {
      'issue': true,
      'is-dragging': isDragging,
      'is-updated': isUpdated,
      'is-pull-request': !!pullRequest,
      'is-mergeable': isMergeable
    };
    return connectDragSource(
      <BS.ListGroupItem
        key={issue.id}
        data-status-state={status ? status.state : null}
        header={header}
        onDragStart={this.onDragStart}
        className={classes}>

        <IssueOrPullRequestBlurb card={card} primaryRepoName={primaryRepoName} />
        {taskCounts}
        <span key='right-footer' className='pull-right'>
          <Time key='time' className='updated-at' dateTime={updatedAt}/>
          {assignedAvatar}
        </span>

      </BS.ListGroupItem>
    );
  }
});


Issue = DragSource(ItemTypes.CARD, issueSource, collect)(Issue);

// Wrap the issue possibly in a Loadable so we can determine if the Pull Request
// has merge conflicts.
// `GET .../issues` returns an object with `labels` and
// `GET .../pulls` returns an object with `mergeable` so for Pull Requests
// we have to get both.
const IssueShell = React.createClass({
  render() {
    const {card} = this.props;
    const {issue, pullRequestDelayedPromise} = card;
    if (pullRequestDelayedPromise) {
      return (
        <Loadable key={issue.id}
          promise={pullRequestDelayedPromise()}
          renderLoading={() => <Issue key={issue.id} {...this.props}/>}
          renderError={() => <Issue key={issue.id} {...this.props}/>}
          renderLoaded={({pullRequest, statuses}) => <Issue key={issue.id} {...this.props} pullRequest={pullRequest} status={statuses ? statuses[0] : null}/> }
        />
      );
    } else {
      return (
        <Issue key={issue.id} {...this.props}/>
      );
    }

  }
});

// Export the wrapped version
export default IssueShell;
