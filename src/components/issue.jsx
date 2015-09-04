import React from 'react';
import BS from './rbs';
import _ from 'underscore';
import { DragSource } from 'react-dnd';

import {Store, toIssueKey} from '../issue-store';
import GithubFlavoredMarkdown from './gfm.jsx';
import Time from './time.jsx';

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



const Issue = React.createClass({
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
    Store.setLastViewed(repoOwner, repoName, issue);
  },
  render() {
    const {repoOwner, repoName, isPullRequest} = this.props;
    const {issue} = this.state;

    // Defined by the collector
    const { isDragging, connectDragSource } = this.props;

    let assignedAvatar = null;
    if (!issue) {
      return (<span>Bug? No Issue</span>);
    }
    if (issue.assignee) {
      assignedAvatar = (
        <img key='avatar' className='avatar-image' src={issue.assignee.avatar.url}/>
      );
    } else {
      assignedAvatar = (
        <img key='avatar' className='avatar-image' src={issue.user.avatar.url}/>
      );
    }
    let icon;
    if (isPullRequest) {
      icon = (
        <i key='pullrequest' className='is-open mega-octicon octicon-git-pull-request'/>
      );
    // } else {
    //   icon = (
    //     <i className='is-open mega-octicon octicon-issue-opened'/>
    //   );
    }
    const bodyPopover = (
      <BS.Popover id="popover-${issue.id}" className='issue-body' title='Issue Description'>
        <GithubFlavoredMarkdown
          disableLinks={true}
          repoOwner={repoOwner}
          repoName={repoName}
          text={issue.body}/>
      </BS.Popover>
    );
    const footer = [
          assignedAvatar,
          icon,
          <BS.OverlayTrigger key='issue-number' trigger={['click', 'focus']} placement='bottom' overlay={bodyPopover}>
            <span className='issue-number'>#{issue.number}</span>
          </BS.OverlayTrigger>
    ];
    const lastViewed = Store.getLastViewed(repoOwner, repoName, issue.number);
    const isUpdated = lastViewed < issue.updatedAt;
    const isBlocked = _.filter(issue.labels, (label) => {
      return label.name.toLowerCase() === 'blocked';
    }).length > 0;
    const header = [
      <a
        key='link'
        target='_blank'
        href={issue.html.url}
        onClick={this.onClickNumber}>
          {issue.title}</a>,
      <Time key='time' className='updated-at pull-right' dateTime={issue.updatedAt}/>
    ];
    const classes = {
      'issue': true,
      'is-dragging': isDragging,
      'is-updated': isUpdated,
      'is-blocked': isBlocked,
      'is-pull-request': isPullRequest,
      'is-mergeable': issue.mergeable
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

// Export the wrapped version
export default DragSource(ItemTypes.CARD, issueSource, collect)(Issue);
