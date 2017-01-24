import React from 'react';
import {connect} from 'react-redux';

import {
  selectors,
  updateIssue
} from '../redux/ducks/issue';

import Etherpad from './etherpad';


const EtherpadIssueShell = React.createClass({
  render() {
    const {card, dispatch} = this.props;
    const {repoOwner, repoName, number} = this.props.params;

    const title = `Editing ${repoOwner}/${repoName}#${number}`;
    const padName = `issue_github.com_${repoOwner}_${repoName}_${number}`;

    const getBody = () => {
      if (card.issue) {
        return card.issue.body;
      } else {
        return ''; // return '' so it can be trimmed when comparing
      }
    };
    const saveBody = (text) => {
      return dispatch(updateIssue(card, {body: text}));
    };
    const loadBody = () => {
      // refetch the Issue body (esp if it hasn't been loaded yet)
      return card.fetchIssue().then(() => {
        return card.issue.body; // just in case someone uses this promise
      });
    };

    return (
      <Etherpad title={title} padName={padName} getBody={getBody} saveBody={saveBody} loadBody={loadBody} repoOwner={repoOwner} repoName={repoName}/>
    );
  }
});

export default connect((state, ownProps) => {
  return {
    card: selectors.getCard(state.issues, ownProps.params)
  };
})(EtherpadIssueShell);
