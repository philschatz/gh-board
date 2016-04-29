import React from 'react';

import Client from '../github-client';
import IssueStore from '../issue-store';

import Etherpad from './etherpad';


const EtherpadIssueShell = React.createClass({
  render() {
    const {repoOwner, repoName, number} = this.props.params;

    const title = `Editing ${repoOwner}/${repoName}#${number}`;
    const padName = `issue_github.com_${repoOwner}_${repoName}_${number}`;

    const getBody = () => {
      const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);
      if (card.issue) {
        return card.issue.body;
      } else {
        return ''; // return '' so it can be trimmed when comparing
      }
    };
    const saveBody = (text) => {
      return Client.getOcto().repos(repoOwner, repoName).issues(number).update({body: text});
    };
    const loadBody = () => {
      const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);

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

export default EtherpadIssueShell;
