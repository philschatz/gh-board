import React from 'react';
import BS from 'react-bootstrap';
import { DragSource } from 'react-dnd';

import {Store, issueKey} from '../issue-store';
import IssueEditModal from './issue-edit-modal.jsx';

const ItemTypes = {
  CARD: 'card'
};

const issueSource = {
  beginDrag(props) {
    // Return the data describing the dragged item
    const item = props;
    return item;
  },

  endDrag(props, monitor) {
    if (!monitor.didDrop()) {
      return;
    }

    // When dropped on a compatible target, do something
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
    // CardActions.moveCardToList(item.id, dropResult.listId);
    console.log('Dropped!', item, dropResult);
  }
};


function collect(connect, monitor) {
  return {
    // Call this function inside render()
    // to let React DnD handle the drag events:
    connectDragSource: connect.dragSource(),
    // You can ask the monitor about the current drag state:
    isDragging: monitor.isDragging()
  };
}



const Issue = React.createClass({
  displayName: 'Issue',
  getInitialState() {
    const {issue} = this.props;
    return {issue};
  },
  update(issue) {
    this.setState({issue});
  },
  getKey(props) {
    const {repoOwner, repoName, issue} = props;
    const issueNumber = issue.number;
    const key = issueKey(repoOwner, repoName, issueNumber);
    return key;
  },
  componentDidMount() {
    const key = this.getKey(this.props);
    Store.on('change:' + key, this.update);
  },
  componentDidUpdate(oldProps) {
    const newKey = this.getKey(this.props);
    const oldKey = this.getKey(oldProps);
    if (newKey !== oldKey) {
      Store.on('change:' + newKey, this.update);
      Store.off('change:' + oldKey, this.update);
    }
  },
  componentDidUnmount() {
    const key = this.getKey(this.props);
    Store.off('change:' + key, this.update);
  },
  render() {
    const {repoOwner, repoName} = this.props;
    const {issue} = this.state;

    // Defined by the collector
    const { isDragging, connectDragSource } = this.props;

    let assignedAvatar = null;
    if (issue.assignee) {
      assignedAvatar = (
        <img src={issue.assignee.avatar_url}/>
      );
    }
    const footer = [
      assignedAvatar,
      <a className='issue-number' target='_blank' href={issue.html.url}>{issue.number}</a>
    ];
    const modal = (
      <IssueEditModal
        issue={issue}
        repoOwner={repoOwner}
        repoName={repoName}
      />
    );
    return connectDragSource(
      <BS.ModalTrigger modal={modal}>
        <BS.Panel
          key={issue.id}
          className={{'issue': true, 'is-dragging': isDragging}}
          bsStyle='default'
          footer={footer}>
          {issue.title}
        </BS.Panel>
      </BS.ModalTrigger>
    );
  }
});

// Export the wrapped version
export default DragSource(ItemTypes.CARD, issueSource, collect)(Issue);
