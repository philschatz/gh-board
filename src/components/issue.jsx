import React from 'react';
import * as BS from 'react-bootstrap';
import _ from 'underscore';
import { DragSource } from 'react-dnd';

import {KANBAN_LABEL} from '../helpers';
import IssueStore from '../issue-store';
import FilterStore from '../filter-store';
import {getTaskCounts, PULL_REQUEST_ISSUE_RELATION} from '../gfm-dom';
import Loadable from './loadable.jsx';
import GithubFlavoredMarkdown from './gfm.jsx';
import Time from './time.jsx';
import LabelBadge from './label-badge.jsx';
import IssueOrPullRequestBlurb from './issue-blurb.jsx';

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
    const {card, graph, primaryRepoName} = monitor.getItem();
    const dropResult = monitor.getDropResult();

    IssueStore.tryToMove(card, graph, primaryRepoName, dropResult.label);
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
    IssueStore.setLastViewed(repoOwner, repoName, issue.number);
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
            <i className='octicon octicon-checklist'/>
            {taskFinishedCount}/{taskTotalCount}
          </span>
        </BS.OverlayTrigger>
      );
    }
    let milestone = null;
    if (issue.milestone) {
      const openCount = issue.milestone.openIssues;
      const closedCount = issue.milestone.closedIssues;
      const totalCount = openCount + closedCount;
      const milestonePopover = (
        <BS.Popover id="popover-${issue.id}-milestone" className='milestone-details' title='Milestone Details'>
          <h4>{issue.milestone.title}</h4>
          <BS.ProgressBar bsStyle='success' now={closedCount} max={totalCount}/>
          <p>{openCount} open {closedCount} closed</p>
          <GithubFlavoredMarkdown
            disableLinks={false}
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.milestone.description}/>
        </BS.Popover>
      );
      milestone = (
        <span className='issue-milestone'>
          <BS.OverlayTrigger
            rootClose
            trigger={['click', 'focus']}
            placement='bottom'
            overlay={milestonePopover}>
            <i className='milestone-icon octicon octicon-milestone'/>
          </BS.OverlayTrigger>
          <span className='milestone-title'>{issue.milestone.title}</span>
        </span>
      );
    }


    const lastViewed = IssueStore.getLastViewed(repoOwner, repoName, issue.number);
    const isUpdated = lastViewed < updatedAt;

    let relatedIssues = null;
    let relatedPullRequests = null;
    relatedIssues = _.map(graph.getB(graph.cardToKey(card)), ({vertex: issueCard, edgeValue}) => {
      return (
        <span className='related-issue'>
          <IssueOrPullRequestBlurb card={issueCard} primaryRepoName={primaryRepoName} context={edgeValue || 'related to'}/>
        </span>
      );
    });
    relatedPullRequests = _.map(graph.getA(graph.cardToKey(card)), ({vertex: issueCard, edgeValue}) => {
      return (
        <span className='related-issue'>
          <IssueOrPullRequestBlurb card={issueCard} primaryRepoName={primaryRepoName} context={PULL_REQUEST_ISSUE_RELATION[edgeValue] || 'related to'}/>
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
        {milestone}
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
