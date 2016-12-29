import React from 'react';
import { DropTarget } from 'react-dnd';
import * as BS from 'react-bootstrap';
import {DesktopDownloadIcon} from 'react-octicons';

import SettingsStore from '../settings-store';
import IssueStore from '../issue-store';

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


// Converts a table to a CSV string for downloading
function toCSVString(table) {
  return table.map((row) => {
    return row.map((column) => {
      if (typeof column === 'number') {
        return column;
      } else {
        return '"' + column + '"';
      }
    }).join(', ');
  }).join('\n');
}


const IssueList = React.createClass({
  displayName: 'IssueList',
  getInitialState() {
    return {morePressedCount: 0, showCSVModal: false};
  },
  showAllIssues() {
    this.setState({showAllIssues: true});
  },
  onClickMore() {
    this.setState({morePressedCount: this.state.morePressedCount + 1});
  },
  toggleCSVModal() {
    const {showCSVModal} = this.state;
    this.setState({showCSVModal: !showCSVModal});
  },
  render() {
    const {icon, title, backgroundColor, children, cards} = this.props;
    const {connectDropTarget} = this.props;
    const {isOver} = this.props; // from the collector
    const {showAllIssues, morePressedCount, showCSVModal} = this.state;
    const multiple = 25; // Add 25 results at a time

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

    let countOrDownloadLink;
    if (cards) {
      function generateCSV() {
        // merged-since does not have the actual card object yet, so we look it up
        const data = cards.map(({repoOwner, repoName, number}) => {
          const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);
          if (card.issue) {
            const ret = [repoOwner, repoName, number, card.issue.updatedAt, card.issue.user.login, card.issue.title];
            // Some PR's have an image; if so, include it in the CSV
            if (card.getFeaturedImageSrc()) {
              ret.push(card.getFeaturedImageSrc());
            }
            return ret;
          } else {
            return [repoOwner, repoName, number];
          }

        });
        // Add the CSV column headers
        data.unshift(['repoOwner', 'repoName', 'number', 'updatedAt', 'createdBy', 'title', 'imageHref']);
        return toCSVString(data);
      }

      countOrDownloadLink = (
        <BS.Button bsStyle='link' onClick={this.toggleCSVModal} title='Generate CSV'
          >
          {children.length}
          {' '}
          <DesktopDownloadIcon/>
          <BS.Modal show={showCSVModal} onHide={this.toggleCSVModal}>
            <BS.Modal.Header closeButton>
              <BS.Modal.Title>CSV Data</BS.Modal.Title>
            </BS.Modal.Header>
            <BS.Modal.Body>
              <textarea>{generateCSV()}</textarea>
            </BS.Modal.Body>
          </BS.Modal>
        </BS.Button>
      );
    } else {
      countOrDownloadLink = children.length;
    }

    const header = (
      <h2 className={className}>
        {iconEl}
        {title}
        {' ('}
        {countOrDownloadLink}
        {')'}
      </h2>
    );

    const classes = {
      'issue-list': true,
      'is-over': isOver
    };

    let partialChildren;
    let moreButton;
    if (!showAllIssues && MIN_CHILDREN_TO_SHOW + (1 + morePressedCount) * multiple < children.length) {
      partialChildren = children.slice(0, MIN_CHILDREN_TO_SHOW + morePressedCount * multiple);
      moreButton = (
        <BS.Button onClick={this.onClickMore} className='list-group-item'>
          {children.length - (morePressedCount + 1) * multiple} more...
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
