import _ from 'underscore';
import React from 'react';
import * as BS from 'react-bootstrap';

import {getCardColumn} from '../helpers';
import IssueStore from '../issue-store';
import CurrentUserStore from '../user-store';
import IssueOrPullRequestBlurb from './issue-blurb';
import LabelBadge from './label-badge';

const MoveModal = React.createClass({
  getInitialState() {
    return {
      showModal: false,
      card: null,
      primaryRepoName: null,
      label: null,
      unCheckedCards: {}
    };
  },
  componentDidMount() {
    IssueStore.on('tryToMoveLabel', this.onTryToMoveLabel);
    IssueStore.on('tryToMoveMilestone', this.onTryToMoveMilestone);
  },
  componentWillUnmount() {
    IssueStore.off('tryToMoveMilestone', this.onTryToMoveMilestone);
  },
  onTryToMoveLabel(card, primaryRepoName, label) {
    this.setState({showModal: true, card, primaryRepoName, label, milestone: null, unCheckedCards: {}});
  },
  onTryToMoveMilestone(card, primaryRepoName, milestone) {
    this.setState({showModal: true, card, primaryRepoName, label: null, milestone, unCheckedCards: {}});
  },
  onToggleCheckbox(card) {
    return () => {
      const {unCheckedCards} = this.state;
      const key = card.key();
      if (!unCheckedCards[key]) {
        unCheckedCards[key] = card;
      } else {
        delete unCheckedCards[key];
      }
      this.setState({unCheckedCards});
    };
  },
  onClickMoveLabel() {
    const {card, label, unCheckedCards} = this.state;
    const allOtherCards = _.map(card.getRelated(), ({vertex}) => vertex);
    const otherCardsToMove = _.difference(allOtherCards, _.values(unCheckedCards));

    // Move the card and then all the others
    const promises = _.map(otherCardsToMove, (otherCard) => {
      return IssueStore.moveLabel(otherCard.repoOwner, otherCard.repoName, otherCard.issue, label);
    });
    promises.push(IssueStore.moveLabel(card.repoOwner, card.repoName, card.issue, label));
    Promise.all(promises).then(() => this.setState({showModal: false}));
  },
  // TODO: Copy/pasta from above
  onClickMoveMilestone() {
    const {card, milestone, unCheckedCards} = this.state;
    const allOtherCards = _.map(card.getRelated(), ({vertex}) => vertex);
    const otherCardsToMove = _.difference(allOtherCards, _.values(unCheckedCards));

    // Move the card and then all the others
    const promises = _.map(otherCardsToMove, (otherCard) => {
      return IssueStore.moveMilestone(otherCard.repoOwner, otherCard.repoName, otherCard.issue, milestone);
    });
    promises.push(IssueStore.moveMilestone(card.repoOwner, card.repoName, card.issue, milestone));
    Promise.all(promises).then(() => this.setState({showModal: false}));
  },
  render() {
    const {container} = this.props;
    const {showModal, card, primaryRepoName, label, milestone, unCheckedCards} = this.state;
    const close = () => this.setState({showModal: false});

    if (showModal) {
      const related = card.getRelated();

      let anonymousComment = null;
      const isAnonymous = !CurrentUserStore.getUser();
      if (isAnonymous) {
        anonymousComment = 'Sign In to move items ';
      }

      let body;
      if (related.length) {
        const makeRelated = ({vertex}) => {
          const relatedColumn = getCardColumn(vertex);
          let relatedLabel = null;
          if (relatedColumn.name !== getCardColumn(card).name) {
            relatedLabel = (<LabelBadge label={relatedColumn}/>);
          }
          const checkLabel = (
            <span>
              <IssueOrPullRequestBlurb card={vertex} primaryRepoName={primaryRepoName}/>
              <span className='issue-title'>
                {': '}
                {vertex.issue.title}
                {relatedLabel}
              </span>
            </span>
          );
          return (
            <li className='related-issue'>
              <BS.FormControl
                type='checkbox'
                defaultChecked={!unCheckedCards[vertex.key()]}
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
            <ul className='related-issues'>
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

      let dest;
      let onClick;
      if (label) {
        dest = (<LabelBadge label={label}/>);
        onClick = this.onClickMoveLabel;
      } else if (milestone) {
        dest = milestone.title;
        onClick = this.onClickMoveMilestone;
      } else {
        throw new Error('BUG: only know how to move to a label or milestone');
      }

      return (
        <BS.Modal
          className='move-issue'
          show={showModal}
          container={container}
          onHide={close}>
          <BS.Modal.Header closeButton>
            <BS.Modal.Title>
              {title} to {dest}
            </BS.Modal.Title>
          </BS.Modal.Header>
          {body}
          <BS.Modal.Footer>
            {anonymousComment}
            <BS.Button bsStyle='primary' onClick={onClick}>Move</BS.Button>
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
