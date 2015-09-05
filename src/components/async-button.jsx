import React from 'react';
import * as BS from 'react-bootstrap';

const ASYNC_UNSTARTED = Symbol('ASYNC_UNSTARTED');
const ASYNC_RESOLVED = Symbol('ASYNC_RESOLVED');
const ASYNC_REJECTED = Symbol('ASYNC_REJECTED');
const ASYNC_WAITING = Symbol('ASYNC_WAITING');


export default React.createClass({
  displayName: 'AsyncButton',
  getInitialState() {
    return {val: null, asyncStatus: ASYNC_UNSTARTED};
  },
  getDefaultProps() {
    return {
      waitingText: (
        <span>
          <i className='fa fa-spinner fa-spin'/>
          Saving...
        </span>
      )
    };
  },
  componentDidUpdate(oldProps) {
    if (this.props.action !== oldProps.action) {
      this.setState({val: null, asyncStatus: ASYNC_UNSTARTED});
    }
  },
  onResolve(val) {
    this.setState({val, asyncStatus: ASYNC_RESOLVED});
  },
  onReject(val) {
    this.setState({val, asyncStatus: ASYNC_REJECTED});
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
    const {children, waitingText, renderError, doneText, className} = this.props;
    const {val, asyncStatus} = this.state;

    let kids;
    let disabled = false;
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
      kids = waitingText;
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
      <BS.Button {...this.props}
        className={classes}
        disabled={disabled}
        onClick={this.onClick}
        >{kids}</BS.Button>
    );
  }
});
