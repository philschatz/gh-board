import * as BS from 'react-bootstrap';
import PropTypes from 'prop-types';

import {Link} from 'react-router';
import {ListUnorderedIcon, TagIcon} from 'react-octicons';

import {getFilters} from '../route-utils';
import {KANBAN_LABEL, isLight} from '../helpers';

function LabelBadge(props) {
  const {label, isFilterLink, onClick} = props;
  let {className, extra} = props;

  let name;
  let icon;

  className = className || '';
  className += ' badge';

  if (KANBAN_LABEL.test(label.name)) {
    icon = (<ListUnorderedIcon/>);
    name = label.name.replace(/^\d+\ -\ /, ' ');
  } else {
    icon = (<TagIcon/>);
    name = label.name;
  }
  if (label.color && isLight(label.color)) {
    className = className;
    className += ' ' + 'is-light';
  }
  if (extra) {
    extra = ` (${extra})`;
  }

  if (isFilterLink) {
    return (
      <Link to={getFilters().toggleTagName(label.name).url()}
        key={name}
        onClick={onClick}
        className={className}
        style={{backgroundColor: '#' + label.color}}>
        {icon}
        {name}
        {extra}
      </Link>
    );
  } else {
    return (
      <BS.Badge
        key={name}
        {...props}
        className={className}
        onClick={onClick}
        style={{backgroundColor: '#' + label.color}}>
        {icon}
        {name}
        {extra}
      </BS.Badge>
    );
  }

}

LabelBadge.propTypes = {
  label: PropTypes.object.isRequired,
  className: PropTypes.string,
  extra: PropTypes.string
};

export default LabelBadge;
