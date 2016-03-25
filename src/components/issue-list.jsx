import React from 'react';
import { DropTarget } from 'react-dnd';
import * as BS from 'react-bootstrap';

import SettingsStore from '../settings-store';

import ColoredIcon from './colored-icon';

const MIN_CHILDREN_TO_SHOW = 10;

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
  getInitialState() {
    // Initially, expand all issues only if tableLayout is true
    return {showAllIssues: SettingsStore.getTableLayout(), morePressedCount: 0};
  },
  showAllIssues() {
    this.setState({showAllIssues: true});
  },
  onClickMore() {
    this.setState({morePressedCount: this.state.morePressedCount + 1});
  },
  render() {
    const {icon, title, backgroundColor, children} = this.props;
    const {connectDropTarget} = this.props;
    const {isOver} = this.props; // from the collector
    const {showAllIssues, morePressedCount} = this.state;
    const multiple = 50; // Add 50 results at a time

    let className = 'column-title';
    if (icon) {
      className += ' has-icon';
    }

    let iconEl;
    if (icon) {
      iconEl = (
        <ColoredIcon className='column-icon' color={backgroundColor}>{icon}</ColoredIcon>
      );
    }
    const header = (
      <h2 className={className}>
        {iconEl}
        {title}
        {' (' + children.length + ')'}
      </h2>
    );

    const classes = {
      'issue-list': true,
      'is-over': isOver
    };

    let partialChildren;
    let moreButton;
    if (!showAllIssues && MIN_CHILDREN_TO_SHOW + 1 + morePressedCount * multiple < children.length) {
      partialChildren = children.slice(0, MIN_CHILDREN_TO_SHOW + morePressedCount * multiple);
      moreButton = (
        <BS.Button onClick={this.onClickMore} className='list-group-item'>
          {children.length - morePressedCount * multiple} more...
        </BS.Button>
      );
    } else {
      partialChildren = children;
    }

    return connectDropTarget(
      <div className='-drop-target'>
        <BS.Panel className={classes} header={header}>
          <BS.ListGroup fill>
            <BS.ListGroupItem key='dnd-placeholder' className='dnd-placeholder'/>
            {partialChildren}
            {moreButton}
          </BS.ListGroup>
        </BS.Panel>
      </div>
    );

  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
