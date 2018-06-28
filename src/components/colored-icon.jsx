import classnames from 'classnames';

import {isLight} from '../helpers';
import {getFilters} from '../route-utils';

function ColoredIcon(props) {
  let {className, children, name, color} = props;

  let headerStyle;
  let isLightColor = false;
  if (color) {
    headerStyle = {backgroundColor: '#' + color};
    isLightColor = isLight(color);
  } else {
    isLightColor = true;
  }
  className = classnames(className, 'colored-icon', {'is-light': isLightColor});
  if (name) {
    name = name.replace(getFilters().getState().columnRegExp, '');
  }

  return (
    <span className={className} style={headerStyle} title={name}>{children}</span>
  );

}

export default ColoredIcon;
