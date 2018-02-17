import React from 'react'
import ReactDOM from 'react-dom'
import * as BS from 'react-bootstrap'
import { connect } from 'react-redux'
import { DragSource } from 'react-dnd'
import classnames from 'classnames'
import { Link } from 'react-router'
import {
  CalendarIcon,
  ChecklistIcon,
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
    const { card } = monitor.getItem()
    const dropResult = monitor.getDropResult()

    if (dropResult.label) {
      props.dispatch(tryToMoveIssue({ card, label: dropResult.label }))
    } else if (dropResult.milestone) {
      props.dispatch(
        tryToMoveIssue({
          card,
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

class CardDetailsModal extends React.Component {
  render() {
    const { card, ...rest } = this.props
    const { issue, repoOwner, repoName } = card
    return (
      <BS.Modal className="-add-filter-modal" {...rest}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title>
            <a href={issue.htmlUrl}>
              <span>#{issue.number} </span>
              {issue.title}
            </a>
          </BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Modal.Body>
          <GithubFlavoredMarkdown
            repoOwner={repoOwner}
            repoName={repoName}
            text={issue.body}
          />
        </BS.Modal.Body>
      </BS.Modal>
    )
  }
}

class IssueCard extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showDetails: false,
    }
  }

  render() {
    const { card, primaryRepoName, columnRegExp, filters } = this.props
    const { issue, repoOwner, repoName } = card

    const { taskFinishedCount, taskTotalCount } = card.getTaskCounts()

    // Defined by the collector
    const { isDragging } = this.props

    // PR updatedAt is updated when commits are pushed
    const updatedAt = card.getUpdatedAt()

    const commentsCount = card.getCommentCount()

    const assignedAvatars = (
      issue.assignees || (issue.assignee ? [issue.assignee] : [])
    ).map(user => {
      const link = filters.toggleUserName(user.login).url()
      return (
        <Link key={link} to={link} className="pull-right">
          <img
            className="avatar-image"
            title={'Click to filter on ' + user.login}
            src={user.avatarUrl}
          />
        </Link>
      )
    })

    const nonKanbanLabels = (issue.labels || []).filter(label => {
      if (!columnRegExp || !columnRegExp.test(label.name)) {
        return label
      }
    })
    const labels = nonKanbanLabels.map(label => {
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
      const taskCountsClasses = {
        'task-list-overview': true,
        'is-done': taskFinishedCount === taskTotalCount,
      }
      taskCounts = (
        <span className={classnames(taskCountsClasses)}>
          <ChecklistIcon />
          {`${taskFinishedCount}/${taskTotalCount}`}
        </span>
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
            <GithubFlavoredMarkdown
              inline
              disableLinks={true}
              repoOwner={repoOwner}
              repoName={repoName}
              text={issue.milestone.title}
            />
          </h4>
          <BS.ProgressBar
            bsStyle="success"
            now={closedCount}
            max={totalCount}
          />
          <p>
            {openCount} Open / {closedCount} Closed
          </p>
          <GithubFlavoredMarkdown
            disableLinks={true}
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
            trigger={['hover', 'focus']}
            placement="bottom"
            overlay={milestonePopover}
          >
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
          </BS.OverlayTrigger>
        </span>
      )
    }

    const relatedCards = (card.getRelated() || []).map(
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
              card={issueCard}
              primaryRepoName={card.repoName}
              primaryRepoOwner={card.repoOwner}
              context={context}
            />{' '}
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

    // stop highlighting after 5min
    const isUpdated = Date.now() - Date.parse(updatedAt) < 2 * 60 * 1000
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
    const issueDueAt = card.getDueAt()
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
        card={card}
        primaryRepoName={primaryRepoName}
        primaryRepoOwner={repoOwner}
      />,
      statusBlurb,
    ]
      .concat(assignedAvatars)
      .concat([mergeConflictBlurb])

    let featuredImage
    if (card.getFeaturedImageSrc()) {
      featuredImage = (
        <img className="featured-image" src={card.getFeaturedImageSrc()} />
      )
    }

    return (
      <BS.Panel className="issue-card" onClick={this.showDetails}>
        <BS.Panel.Body
          data-status-state={
            card.isPullRequest() ? card.getPullRequestStatus() : null
          }
          onDragStart={this.onDragStart}
          className={classnames(classes)}
          data-state={issue.state}
        >
          {header}
          <span className="issue-title">
            <GithubFlavoredMarkdown
              inline
              repoOwner={repoOwner}
              repoName={repoName}
              text={issue.title}
            />
          </span>
          {featuredImage}

          <div className="issue-footer">
            {milestone}
            {labels}
            <span className="issue-meta">
              {taskCounts}
              {dueAt}
              <span className="issue-time-and-user">{comments}</span>
            </span>
            <BS.Clearfix />
          </div>
        </BS.Panel.Body>
        {relatedCards.length > 0 && (
          <BS.Panel.Footer className="related-issues">
            {relatedCards}
          </BS.Panel.Footer>
        )}
        <CardDetailsModal
          show={this.state.showDetails}
          onHide={this.hideDetails}
          card={card}
        />
      </BS.Panel>
    )
  }

  showDetails = e => {
    let target = e.target
    while (target) {
      if (
        target.attributes &&
        target.attributes.role &&
        target.attributes.role.textContent === 'dialog'
      ) {
        // if we click on the modal, bail out
        return
      }
      if (target.nodeName === 'A') {
        // if we click on a link, bail out
        return
      }
      // otherwise climb up the tree
      target = target.parentNode
    }
    this.setState({
      showDetails: true,
    })
  }

  hideDetails = () => {
    this.setState({
      showDetails: false,
    })
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
