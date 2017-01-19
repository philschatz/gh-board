import React from 'react';
import * as BS from 'react-bootstrap';
import {SyncIcon} from 'react-octicons';

const ASYNC_UNSTARTED = 'ASYNC_UNSTARTED';
const ASYNC_RESOLVED = 'ASYNC_RESOLVED';
const ASYNC_REJECTED = 'ASYNC_REJECTED';
const ASYNC_WAITING = 'ASYNC_WAITING';


export default React.createClass({
  getInitialState() {
    return {val: null, asyncStatus: ASYNC_UNSTARTED};
  },
  getDefaultProps() {
    return {
      waitingText: 'Saving...'
    };
  },
  componentDidUpdate(oldProps) {
    if (this.props.action !== oldProps.action) {
      this.setState({val: null, asyncStatus: ASYNC_UNSTARTED});
    }
  },
  onResolve(val) {
    const {onResolved} = this.props;
    this.setState({val, asyncStatus: ASYNC_RESOLVED});
    if (onResolved) {
      onResolved(val);
    }
  },
  onReject(val) {
    const {onRejected} = this.props;
    this.setState({val, asyncStatus: ASYNC_REJECTED});
    if (onRejected) {
      onRejected(val);
    }
  },
  onClick() {
    const {action} = this.props;
    this.setState({val: null, asyncStatus: ASYNC_WAITING});
    const p = action();
    // Support non-async
    if (p) {
      p.then(this.onResolve, this.onReject);
    }
  },
  render() {
    const {children, waitingText, renderError, doneText, className, ...rest} = this.props;
    let {disabled} = this.props;
    const {val, asyncStatus} = this.state;

    let kids;
    disabled = disabled || false;
    let classes = {'async-button': true};
    if (className) {
      classes[className] = true;
    }

    if (asyncStatus === ASYNC_UNSTARTED) {
      classes['is-unstarted'] = true;
      kids = children;
    } else if (asyncStatus === ASYNC_WAITING) {
      classes['is-waiting'] = true;
      disabled = true;
      kids = [
        <SyncIcon className='icon-spin' key="icon"/>,
        <span key="text">{waitingText}</span>
      ];
    } else if (asyncStatus === ASYNC_RESOLVED) {
      classes['is-resolved'] = true;
      if (doneText) {
        kids = doneText;
      } else {
        kids = children;
      }
    } else if (asyncStatus === ASYNC_REJECTED) {
      return renderError(val);
    } else {
      throw new Error('BUG: Invalid async state');
    }
    return (
      <BS.Button {...rest}
        className={classes}
        disabled={disabled}
        onClick={this.onClick}
        >{kids}</BS.Button>
    );
  }
});
