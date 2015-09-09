import React from 'react';
import * as BS from 'react-bootstrap';
import _ from 'underscore';
import { DragSource } from 'react-dnd';

import {KANBAN_LABEL} from '../helpers';
import {Store} from '../issue-store';
import {FilterStore} from '../filter-store';
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
  // getKey(props) {
  //   const {repoOwner, repoName, issue} = props;
  //   const issueNumber = issue.number;
  //   const key = toIssueKey(repoOwner, repoName, issueNumber);
  //   return key;
  // },
  // Calculates the task list count by rendering the Markdown in the DOM and
  // then counting the number of `<li>[x] ...</li>` elements
  calculateTaskListCount() {
    // Find the task list count
    const {tasklistHtml} = this.refs;
    if (!tasklistHtml) { return; }
    let taskFinishedCount = 0;
    let taskUnfinishedCount = 0;
    _.each(tasklistHtml.getDOMNode().querySelectorAll('li'), (listItem) => {
      if (/^\[x\]\ /.test(listItem.textContent)) {
        taskFinishedCount++;
      } else if (/^\[\ \]\ /.test(listItem.textContent)) {
        taskUnfinishedCount++;
      }
    });
    const taskTotalCount = taskFinishedCount + taskUnfinishedCount;
    if (taskTotalCount) {
      this.setState({taskFinishedCount, taskTotalCount});
    }
  },
  // componentDidMount() {
  //   const key = this.getKey(this.props);
  //   Store.on('change:' + key, this.update);
  //   this.calculateTaskListCount();
  // },
  // componentDidUpdate(oldProps) {
  //   const newKey = this.getKey(this.props);
  //   const oldKey = this.getKey(oldProps);
  //   if (newKey !== oldKey) {
  //     Store.on('change:' + newKey, this.update);
  //     Store.off('change:' + oldKey, this.update);
  //   }
  //   // this.calculateTaskListCount();
  // },
  // componentWillUnmount() {
  //   const key = this.getKey(this.props);
  //   Store.off('change:' + key, this.update);
  // },
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
    const {card, pullRequest, status, primaryRepoName} = this.props;
    const {issue, repoOwner, repoName} = card;
    const {taskFinishedCount, taskTotalCount} = this.state;

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
        title={user.login}
        onClick={() => FilterStore.setUser(user)}
        src={user.avatar.url}/>
    );
    let icon;
    if (pullRequest) {
      if (!isMergeable) {
        icon = (
          <i key='icon' title='Merge Conflict' className='issue-icon octicon octicon-git-pull-request'/>
        );
      }
    } else if (!issue.pullRequest) {
      icon = (
        <i key='icon' title='GitHub Issue' className='issue-icon octicon octicon-issue-opened'/>
      );
    }
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
    const bodyPopover = (
      <BS.Popover id="popover-${issue.id}" className='issue-body' title='Issue Description'>
        <GithubFlavoredMarkdown
          disableLinks={true}
          repoOwner={repoOwner}
          repoName={repoName}
          text={issue.body}/>
      </BS.Popover>
    );
    let taskCounts = null;
    if (taskTotalCount) {
      taskCounts = (
        <span className='task-list'>
          <i className='fa fa-check-square-o'/>
          {taskFinishedCount}/{taskTotalCount}
        </span>
      );
    }

    const multipleRepoName = primaryRepoName === repoName ? null : repoName;
    const footer = (
      <span key='footer' className='issue-footer'>
        {icon}
        <BS.OverlayTrigger
          key='issue-number'
          rootClose
          trigger={['click', 'focus']}
          placement='bottom'
          overlay={bodyPopover}>
          <span className='issue-number'>{multipleRepoName}#{issue.number}</span>
        </BS.OverlayTrigger>
        {taskCounts}
        <span key='right-footer' className='pull-right'>
          <Time key='time' className='updated-at' dateTime={updatedAt}/>
          {assignedAvatar}
        </span>
      </span>
    );
    const lastViewed = Store.getLastViewed(repoOwner, repoName, issue.number);
    const isUpdated = lastViewed < updatedAt;
    // Calculates the task list count by rendering the Markdown in the DOM and
    // then counting the number of `<li>[x] ...</li>` elements
    const hiddenTaskListCount = (
      <div className='hidden-tasklist-count'>
        <GithubFlavoredMarkdown
          disableLinks={true}
          repoOwner={repoOwner}
          repoName={repoName}
          ref='tasklistHtml'
          text={issue.body}/>
      </div>
    );
    const header = [
      <div className='issue-labels'>
        {labels}
      </div>,
      hiddenTaskListCount,
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
        {footer}
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
          renderLoaded={({pullRequest, statuses}) => <Issue key={issue.id} {...this.props} pullRequest={pullRequest} status={statuses[0]}/> }
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
