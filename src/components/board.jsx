import React from 'react'
import { connect } from 'react-redux'
import * as BS from 'react-bootstrap'
import { SyncIcon } from 'react-octicons'

import { fetchIssues } from '../redux/ducks/issue'
import Loadable from './loadable'
import Progress from '../progress'

const ProgressView = React.createClass({
  getInitialState() {
    return { message: null, ticks: 0, max: 0 }
  },
  componentDidMount() {
    const { progress } = this.props
    progress.on('start', this.onStart)
    progress.on('tick', this.onTick)
    progress.on('stop', this.onStop)
  },
  componentWillUnmount() {
    const { progress } = this.props
    progress.off('start', this.onStart)
    progress.off('tick', this.onTick)
    progress.off('stop', this.onStop)
  },
  onStart(context) {
    this.setState({
      max: this.props.progress.max,
      message: 'Start: ' + context,
    })
  },
  onTick(context, ticks, max) {
    this.setState({ ticks: ticks, max: max, message: context })
    this.forceUpdate()
  },
  onStop(context) {
    this.setState({
      ticks: this.props.progress.ticks,
      max: this.props.progress.max,
      message: 'Finished: ' + context,
    })
  },
  render() {
    const { ticks, max } = this.state
    const { message } = this.state
    const label = `${ticks}/${max}`

    // TODO: Use Loadable component
    return (
      <div className="is-loading">
        <BS.ProgressBar now={ticks} max={max} label={label} />
        <SyncIcon className="icon-spin" /> {message}
      </div>
    )
  },
})

const Board = React.createClass({
  propTypes: {
    type: React.PropTypes.func.isRequired, // A React Component
    repoInfos: React.PropTypes.array.isRequired,
    columnDataPromise: React.PropTypes.object.isRequired,
    dispatch: React.PropTypes.func,
  },
  componentWillMount() {
    this._promise = this.props.dispatch(fetchIssues(this.props.repoInfos))
  },
  // Curried func to squirrell the primaryRepoName var
  renderKanbanRepos(repoInfos) {
    const { type } = this.props

    return ([columnData, cards]) => {
      if (cards.length) {
        return React.createElement(type, { columnData, cards, repoInfos })
      } else {
        return (
          <div className="-no-issues">
            <h2>No Issues to show</h2>
            <p>
              There are no Issues to show. Maybe the repository does not have
              any or an applied filter removes all Issues.
            </p>
          </div>
        )
      }
    }
  },
  renderError(err) {
    console.error(err)
    if (err.name === 'InvalidStateError') {
      return (
        <span>
          It looks like your browser is in private browsing mode. gh-board uses
          IndexedDB to cache requests to GitHub. Please disable Private Browsing
          to see it work.
        </span>
      )
    } else {
      return (
        <span>
          Problem loading. Is it a valid repo? And have you exceeded your number
          of requests? Usually happens when not logged in because GitHub limits
          anonymous use of their API.
          {err.message}
          {JSON.stringify(err)}
        </span>
      )
    }
  },
  render() {
    const { repoInfos, columnDataPromise } = this.props
    const progress = new Progress()

    return (
      <Loadable
        key="board"
        promise={Promise.all([columnDataPromise, this._promise])}
        renderLoading={() => <ProgressView progress={progress} />}
        renderLoaded={this.renderKanbanRepos(repoInfos)}
        renderError={this.renderError}
      />
    )
  },
})

export default connect()(Board)
