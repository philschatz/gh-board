import _ from 'underscore';
import React from 'react';
import * as BS from 'react-bootstrap';

import IssueStore from '../issue-store';
import IssueOrPullRequestBlurb from './issue-blurb.jsx';
import LabelBadge from './label-badge.jsx';

const MoveModal = React.createClass({
  getInitialState() {
    return {
      showModal: false,
      card: null,
      graph: null,
      primaryRepoName: null,
      label: null,
      unCheckedCards: {}
    };
  },
  componentDidMount() {
    IssueStore.on('tryToMove', this.onTryToMove);
  },
  componentWillUnmount() {
    IssueStore.off('tryToMove', this.onTryToMove);
  },
  onTryToMove(card, graph, primaryRepoName, label) {
    this.setState({showModal: true, card, graph, primaryRepoName, label, unCheckedCards: {}});
  },
  onToggleCheckbox(card) {
    return () => {
      const {graph, unCheckedCards} = this.state;
      const key = graph.cardToKey(card);
      if (!unCheckedCards[key]) {
        unCheckedCards[key] = card;
      } else {
        delete unCheckedCards[key];
      }
      this.setState({unCheckedCards});
    };
  },
  onClickMove() {
    const {card, graph, label, unCheckedCards} = this.state;
    const allOtherCards = _.union(
      _.map(graph.getA(graph.cardToKey(card)), ({vertex}) => vertex),
      _.map(graph.getB(graph.cardToKey(card)), ({vertex}) => vertex)
    );
    const otherCardsToMove = _.difference(allOtherCards, _.values(unCheckedCards));

    // Move the card and then all the others
    const promises = _.map(otherCardsToMove, (otherCard) => {
      return IssueStore.move(otherCard.repoOwner, otherCard.repoName, otherCard.issue, label);
    });
    promises.push(IssueStore.move(card.repoOwner, card.repoName, card.issue, label));
    Promise.all(promises).then(() => this.setState({showModal: false}));
  },
  render() {
    const {container} = this.props;
    const {showModal, card, graph, primaryRepoName, label, unCheckedCards} = this.state;
    const close = () => this.setState({showModal: false});

    if (showModal) {
      const related = _.union(
        graph.getA(graph.cardToKey(card)),
        graph.getB(graph.cardToKey(card))
      );

      let body;
      if (related.length) {
        const makeRelated = ({vertex}) => {
          const checkLabel = (
            <span>
              <IssueOrPullRequestBlurb card={vertex} primaryRepoName={primaryRepoName}/>
              <span className='issue-title'>
                {': '}
                {vertex.issue.title}
              </span>
            </span>
          );
          return (
            <li>
              <BS.Input
                type='checkbox'
                defaultChecked={!unCheckedCards[graph.cardToKey(vertex)]}
                wrapperClassName='select-related-issue'
                onClick={this.onToggleCheckbox(vertex)}
                label={checkLabel}/>
            </li>
          );
        };

        const relatedIssues = _.map(related, makeRelated);

        body = (
          <BS.Modal.Body>
            Select the related items to move as well:
            <ul>
              {relatedIssues}
            </ul>
          </BS.Modal.Body>
        );
      } else {
        // Only the issue. Nothing related
        body = null;
      }

      let title;
      if (card.issue.pullRequest) {
        title = 'Move Pull Request';
      } else {
        title = 'Move Issue';
      }

      return (
        <BS.Modal
          className='move-issue'
          show={showModal}
          container={container}
          onHide={close}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>
              {title} to <LabelBadge label={label}/>
            </BS.Modal.Title>
          </BS.Modal.Header>
          {body}
          <BS.Modal.Footer>
            <BS.Button bsStyle='primary' onClick={this.onClickMove}>Move</BS.Button>
            <BS.Button onClick={close}>Cancel</BS.Button>
          </BS.Modal.Footer>
        </BS.Modal>
      );

    } else {
      return null;
    }
  }
});


export default MoveModal;
