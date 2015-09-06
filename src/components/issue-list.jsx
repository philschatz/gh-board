import React from 'react';
import _ from 'underscore';
import { DropTarget } from 'react-dnd';
import * as BS from 'react-bootstrap';

import Issue from './issue.jsx';


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
    const {issues, title, color, repoOwner, repoName} = this.props;
    const {connectDropTarget} = this.props;
    const {isOver} = this.props; // from the collector

    // Sort the issues by `updatedAt`
    const sortedIssues = _.sortBy(issues, (issue) => {
      return issue.updatedAt;
    });
    // Reverse so newest ones are on top
    sortedIssues.reverse();
    const kanbanIssues = _.map(sortedIssues, (issue) => {
      return (
          <Issue
            key={issue.id}
            issue={issue}
            repoOwner={repoOwner}
            repoName={repoName}
          />
      );
    });

    const header = (
      <h2 className='title' style={{backgroundColor: color}}>{title}</h2>
    );

    // TODO: Always include the placeholder. just hide it most of the time.
    // const issuesAndDropPlaceholder = [];
    // if (isOver) {
    //   issuesAndDropPlaceholder.push(placeholder);
    // }
    // issuesAndDropPlaceholder.push(kanbanIssues);
    const classes = {
      'kanban-issues': true,
      'is-over': isOver
    };

    return connectDropTarget(
      <BS.Panel className={classes} header={header}>
        <BS.ListGroup fill>
          <BS.ListGroupItem className="dnd-placeholder"/>
          {kanbanIssues}
          {this.props.children}
        </BS.ListGroup>
      </BS.Panel>
    );
  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
