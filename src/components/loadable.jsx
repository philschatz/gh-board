import React from 'react';

const STATUS = {
  INITIAL: 'initial',
  RESOLVED: 'resolved',
  ERROR: 'error'
};

export default React.createClass({
  displayName: 'Loadable',
  getInitialState() {
    return {status: STATUS.INITIAL, value: null};
  },
  getDefaultProps() {
    return {
      renderError: (err) => {
        console.error(err);
        // If it is a permissions error then it might be a rate limi
        if (err.status === 403) {
          return (
            <div>
              <h2>Insufficient Permissions (or rate limit exceeded)</h2>
              <p>
                It looks like either you do not have permission to see this repository or the rate limit for requests to GitHub has been exceeded. This usually happens when you are not logged in to gh-board. Try signing in to continue.
              </p>
              <code>{err.message}</code>
            </div>
          );
        } else if (err.name === 'InvalidStateError') {
          return (
            <span>It looks like your browser is in private browsing mode. gh-board uses IndexedDB to cache requests to GitHub. Please disable Private Browsing to see it work.</span>
          );
        } else {
          return (
            <span>
              Problem loading. Is it a valid repo? And have you exceeded your number of requests? Usually happens when not logged in because GitHub limits anonymous use of their API.
              {err.message}
              {JSON.stringify(err)}
            </span>
          );
        }
      }
    };
  },
  componentDidMount() {
    const {promise} = this.props;
    promise.then(this.onResolve, this.onError);
  },
  componentDidUpdate(prevProps) {
    if (this.props.promise !== prevProps.promise) {
      const {promise} = this.props;
      promise.then(this.onResolve, this.onError);
    }
  },
  onResolve(value) {
    // TODO: Find out why this is being called multiple times
    this.setState({status: STATUS.RESOLVED, value});
  },
  onError(value) {
    // TODO: Find out why this is being called multiple times
    if (this.state.status !== STATUS.ERROR) {
      this.setState({status: STATUS.ERROR, value});
    }
  },
  renderLoading() {
    const {loadingText} = this.props;
    return (
      <span className='loadable is-loading'>
        <i className='octicon octicon-sync icon-spin'/>
        {' ' + (loadingText || 'Loading...')}
      </span>
    );
  },
  render() {
    const {status, value} = this.state;
    let {renderLoading, renderLoaded, renderError} = this.props;

    renderLoading = renderLoading || this.renderLoading;

    if (status === STATUS.INITIAL) {
      return renderLoading();
    } else if (status === STATUS.RESOLVED) {
      return renderLoaded(value);
    } else {
      return renderError(value);
    }
  }
});
