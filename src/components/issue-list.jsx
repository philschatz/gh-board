import React from 'react';
import _ from 'underscore';
import { DropTarget } from 'react-dnd';
import BS from 'react-bootstrap';

import {Store} from '../issue-store';
import Loadable from './loadable.jsx';
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
  // Curried function
  renderIssue(isPullRequest) {
    return (issue) => {
      const {repoOwner, repoName} = this.props;
      return (
        <Issue
          key={issue.id}
          issue={issue}
          repoOwner={repoOwner}
          repoName={repoName}
          isPullRequest={isPullRequest}
        />
      );
    };
  },
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
      if (issue.pullRequest) {
        const promise = Store.fetchPullRequest(repoOwner, repoName, issue.number);
        return (
          <Loadable
            promise={promise}
            renderLoaded={this.renderIssue(true /*isPullRequest*/)}
          />
        );
      } else {
        return this.renderIssue(false /*isPullRequest*/)(issue);
      }
    });

    // DnD placeholder element
    const placeholder = (
      <div className="dnd-placeholder"/>
    );

    return connectDropTarget(
      <div className='kanban-issues'>
        <h2 className='title' style={{'background-color': color}}>{title}</h2>
        {isOver && placeholder}
        <BS.ListGroup>
          {kanbanIssues}
        </BS.ListGroup>
      </div>
    );
  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
