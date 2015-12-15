import React from 'react';
import { DropTarget } from 'react-dnd';
import * as BS from 'react-bootstrap';

import {isLight} from '../helpers';

const ItemTypes = {
  CARD: 'card'
};

const cardListTarget = {
  drop: function (props) {
    // TODO: Do something simpler than just props
    return props;
  }
};

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  };
}


const IssueList = React.createClass({
  displayName: 'IssueList',
  render() {
    const {title, backgroundColor, children} = this.props;
    const {connectDropTarget} = this.props;
    const {isOver} = this.props; // from the collector

    let headerStyle;
    let className = 'column-title';
    if (backgroundColor) {
      headerStyle = {backgroundColor: '#' + backgroundColor};
      if (isLight(backgroundColor)) {
        className += ' ' + 'is-light';
      }
    } else {
      className += ' ' + 'is-light';
    }
    const header = (
      <h2 className={className} style={headerStyle}>
        {title}
        {' (' + children.length + ')'}
      </h2>
    );

    const classes = {
      'kanban-issues': true,
      'is-over': isOver
    };

    return connectDropTarget(
      <div className='-drop-target'>
        <BS.Panel className={classes} header={header}>
          <BS.ListGroup fill>
            <BS.ListGroupItem key='dnd-placeholder' className='dnd-placeholder'/>
            {children}
          </BS.ListGroup>
        </BS.Panel>
      </div>
    );

  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
