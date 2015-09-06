import * as BS from 'react-bootstrap';
import React from 'react';

const LabelBadge = React.createClass({
  render() {
    const {label} = this.props;

    return (
      <BS.Badge
        key={label.name}
        {...this.props}
        style={{backgroundColor: label.color}}>
        {label.name}
      </BS.Badge>
    );
  }
});

export default LabelBadge;
