import * as BS from 'react-bootstrap';
import React from 'react';

import {KANBAN_LABEL, isLight} from '../helpers';

const LabelBadge = React.createClass({
  propTypes: {
    label: React.PropTypes.object.isRequired,
    className: React.PropTypes.string
  },
  render() {
    const {label} = this.props;
    let {className} = this.props;

    let name;
    let icon;

    if (KANBAN_LABEL.test(label.name)) {
      icon = (<i className='octicon octicon-list-unordered'/>);
      name = label.name.replace(/^\d+\ -\ /, ' ');
    } else {
      icon = null;
      name = label.name;
    }
    if (label.color && isLight(label.color)) {
      className = className || '';
      className += ' ' + 'is-light';
    }



    return (
      <BS.Badge
        key={name}
        {...this.props}
        className={className}
        style={{backgroundColor: '#' + label.color}}>
        {icon}
        {name}
      </BS.Badge>
    );
  }
});

export default LabelBadge;
