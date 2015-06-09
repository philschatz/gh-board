/*eslint no-unused-vars:0*/
import React from "react";
import _ from "underscore";
import { DropTarget } from "react-dnd";

import Issue from "./issue.jsx";


const ItemTypes = {
  CARD: "card"
};

var cardListTarget = {
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
  displayName: "IssueList",
  render() {
    let {issues, repoOwner, repoName} = this.props;
    let {connectDropTarget} = this.props;

    let kanbanIssues = _.map(issues, (issue) => {
      return (
        <Issue
          key={issue.id}
          issue={issue}
          repoOwner={repoOwner}
          repoName={repoName}
        />
      );
    });

    return connectDropTarget(
      <div className="kanban-issues">{kanbanIssues}</div>
    );
  }
});

// Export the wrapped version
export default DropTarget(ItemTypes.CARD, cardListTarget, collect)(IssueList);
