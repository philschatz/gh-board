import * as BS from 'react-bootstrap';
import React from 'react';

import {KANBAN_LABEL} from '../helpers';

const LabelBadge = React.createClass({
  render() {
    const {label} = this.props;

    let name = null;
    if (KANBAN_LABEL.test(label.name)) {
      name = label.name.replace(/^\d+\ -\ /, 'Column: ');
    } else {
      name = label.name;
    }

    return (
      <BS.Badge
        key={name}
        {...this.props}
        style={{backgroundColor: label.color}}>
        {name}
      </BS.Badge>
    );
  }
});

export default LabelBadge;
