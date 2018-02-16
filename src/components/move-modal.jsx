import _ from 'underscore';
import React from 'react';
import {connect} from 'react-redux';
import * as BS from 'react-bootstrap';

import {moveIssues, cancelMovingIssue} from '../redux/ducks/issue';
import {getCardColumn} from '../helpers';
import IssueOrPullRequestBlurb from './issue-blurb';
import LabelBadge from './label-badge';

const MoveModal = React.createClass({
  getInitialState() {
    return {
      unCheckedCards: {}
    };
  },
  componentWillReceiveProps(nextProps) {
    // If this card has related cards then show the modal.
    // Otherwise, just perform the move
    if (nextProps.movingIssue && nextProps.movingIssue.card.getRelated().length === 0) {
      if (nextProps.movingIssue.label || nextProps.movingIssue.milestone) {
        this.moveIssue(nextProps);
      }
    } else {
      this.setState({unCheckedCards: {}});
    }
  },

  // performMoveOrShowModal(card, primaryRepoName, label, milestone) {
  //   // If this card has related cards then show the modal.
  //   // Otherwise, just perform the move
  //   if (card.getRelated().length === 0) {
  //     // FIXME : The code to move the label/milestone should be pulled out and just done here instead of setting the state
  //     this.setState({showModal: false, card, primaryRepoName, label, milestone, unCheckedCards: {}});
  //     if (label) {
  //       this.onClickMoveLabel();
  //     }
  //     if (milestone) {
  //       this.onClickMoveMilestone();
  //     }
  //   } else {
  //     this.setState({showModal: true, card, primaryRepoName, label, milestone, unCheckedCards: {}});
  //   }
  //
  // },
  onToggleCheckbox(card) {
    return () => {
      const {unCheckedCards} = this.state;
      const copy = {...unCheckedCards};
      const key = card.key();
      if (!copy[key]) {
        copy[key] = card;
      } else {
        delete copy[key];
      }
      this.setState({unCheckedCards: copy});
    };
  },
  moveIssue(props) {
    const {card, label, milestone} = props.movingIssue;
    const {unCheckedCards} = this.state;
    const allOtherCards = _.map(card.getRelated(), ({vertex}) => vertex);
    const otherCardsToMove = _.difference(allOtherCards, _.values(unCheckedCards));

    props.dispatch(moveIssues(otherCardsToMove.concat(card), {label, milestone}));
  },
  render() {
    const {container, movingIssue, filters} = this.props;
    const {unCheckedCards} = this.state;
    const close = () => this.props.dispatch(cancelMovingIssue());

    if (movingIssue) {
      const related = movingIssue.card.getRelated();

      let anonymousComment = null;
      const isAnonymous = !this.props.user;
      if (isAnonymous) {
        anonymousComment = 'Sign In to move items ';
      }

      let body;
      if (related.length) {
        const makeRelated = ({vertex}) => {
          const relatedColumn = getCardColumn(vertex);
          let relatedLabel = null;
          if (relatedColumn.name !== getCardColumn(movingIssue.card).name) {
            relatedLabel = (<LabelBadge label={relatedColumn} filters={filters} />);
          }
          const checkLabel = (
            <span>
              <IssueOrPullRequestBlurb filters={filters} card={vertex} primaryRepoName={movingIssue.primaryRepoName}/>
              <span className='issue-title'>
                {': '}
                {vertex.issue.title}
                {relatedLabel}
              </span>
            </span>
          );
          return (
            <li className='related-issue'>
              <BS.Checkbox
                className='select-related-issue'
                onClick={this.onToggleCheckbox(vertex)}
                checked={!unCheckedCards[vertex.key()]}
              >{checkLabel}</BS.Checkbox>
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
      if (movingIssue.card.issue.pullRequest) {
        title = 'Move Pull Request';
      } else {
        title = 'Move Issue';
      }

      let dest;
      if (movingIssue.label) {
        dest = (<LabelBadge label={movingIssue.label}/>);
      } else if (movingIssue.milestone) {
        dest = movingIssue.milestone.title;
      } else {
        throw new Error('BUG: only know how to move to a label or milestone');
      }

      return (
        <BS.Modal
          className='move-issue'
          show={!!movingIssue}
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
            <BS.Button bsStyle='primary' onClick={() => this.moveIssue(this.props)}>Move</BS.Button>
            <BS.Button onClick={close}>Cancel</BS.Button>
          </BS.Modal.Footer>
        </BS.Modal>
      );

    } else {
      return null;
    }
  }
});


export default connect(state => {
  return {
    user: state.user.info,
    movingIssue: state.issues.movingIssue,
  };
})(MoveModal);
