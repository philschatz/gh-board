import React from 'react';
import * as BS from 'react-bootstrap';
import _ from 'underscore';
import { DragSource } from 'react-dnd';

import {KANBAN_LABEL} from '../helpers';
import {Store, toIssueKey} from '../issue-store';
import {CurrentUserStore} from '../user-store';
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
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
    Store.move(item.repoOwner, item.repoName, item.issue.number, dropResult.label);
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
    const {issue} = this.props;
    return {issue};
  },
  update(issue) {
    this.setState({issue});
  },
  getKey(props) {
    const {repoOwner, repoName, issue} = props;
    const issueNumber = issue.number;
    const key = toIssueKey(repoOwner, repoName, issueNumber);
    return key;
  },
  componentDidMount() {
    const key = this.getKey(this.props);
    Store.on('change:' + key, this.update);
  },
  componentDidUpdate(oldProps) {
    const newKey = this.getKey(this.props);
    const oldKey = this.getKey(oldProps);
    if (newKey !== oldKey) {
      Store.on('change:' + newKey, this.update);
      Store.off('change:' + oldKey, this.update);
    }
  },
  componentWillUnmount() {
    const key = this.getKey(this.props);
    Store.off('change:' + key, this.update);
  },
  onClickNumber(evt) {
    const {repoOwner, repoName} = this.props;
    const {issue} = this.state;

    evt.stopPropagation();
    Store.setLastViewed(repoOwner, repoName, issue.number);
  },
  render() {
    const {repoOwner, repoName, pullRequest} = this.props;
    const {issue} = this.state;

    // Defined by the collector
    const { isDragging, connectDragSource } = this.props;

    const isMergeable = pullRequest ? pullRequest.mergeable : false;

    if (!issue) {
      return (<span>Bug? No Issue</span>);
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
      if (isMergeable) {
        icon = (
          <i key='pullrequest' className='is-open octicon octicon-git-merge' style={{color: '#6cc644'}}/>
        );
      } else {
        icon = (
          <i key='pullrequest' className='is-open octicon octicon-git-pull-request' style={{color: '#888'}}/>
        );
      }
    // } else {
    //   icon = (
    //     <i className='is-open mega-octicon octicon-issue-opened'/>
    //   );
    }
    const nonKanbanLabels = _.filter(issue.labels, (label) => {
      if (!KANBAN_LABEL.test(label.name)) {
        return label;
      }
    });
    const labels = _.map(nonKanbanLabels, (label) => {
      const tooltip = (
        <BS.Tooltip>{label.name}</BS.Tooltip>
      );
      return (
        <BS.OverlayTrigger
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
    const footer = (
      <span className='issue-footer'>
        {icon}
        <BS.OverlayTrigger
          key='issue-number'
          rootClose
          trigger={['click', 'focus']}
          placement='bottom'
          overlay={bodyPopover}>
          <span className='issue-number'>#{issue.number}</span>
        </BS.OverlayTrigger>
        <span className='pull-right'>
          <Time key='time' className='updated-at' dateTime={issue.updatedAt}/>
          {assignedAvatar}
        </span>
      </span>
    );
    const lastViewed = Store.getLastViewed(repoOwner, repoName, issue.number);
    const isUpdated = lastViewed < issue.updatedAt;
    const header = [
      <div className='issue-labels'>
        {labels}
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
        header={header}
        className={classes}
        target-todo='_blank'
        href-todo={issue.html.url}
        onClick-todo={this.onClickNumber}>
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
    const {issue, repoOwner, repoName} = this.props;
    if (issue.pullRequest && CurrentUserStore.getUser()) {
      const promise = Store.fetchPullRequest(repoOwner, repoName, issue.number);
      return (
        <Loadable
          key={issue.id}
          promise={promise}
          renderLoading={() => <Issue issue={issue} repoOwner={repoOwner} repoName={repoName}/>}
          renderLoaded={(pullRequest) => <Issue issue={issue} repoOwner={repoOwner} repoName={repoName} pullRequest={pullRequest}/> }
        />
      );
    } else {
      return (
        <Issue issue={issue} repoOwner={repoOwner} repoName={repoName}/>
      );
    }

  }
});

// Export the wrapped version
export default IssueShell;
