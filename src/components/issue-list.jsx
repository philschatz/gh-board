import React from 'react';
import { DropTarget } from 'react-dnd';
import * as BS from 'react-bootstrap';

import {FilterStore} from '../filter-store';

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
    const {title, label} = this.props;
    const {connectDropTarget} = this.props;
    const {isOver} = this.props; // from the collector

    const header = (
      <h2 className='column-title' style={{backgroundColor: label.color}}>
        <span className='column-title-text' onClick={() => FilterStore.addLabel(label)}>{title}</span>
      </h2>
    );

    const classes = {
      'kanban-issues': true,
      'is-over': isOver
    };

    return connectDropTarget(
      <BS.Panel className={classes} header={header}>
        <BS.ListGroup fill>
          <BS.ListGroupItem key='dnd-placeholder' className='dnd-placeholder'/>
          {this.props.children}
        </BS.ListGroup>
      </BS.Panel>
    );
  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
