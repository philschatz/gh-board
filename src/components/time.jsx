import React from 'react';
import Moment from 'moment';

export default React.createClass({
  render() {
    const {dateTime} = this.props;
    const humanized = Moment(dateTime).fromNow();

    return (
      <time dateTime={dateTime.toISOString()}>{humanized}</time>
    );
  }
});
