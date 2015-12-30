import {EventEmitter} from 'events';
import React from 'react';
import Moment from 'moment';

const UPDATE_INTERVAL = 20 * 1000;

const timer = new class Store extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
};

// since there can be hundreds of issues, increase the max limit
timer.setMaxListeners(0);

// `tick` every `UPDATE_INTERVAL`
setInterval((() => timer.emit('tick')), UPDATE_INTERVAL);

export default React.createClass({
  getInitialState() {
    // `this.forceUpdate` is not always bound to `this` react component
    // so keep one around for the `tick` handler.
    return {forceUpdate: this.forceUpdate.bind(this)};
  },
  componentWillMount() {
    timer.on('tick', this.state.forceUpdate);
  },
  componentWillUnmount() {
    timer.off('tick', this.state.forceUpdate);
  },
  render() {
    const {dateTime, className} = this.props;
    const humanized = Moment(dateTime).fromNow();
    let dateTimeString;
    try {
      dateTimeString = dateTime.toISOString();
    } catch (e) {
      /*eslint-disable no-console */
      console.warn('Invalid dateTime. Probably from octokat');
      /*eslint-enable no-console */
      dateTimeString = '';
    }

    return (
      <time {...this.props} dateTime={dateTimeString} className={className}>{humanized}</time>
    );
  }
});
