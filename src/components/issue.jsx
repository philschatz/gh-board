import React from 'react'
import ReactDOM from 'react-dom'
import * as BS from 'react-bootstrap'
import _ from 'underscore'
import { connect } from 'react-redux'
import { DragSource } from 'react-dnd'
import classnames from 'classnames'
import { Link } from 'react-router'
import {
  CalendarIcon,
  ChecklistIcon,
  MilestoneIcon,
  CommentIcon,
  AlertIcon,
  CheckIcon,
  PrimitiveDotIcon,
  XIcon,
} from 'react-octicons'

import { tryToMoveIssue } from '../redux/ducks/issue'
import { PULL_REQUEST_ISSUE_RELATION } from '../gfm-dom'

import Loadable from './loadable'
import GithubFlavoredMarkdown from './gfm'
import Time, { Timer } from './time'
import LabelBadge from './label-badge'
import IssueOrPullRequestBlurb from './issue-blurb'

const ItemTypes = {
  CARD: 'card',
}

const issueSource = {
  beginDrag(props) {
    // Return the data describing the dragged item
    const item = props
    return item
  },

  endDrag(props, monitor) {
    if (!monitor.didDrop()) {
      return
    }

    // When dropped on a compatible target, do something
    const { card, primaryRepoName } = monitor.getItem()
    const dropResult = monitor.getDropResult()

    if (dropResult.label) {
      props.dispatch(
        tryToMoveIssue({ card, primaryRepoName, label: dropResult.label })
      )
    } else if (dropResult.milestone) {
      props.dispatch(
        tryToMoveIssue({
          card,
          primaryRepoName,
          milestone: dropResult.milestone,
        })
      )
    } else if (dropResult.title === 'No Milestone') {
      alert(
        'BUG: gh-board is currently unable to remove a milestone. Help us out by submitting a Pull Request!'
      )
    } else {
      throw new Error(
        'BUG: Only know how to move to a kanban label or a milestone'
      )
    }
  },
}

function collect(connect, monitor) {
  return {
    // Call this function inside render()
    // to let React DnD handle the drag events:
    connectDragSource: connect.dragSource(),
    // You can ask the monitor about the current drag state:
    isDragging: monitor.isDragging(),
  }
}

class IssueSimple extends React.Component {
  render() {
    const { card, filters } = this.props
    const { issue, repoOwner, repoName } = card

    const issueDueAt = card.getDueAt()

    // Defined by the collector
    const { isDragging } = this.props

    // PR updatedAt is updated when commits are pushed
    const updatedAt = card.getUpdatedAt()

    const user = issue.assignee
    let assignedAvatar
    if (user) {
      assignedAvatar = (
        <Link
          to={filters.toggleUserName(user.login).url()}
          className="avatar-filter"
        >
          <img
            key="avatar"
            className="avatar-image"
            title={'Click to filter on ' + user.login}
            src={user.avatarUrl}
          />
        </Link>
      )
    }

    // stop highlighting after 5min
    const isUpdated = Date.now() - Date.parse(updatedAt) < 2 * 60 * 1000

    let dueAt
    if (issueDueAt) {
      const dueAtClasses = {
        'issue-due-at': true,
        'is-overdue': issueDueAt < Date.now(),
        'is-near':
          issueDueAt > Date.now() &&
          issueDueAt - Date.now() < 7 * 24 * 60 * 60 * 1000, // set it to be 1 week
      }
      dueAt = (
        <span className={classnames(dueAtClasses)}>
          <CalendarIcon />
          {' due '}
          <Time dateTime={issueDueAt} />
        </span>
      )
    } else {
      // Click to add due date
    }

    const classes = {
      issue: true,
      'is-simple-list': true,
      'is-dragging': isDragging,
      'is-updated': isUpdated,
      'is-pull-request': card.isPullRequest(),
      'is-merged': card.isPullRequestMerged(),
      'is-merge-conflict': card.isPullRequest() && card.hasMergeConflict(),
      'is-pull-request-to-different-branch':
        card.isPullRequest() && !card.isPullRequestToDefaultBranch(),
    }
    return (
      <BS.ListGroupItem
        data-status-state={
          card.isPullRequest() ? card.getPullRequestStatus() : null
        }
        onDragStart={this.onDragStart}
        className={classnames(classes)}
        data-state={issue.state}
      >
        {assignedAvatar}
        <a className="issue-title" target="_blank" href={issue.htmlUrl}>
          <GithubFlavoredMarkdown
            className="-issue-title-text"
            inline
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.title}
          />
        </a>
        {dueAt}
        <a className="issue-number" target="_blank" href={issue.htmlUrl}>
          #{issue.number}
        </a>
      </BS.ListGroupItem>
    )
  }
}

class IssueCard extends React.Component {
  render() {
    const { card, primaryRepoName, columnRegExp, filters } = this.props
    const { issue, repoOwner, repoName } = card

    const { taskFinishedCount, taskTotalCount } = card.getTaskCounts()
    const issueDueAt = card.getDueAt()

    // Defined by the collector
    const { isDragging } = this.props

    // PR updatedAt is updated when commits are pushed
    const updatedAt = card.getUpdatedAt()

    const commentsCount = card.getCommentCount()

    const user = issue.assignee ? issue.assignee : issue.user
    const assignedAvatar = (
      <Link to={filters.toggleUserName(user.login).url()}>
        <img
          key="avatar"
          className="avatar-image"
          title={'Click to filter on ' + user.login}
          src={user.avatarUrl}
        />
      </Link>
    )
    const nonKanbanLabels = _.filter(issue.labels, label => {
      if (!columnRegExp || !columnRegExp.test(label.name)) {
        return label
      }
    })
    const labels = _.map(nonKanbanLabels, label => {
      const tooltip = (
        <BS.Tooltip id={`tooltip-${card.key()}-${label.name}`}>
          {label.name}. Click to filter
        </BS.Tooltip>
      )
      return (
        <BS.OverlayTrigger
          key={label.name}
          placement="top"
          delayShow={1000}
          overlay={tooltip}
        >
          <LabelBadge isFilterLink label={label} filters={filters} />
        </BS.OverlayTrigger>
      )
    })
    let taskCounts = null
    if (taskTotalCount) {
      const taskListPopover = (
        <BS.Popover
          key={`popover-${card.key()}-task-list`}
          id={`popover-${card.key()}-task-list`}
          className="task-list-details"
          title="Task List"
        >
          <GithubFlavoredMarkdown
            disableLinks={false}
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.body}
          />
        </BS.Popover>
      )

      const taskCountsClasses = {
        'task-list-overview': true,
        'pull-right': true,
        'is-done': taskFinishedCount === taskTotalCount,
      }
      taskCounts = (
        <BS.OverlayTrigger
          key="task-list"
          rootClose
          trigger={['click', 'focus']}
          placement="bottom"
          overlay={taskListPopover}
        >
          <span className={classnames(taskCountsClasses)}>
            <ChecklistIcon />
            {`${taskFinishedCount}/${taskTotalCount}`}
          </span>
        </BS.OverlayTrigger>
      )
    }
    const shouldShowMilestone =
      // issue.milestone && getFilters().getState().milestoneTitles.length !== 1
      // Make this always show the milestone since they can be excluded so
      // checking if there is only 1 item in the array is not enough
      issue.milestone
    let milestone = null
    if (shouldShowMilestone) {
      const openCount = issue.milestone.openIssues
      const closedCount = issue.milestone.closedIssues
      const totalCount = openCount + closedCount
      const milestonePopover = (
        <BS.Popover
          id={`popover-${card.key()}-milestone`}
          className="milestone-details"
          title="Milestone Details"
        >
          <h4>
            <a target="_blank" href={issue.milestone.htmlUrl}>
              <GithubFlavoredMarkdown
                inline
                disableLinks={true}
                repoOwner={repoOwner}
                repoName={repoName}
                text={issue.milestone.title}
              />
            </a>
          </h4>
          <BS.ProgressBar
            bsStyle="success"
            now={closedCount}
            max={totalCount}
          />
          <p>
            {openCount} open {closedCount} closed
          </p>
          <GithubFlavoredMarkdown
            disableLinks={false}
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.milestone.description}
          />
        </BS.Popover>
      )
      milestone = (
        <span className="issue-milestone badge is-light">
          <BS.OverlayTrigger
            rootClose
            trigger={['click', 'focus']}
            placement="bottom"
            overlay={milestonePopover}
          >
            <MilestoneIcon className="milestone-icon" />
          </BS.OverlayTrigger>
          <Link
            className="milestone-title"
            to={filters.toggleMilestoneTitle(issue.milestone.title).url()}
          >
            <GithubFlavoredMarkdown
              inline
              disableLinks={true}
              repoOwner={repoOwner}
              repoName={repoName}
              text={issue.milestone.title}
            />
          </Link>
        </span>
      )
    }

    // stop highlighting after 5min
    const isUpdated = Date.now() - Date.parse(updatedAt) < 2 * 60 * 1000

    const relatedCards = _.map(
      card.getRelated(),
      ({ vertex: issueCard, edgeValue }) => {
        const context = issueCard.isPullRequest()
          ? PULL_REQUEST_ISSUE_RELATION[edgeValue]
          : edgeValue
        let title
        if (issueCard.issue) {
          title = (
            <span className="related-issue-title">{issueCard.issue.title}</span>
          )
        }
        return (
          <div key={issueCard.key()} className="related-issue">
            <IssueOrPullRequestBlurb
              filters={filters}
              card={issueCard}
              primaryRepoName={card.repoName}
              context={context}
            />
            {title}
          </div>
        )
      }
    )

    let comments
    if (commentsCount) {
      comments = (
        <span className="comments-count" title="Comments">
          <CommentIcon />{' '}
          <span className="comments-count-number">{commentsCount}</span>
        </span>
      )
    }

    const classes = {
      issue: true,
      'is-dragging': isDragging,
      'is-updated': isUpdated,
      'is-pull-request': card.isPullRequest(),
      'is-merged': card.isPullRequestMerged(),
      'is-merge-conflict': card.isPullRequest() && card.hasMergeConflict(),
      'is-pull-request-to-different-branch':
        card.isPullRequest() && !card.isPullRequestToDefaultBranch(),
    }
    let mergeConflictBlurb
    if (card.isPullRequest() && card.hasMergeConflict()) {
      mergeConflictBlurb = (
        <AlertIcon
          key="merge-conflict"
          className="pull-right merge-conflict-warning"
          title="This has a Merge Conflict"
        />
      )
    }
    let statusBlurb
    if (card.isPullRequest()) {
      const statusClasses = {
        'issue-status': true,
        'pull-right': true,
        'is-merge-conflict': card.hasMergeConflict(),
      }
      const status = card.getPullRequestStatus()
      let statusIcon
      let statusText
      // pending, success, error, or failure
      switch (status.state) {
        case 'success':
          statusIcon = <CheckIcon className="status-icon" />
          break
        case 'pending':
          statusIcon = <PrimitiveDotIcon className="status-icon" />
          statusText = 'Testing...'
          break
        case 'error':
        case 'failure':
          statusIcon = <XIcon className="status-icon" />
          statusText = 'Tests Failed'
          break
        default:
      }
      if (statusIcon || statusText) {
        if (status.targetUrl) {
          statusBlurb = (
            <a
              key="status"
              target="_blank"
              className={classnames(statusClasses)}
              data-status-state={status.state}
              href={status.targetUrl}
              title={status.description}
            >
              {statusIcon} {statusText}
            </a>
          )
        } else {
          statusBlurb = (
            <span
              key="status"
              className={classnames(statusClasses)}
              data-status-state={status.state}
              title={status.description}
            >
              {statusIcon} {statusText}
            </span>
          )
        }
      }
    }

    let dueAt
    if (issueDueAt) {
      const dueAtClasses = {
        'issue-due-at': true,
        'is-overdue': issueDueAt < Date.now(),
        'is-near':
          issueDueAt > Date.now() &&
          issueDueAt - Date.now() < 7 * 24 * 60 * 60 * 1000, // set it to be 1 week
      }
      dueAt = (
        <span className={classnames(dueAtClasses)}>
          <CalendarIcon />
          {' due '}
          <Time dateTime={issueDueAt} />
        </span>
      )
    } else {
      // Click to add due date
    }

    const header = [
      <IssueOrPullRequestBlurb
        key="issue-blurb"
        filters={filters}
        card={card}
        primaryRepoName={primaryRepoName}
      />,
      statusBlurb,
      taskCounts,
      mergeConflictBlurb,
    ]

    let featuredImage
    if (card.getFeaturedImageSrc()) {
      featuredImage = (
        <img className="featured-image" src={card.getFeaturedImageSrc()} />
      )
    }

    const bodyPopover = (
      <BS.Popover
        className="popover-issue-body"
        id={`popover-${card.key()}-body`}
        title={issue.title}
      >
        <GithubFlavoredMarkdown
          repoOwner={repoOwner}
          repoName={repoName}
          text={issue.body}
        />
      </BS.Popover>
    )

    class TitleLink extends React.Component {
      render() {
        const { children } = this.props
        return (
          <BS.OverlayTrigger
            delayShow={2000}
            container={this}
            trigger={['hover', 'focus']}
            placement="bottom"
            overlay={bodyPopover}
          >
            {children}
          </BS.OverlayTrigger>
        )
      }
    }

    return (
      <div className="-card-and-related">
        <BS.ListGroupItem
          key={card.key()}
          data-status-state={
            card.isPullRequest() ? card.getPullRequestStatus() : null
          }
          header={header}
          onDragStart={this.onDragStart}
          className={classnames(classes)}
          data-state={issue.state}
        >
          <TitleLink>
            <span className="-extra-span-for-inline-popover">
              <a
                key="link"
                className="issue-title"
                target="_blank"
                href={issue.htmlUrl}
              >
                <GithubFlavoredMarkdown
                  inline
                  repoOwner={repoOwner}
                  repoName={repoName}
                  text={issue.title}
                />
              </a>
              {featuredImage}
            </span>
          </TitleLink>

          <span key="labels" className="issue-labels">
            {milestone}
            {labels}
          </span>
          <span key="footer" className="issue-footer">
            {dueAt}
            <span key="right-footer" className="issue-time-and-user">
              <Time key="time" className="updated-at" dateTime={updatedAt} />
              {comments}
              {assignedAvatar}
            </span>
          </span>
        </BS.ListGroupItem>
        <div key="related" className="related-issues">
          {relatedCards}
        </div>
      </div>
    )
  }
}

// `GET .../issues` returns an object with `labels` and
// `GET .../pulls` returns an object with `mergeable` so for Pull Requests
// we have to have both to fully render an Issue.
class Issue extends React.Component {
  componentWillMount() {
    const { card } = this.props
    if (!card.isLoaded()) {
      card.load()
    }
    Timer.onTick(this.pollPullRequestStatus)
  }

  componentWillUnmount() {
    Timer.offTick(this.pollPullRequestStatus)
  }

  update = issue => {
    this.setState({ issue })
  }

  pollPullRequestStatus = () => {
    const { card } = this.props
    if (card.isPullRequest()) {
      card.fetchPRStatus(true /*force*/)
    }
  }

  onDragStart = () => {
    // Rotate the div just long enough for the browser to get a screenshot
    // so the element looks like it is being moved
    const { style } = ReactDOM.findDOMNode(this)
    style.transform = 'rotate(5deg)'
    style.webkitTransform = 'rotate(5deg)'
    setTimeout(() => {
      style.transform = ''
      style.webkitTransform = ''
    }, 100)
  }

  render() {
    const {
      card,
      primaryRepoName,
      columnRegExp,
      settings,
      filters,
    } = this.props
    const { isDragging, connectDragSource } = this.props
    const { issue } = card
    let node
    if (!issue) {
      return <span>Maybe moving Issue...</span>
    } else if (settings.isShowSimpleList) {
      node = (
        <IssueSimple card={card} isDragging={isDragging} filters={filters} />
      )
    } else {
      node = (
        <IssueCard
          card={card}
          primaryRepoName={primaryRepoName}
          columnRegExp={columnRegExp}
          isDragging={isDragging}
          filters={filters}
        />
      )
    }
    return connectDragSource(<div className="-drag-source">{node}</div>)
  }
}

const ConnectedIssue = connect(state => {
  return {
    settings: state.settings,
  }
})(DragSource(ItemTypes.CARD, issueSource, collect)(Issue))

// Wrap the issue possibly in a Loadable so we can determine if the Pull Request
// has merge conflicts.
// `GET .../issues` returns an object with `labels` and
// `GET .../pulls` returns an object with `mergeable` so for Pull Requests
// we have to get both.
class IssueShell extends React.Component {
  render() {
    const { card } = this.props
    if (card.isLoaded()) {
      return <ConnectedIssue {...this.props} />
    } else {
      return (
        <Loadable
          key={card.key()}
          promise={card.load()}
          loadingText={card.key()}
          renderLoaded={() => <ConnectedIssue {...this.props} />}
        />
      )
    }
  }
}

// Export the wrapped version
export default IssueShell
