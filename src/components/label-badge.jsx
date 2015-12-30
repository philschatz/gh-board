import * as BS from 'react-bootstrap';
import React from 'react';

import {Link} from 'react-router';
import {getFilters} from '../route-utils';
import {KANBAN_LABEL, isLight} from '../helpers';

const LabelBadge = React.createClass({
  propTypes: {
    label: React.PropTypes.object.isRequired,
    className: React.PropTypes.string,
    extra: React.PropTypes.string
  },
  render() {
    const {label, isClickable} = this.props;
    let {className, extra} = this.props;

    let name;
    let icon;

    className = className || '';
    className += ' badge';

    if (KANBAN_LABEL.test(label.name)) {
      icon = (<i className='octicon octicon-list-unordered'/>);
      name = label.name.replace(/^\d+\ -\ /, ' ');
    } else {
      icon = null;
      name = label.name;
    }
    if (label.color && isLight(label.color)) {
      className = className;
      className += ' ' + 'is-light';
    }
    if (extra) {
      extra = ` (${extra})`;
    }

    if (isClickable) {
      return (
        <Link to={getFilters().toggleTagName(label.name).url()}
          key={name}
          {...this.props}
          className={className}
          style={{backgroundColor: '#' + label.color}}>
          {icon}{name}{extra}
        </Link>
      );
    } else {
      return (
        <BS.Badge
          key={name}
          {...this.props}
          className={className}
          style={{backgroundColor: '#' + label.color}}>
          {icon}{name}{extra}
        </BS.Badge>
      );
    }

  }
});

export default LabelBadge;
