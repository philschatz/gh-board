import * as BS from 'react-bootstrap';
import React from 'react';

const LabelBadge = React.createClass({
  render() {
    const {label, children, onClick} = this.props;

    return (
      <BS.Badge
        key={label.name}
        onClick={onClick}
        style={{backgroundColor: label.color}}>
        {label.name}
        {children}
      </BS.Badge>
    );
  }
});

export default LabelBadge;
