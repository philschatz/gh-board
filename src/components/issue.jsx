import React from 'react';
import ReactDOM from 'react-dom';
import * as BS from 'react-bootstrap';
import _ from 'underscore';
import { DragSource } from 'react-dnd';
import classnames from 'classnames';
import {Link} from 'react-router';

import {getFilters} from '../route-utils';
import IssueStore from '../issue-store';
import {getTaskCounts, getIssueDueAt, PULL_REQUEST_ISSUE_RELATION} from '../gfm-dom';
import Loadable from './loadable';
import GithubFlavoredMarkdown from './gfm';
import Time from './time';
import LabelBadge from './label-badge';
import IssueOrPullRequestBlurb from './issue-blurb';

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
    const {card, primaryRepoName} = monitor.getItem();
    const dropResult = monitor.getDropResult();

    if (dropResult.label) {
      IssueStore.tryToMoveLabel(card, primaryRepoName, dropResult.label);
    } else if (dropResult.milestone){
      IssueStore.tryToMoveMilestone(card, primaryRepoName, dropResult.milestone);
    } else {
      throw new Error('BUG: Only know how to move to a kanban label or a milestone');
    }

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
  componentWillMount() {
    const {card} = this.props;
    if (!card.isLoaded()) { card.load(); }
    // TODO: Not sure why React no longer automatically binds all functions to `this`
    this._changeListener = this.forceUpdate.bind(this);
    card.onChange(this._changeListener);
  },
  componentWillUnmount() {
    const {card} = this.props;
    card.offChange(this._changeListener);
  },
  update(issue) {
    this.setState({issue});
  },
  onDragStart() {
    // Rotate the div just long enough for the browser to get a screenshot
    // so the element looks like it is being moved
    const {style} = ReactDOM.findDOMNode(this);
    style.transform = 'rotate(5deg)';
    style.webkitTransform = 'rotate(5deg)';
    setTimeout(() => {
      style.transform = '';
      style.webkitTransform = '';
    }, 100);

  },
  render() {
    const {card, primaryRepoName, columnRegExp} = this.props;
    const {issue, repoOwner, repoName} = card;
    // TODO: Maybe the following 2 should be methods on the card
    const {taskFinishedCount, taskTotalCount} = getTaskCounts(issue.body);
    const issueDueAt = getIssueDueAt(issue.body);

    // Defined by the collector
    const { isDragging, connectDragSource } = this.props;

    // PR updatedAt is updated when commits are pushed
    const updatedAt = card.getUpdatedAt();

    if (!issue) {
      return (<span>Maybe moving Issue...</span>);
    }
    const user = issue.assignee ? issue.assignee : issue.user;
    const assignedAvatar = (
      <Link to={getFilters().toggleUserName(user.login).url()}>
        <img
          key='avatar'
          className='avatar-image'
          title={'Click to filter on ' + user.login}
          src={user.avatar.url}/>
      </Link>
    );
    const nonKanbanLabels = _.filter(issue.labels, (label) => {
      if (!columnRegExp || !columnRegExp.test(label.name)) {
        return label;
      }
    });
    const labels = _.map(nonKanbanLabels, (label) => {
      const tooltip = (
        <BS.Tooltip id={`tooltip-${card.key()}-${label.name}`}>{label.name}. Click to filter</BS.Tooltip>
      );
      return (
        <BS.OverlayTrigger
          key={label.name}
          placement='top'
          delayShow={1000}
          overlay={tooltip}>
          <LabelBadge isClickable label={label}/>
        </BS.OverlayTrigger>
      );
    });
    let taskCounts = null;
    if (taskTotalCount) {
      const taskListPopover = (
        <BS.Popover
          key={`popover-${card.key()}-task-list`}
          id={`popover-${card.key()}-task-list`}
          className='task-list-details'
          title='Task List'>
          <GithubFlavoredMarkdown
            disableLinks={false}
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.body}/>
        </BS.Popover>
      );

      const taskCountsClasses = {
        'task-list-overview': true,
        'pull-right': true,
        'is-done': taskFinishedCount === taskTotalCount,
      };
      taskCounts = (
        <BS.OverlayTrigger
          key='task-list'
          rootClose
          trigger={['click', 'focus']}
          placement='bottom'
          overlay={taskListPopover}>
          <span className={classnames(taskCountsClasses)}>
            <i className='octicon octicon-checklist'/>
            {`${taskFinishedCount}/${taskTotalCount}`}
          </span>
        </BS.OverlayTrigger>
      );
    }
    const shouldShowMilestone = (
      // issue.milestone && getFilters().getState().milestoneTitles.length !== 1
      // Make this always show the milestone since they can be excluded so
      // checking if there is only 1 item in the array is not enough
      issue.milestone
    );
    let milestone = null;
    if (shouldShowMilestone) {
      const openCount = issue.milestone.openIssues;
      const closedCount = issue.milestone.closedIssues;
      const totalCount = openCount + closedCount;
      const milestonePopover = (
        <BS.Popover
          id={`popover-${card.key()}-milestone`}
          className='milestone-details'
          title='Milestone Details'>
          <h4>
            <a target='_blank' href={issue.milestone.html.url}>
              <GithubFlavoredMarkdown
                inline
                disableLinks={true}
                repoOwner={repoOwner}
                repoName={repoName}
                text={issue.milestone.title}/>
            </a>
          </h4>
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
        <span className='issue-milestone badge'>
          <BS.OverlayTrigger
            rootClose
            trigger={['click', 'focus']}
            placement='bottom'
            overlay={milestonePopover}>
            <i className='milestone-icon octicon octicon-milestone'/>
          </BS.OverlayTrigger>
          <Link className='milestone-title' to={getFilters().toggleMilestoneTitle(issue.milestone.title).url()}>
            <GithubFlavoredMarkdown
              inline
              disableLinks={true}
              repoOwner={repoOwner}
              repoName={repoName}
              text={issue.milestone.title}/>
          </Link>
        </span>
      );
    }


    // stop highlighting after 5min
    const isUpdated = Date.now() - updatedAt.getTime() < 2 * 60 * 1000;

    const relatedCards = _.map(card.getRelated(), ({vertex: issueCard, edgeValue}) => {
      const context = issueCard.isPullRequest() ? PULL_REQUEST_ISSUE_RELATION[edgeValue] : edgeValue;
      return (
        <div key={issueCard.key()} className='related-issue'>
          <IssueOrPullRequestBlurb
            card={issueCard}
            primaryRepoName={card.repoName}
            context={context}/>
          <span className='related-issue-title'>{issueCard.issue.title}</span>
        </div>
      );
    });

    const header = [
      <IssueOrPullRequestBlurb key='issue-blurb'
        card={card}
        primaryRepoName={primaryRepoName} />,
      taskCounts
    ];
    const classes = {
      'issue': true,
      'is-dragging': isDragging,
      'is-updated': isUpdated,
      'is-pull-request': card.isPullRequest(),
      'is-mergeable': card.isPullRequest() && card.isPullRequestMergeable()
    };
    let statusBlurb;
    if (card.isPullRequest()) {
      const statusClasses = {
        'issue-status': true,
        'is-mergeable': card.isPullRequestMergeable()
      };
      const status = card.getPullRequestStatus();
      let statusIcon;
      let statusText;
      // pending, success, error, or failure
      switch (status.state) {
        case 'pending':
          statusIcon = (<i className='status-icon octicon octicon-primitive-dot'/>);
          statusText = 'Testing...';
          break;
        case 'error':
        case 'failure':
          statusIcon = (<i className='status-icon octicon octicon-x'/>);
          statusText = 'Tests Failed';
          break;
        default:

      }
      if (statusIcon || statusText) {
        if (status.targetUrl) {
          statusBlurb = (<a target='_blank' className={classnames(statusClasses)} data-status-state={status.state} href={status.targetUrl} title={status.description}>{statusIcon}{' '}{statusText}</a>);
        } else {
          statusBlurb = (<span className={classnames(statusClasses)} data-status-state={status.state} title={status.description}>{statusIcon}{' '}{statusText}</span>);
        }

      }
    }

    let dueAt;
    if (issueDueAt) {
      const dueAtClasses = {
        'issue-due-at': true,
        'is-overdue': issueDueAt < Date.now(),
        'is-near': issueDueAt > Date.now() && issueDueAt - Date.now() < 7 * 24 * 60 * 60 * 1000 // set it to be 1 week
      }
      dueAt = (
        <span className={classnames(dueAtClasses)}>
          <i className='octicon octicon-calendar'/>
          {' due '}
          <Time dateTime={issueDueAt}/>
        </span>
      );
    }

    return connectDragSource(
      <div className='-drag-source'>
        <BS.ListGroupItem
          key={card.key()}
          data-status-state={card.isPullRequest() ? card.getPullRequestStatus() : null}
          header={header}
          onDragStart={this.onDragStart}
          className={classnames(classes)}
          data-state={issue.state}>

          <a
            key='link'
            className='issue-title'
            target='_blank'
            href={issue.html.url}>
            <GithubFlavoredMarkdown
              inline
              disableLinks={true}
              repoOwner={repoOwner}
              repoName={repoName}
              text={issue.title}/>
          </a>

          <span key='labels' className='issue-labels'>
            {milestone}
            {labels}
          </span>
          <span className='issue-footer'>
            {statusBlurb}
            {dueAt}
            <span key='right-footer' className='issue-time-and-user'>
              <Time key='time' className='updated-at' dateTime={updatedAt}/>
              {assignedAvatar}
            </span>
          </span>
        </BS.ListGroupItem>
        <div key='related' className='related-issues'>
          {relatedCards}
        </div>
      </div>
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
    if (card.isLoaded()) {
      return (
        <Issue key={card.key()} {...this.props}/>
      );
    } else {
      return (
        <Loadable
          key={card.key()}
          promise={card.load()}
          loadingText={card.key()}
          renderLoaded={() => <Issue key={card.key()} {...this.props} />}
        />
      );
    }
  }
});

// Export the wrapped version
export default IssueShell;
