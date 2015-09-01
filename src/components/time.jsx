import React from 'react';
import Moment from 'moment';

const UPDATE_INTERVAL = 10 * 1000;


const timeouts = {};
let counter = 0;
const nextId = function() { return 'time-id' + counter++; };

const updateAllTimes = function() {
  for (const key in timeouts) {
    timeouts[key]();
  }
};

setInterval(updateAllTimes, UPDATE_INTERVAL);

export default React.createClass({
  componentWillMount() {
    const id = nextId();
    this.setState({id});
    timeouts[id] = this.forceUpdate.bind(this);
  },
  componentWillUnmount() {
    const {id} = this.getState();
    delete timeouts[id];
    this.setState({id: null});
  },
  render() {
    const {dateTime, className} = this.props;
    const humanized = Moment(dateTime).fromNow();

    return (
      <time dateTime={dateTime.toISOString()} className={className}>{humanized}</time>
    );
  }
});
