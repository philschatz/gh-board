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
      renderError: () => <div className='loadable is-error'>Error Loading. Is the repo URL correct? are you connected to the internet? Are you logged in?</div>
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
      <span className='loadable is-loading'><i className='octicon octicon-sync spin'/>{' ' + (loadingText || 'Loading...')}</span>
    )
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
