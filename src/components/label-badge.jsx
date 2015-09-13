import * as BS from 'react-bootstrap';
import React from 'react';

import {KANBAN_LABEL} from '../helpers';

// http://alienryderflex.com/hsp.html
function isLight(hexColor) {
  const color = {
    r: parseInt(hexColor.substring(0, 2), 16),
    g: parseInt(hexColor.substring(2, 4), 16),
    b: parseInt(hexColor.substring(4, 6), 16)
  };
  return Math.sqrt(
     color.r * color.r * .299 +
     color.g * color.g * .587 +
     color.b * color.b * .114) >= 130;
}

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
        style={{backgroundColor: label.color}}>
        {name}
      </BS.Badge>
    );
  }
});

export default LabelBadge;
