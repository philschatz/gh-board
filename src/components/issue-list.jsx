import React from 'react';
import { DropTarget } from 'react-dnd';
import * as BS from 'react-bootstrap';

import SettingsStore from '../settings-store';
import {isLight} from '../helpers';

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
    return {showAllIssues: SettingsStore.getTableLayout()};
  },
  showAllIssues() {
    this.setState({showAllIssues: true});
  },
  render() {
    const {title, backgroundColor, children} = this.props;
    const {connectDropTarget} = this.props;
    const {isOver} = this.props; // from the collector
    const {showAllIssues} = this.state;

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
      'issue-list': true,
      'is-over': isOver
    };

    let filteredChildren;
    let showAllButton;
    if (children.length > MIN_CHILDREN_TO_SHOW + 1 && !showAllIssues) {
      filteredChildren = children.slice(0, MIN_CHILDREN_TO_SHOW);
      showAllButton = (
        <BS.Button onClick={this.showAllIssues} className='list-group-item'>
          Show {children.length - MIN_CHILDREN_TO_SHOW} more...
        </BS.Button>
      );
    } else {
      filteredChildren = children;
    }

    return connectDropTarget(
      <div className='-drop-target'>
        <BS.Panel className={classes} header={header}>
          <BS.ListGroup fill>
            <BS.ListGroupItem key='dnd-placeholder' className='dnd-placeholder'/>
            {filteredChildren}
            {showAllButton}
          </BS.ListGroup>
        </BS.Panel>
      </div>
    );

  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
