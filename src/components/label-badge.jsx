import * as BS from 'react-bootstrap';
import React from 'react';

import {KANBAN_LABEL, isLight} from '../helpers';

const LabelBadge = React.createClass({
  render() {
    const {label} = this.props;
    let {className} = this.props;

    let name;
    if (KANBAN_LABEL.test(label.name)) {
      name = label.name.replace(/^\d+\ -\ /, 'Column: ');
    } else {
      name = label.name;
    }

    if (isLight(label.color)) {
      className = className || '';
      className += ' ' + 'is-light';
    }

    return (
      <BS.Badge
        key={name}
        {...this.props}
        className={className}
        style={{backgroundColor: '#' + label.color}}>
        {name}
      </BS.Badge>
    );
  }
});

export default LabelBadge;
