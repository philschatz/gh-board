import React from 'react';
import _ from 'underscore';
import {Link} from 'react-router';

import Client from '../github-client';
import {getFilters} from '../route-utils';
import {fetchAll, FETCHALL_MAX} from '../helpers';
import Loadable from './loadable';
import {getRelatedIssues} from '../gfm-dom';
import IssueStore from '../issue-store';
import IssueList from './issue-list';
import Issue from './issue';

const MERGE_PULL_REQUEST_MESSAGE_REGEXP = /^Merge\ pull\ request #(\d+)/;

const MergedSince = React.createClass({
  renderPullRequest(repoOwner, repoName, pr) {
    const relatedIssues = getRelatedIssues(pr.body, repoOwner, repoName);
    // if (relatedIssues.length) {
    //   const relatedIssuesHtml = relatedIssues.map((related) => {
    //     const {repoOwner, repoName, number} = related;
    //     const card = IssueStore.issueNumberToCard(repoOwner, repoName, number);
    //     return (
    //       <Issue card={card}/>
    //     );
    //   });
    //   return (
    //     <div className='-issues-related-to-the-pull-request'>
    //       {relatedIssuesHtml}
    //     </div>
    //   );
    // } else {
      const card = IssueStore.issueToCard(repoOwner, repoName, pr);
      return (
        <Issue card={card}/>
      );
    // }
  },
  render() {
    const {comparisons, repoInfos, startShas, endShas} = this.props;

    let prCommits = [];
    _.each(comparisons, (comparison, i) => {
      const {repoOwner, repoName} = repoInfos[i];
      _.each(comparison[0].commits, (commit) => {
        const msg = commit.commit.message;
        const match = msg.match(MERGE_PULL_REQUEST_MESSAGE_REGEXP);
        if (match) {
          const title = msg.split('\n')[2];
          const at = new Date(commit.commit.author.date);
          prCommits.push({number: match[1], title, at, repoOwner, repoName});
        }
      });
    });

    // Sort commits by when they were made
    prCommits = _.sortBy(prCommits, ({at}) => at.getTime());

    const children = _.map(prCommits, ({repoOwner, repoName, number}) => {
      if (number) {
        // Try and fetch the issue the PR fixed
        return (
          <Loadable
            key={repoOwner + repoName + number}
            promise={Client.getOcto().repos(repoOwner, repoName).issues(number).fetch()}
            renderLoaded={(pr) => this.renderPullRequest(repoOwner, repoName, pr)}
            loadingText={`Loading ${repoOwner}/${repoName}#${number}...`}
          />
        );
      }
    });

    return (
      <IssueList title={`Issues related to the Changes between ${startShas} and ${endShas}`}>
        {children}
      </IssueList>
    );
  }
});

const MergedSinceShell = React.createClass({
  render() {
    let {startShas, endShas} = this.props.params;
    const {repoInfos} = getFilters().getState();

    startShas = startShas.split('|');
    if (endShas) {
      endShas = endShas.split('|');
    } else {
      endShas = [];
      repoInfos.forEach(() => {
        endShas.push('master');
      });
    }
    if (startShas.length !== repoInfos.length || endShas.length !== repoInfos.length) {
      /*eslint-disable no-alert */
      alert('The number of shas to compare does not match the number of repositories');
      /*eslint-enable no-alert */
    }

    const allPromise = Promise.all(_.map(repoInfos, ({repoOwner, repoName}, i) => {
      const startSha = startShas[i];
      const endSha = endShas[i];
      return fetchAll(FETCHALL_MAX, Client.getOcto().repos(repoOwner, repoName).compare(startSha, endSha).fetch);
    }));

    return (
      <Loadable
        promise={allPromise}
        renderLoaded={(comparisons) => <MergedSince comparisons={comparisons} repoInfos={repoInfos} startShas={startShas} endShas={endShas}/>}
      />
    );
  }
});


export const MergedSinceFormShell = React.createClass({
  onChangeInput() {
    this.forceUpdate();
  },
  isValid() {
    const filters = getFilters();
    const {repoInfos} = filters.getState();
    let isValid = true;
    repoInfos.forEach((repoInfo, i) => {
      const node = this.refs[`start-${i}`];
      if (!node || !/[0-9a-f]+/.test(node.value)) { isValid = false; }
    });
    const ends = repoInfos.map((repoInfo, i) => {
      const node = this.refs[`end-${i}`];
      if (!node || !/[0-9a-f]+/.test(node.value)) { isValid = false; }
    });
    return isValid;
  },
  buildHref() {
    const filters = getFilters();
    const {repoInfos} = filters.getState();
    const starts = repoInfos.map((repoInfo, i) => {
      const node = this.refs[`start-${i}`];
      return node.value;
    });
    const ends = repoInfos.map((repoInfo, i) => {
      const node = this.refs[`end-${i}`];
      return node.value;
    });
    return `${filters.url()}/${starts.join(':')}/${ends.join(':')}`;
  },
  renderRow({repoName}, i) {
    return (
      <tr key={repoName}>
        <td>{repoName}</td>
        <td><input ref={`start-${i}`} onChange={this.onChangeInput}/></td>
        <td><input ref={`end-${i}`} onChange={this.onChangeInput}/></td>
      </tr>
    );
  },
  render() {
    const {repoInfos} = getFilters().getState();
    let showDiffsButton;
    if (this.isValid()) {
      const href = this.buildHref();
      showDiffsButton = (
        <Link to={href}>Show differences</Link>
      );
    } else {
      showDiffsButton = (
        <span className='-invalid-commits'>Show differences (validation error)</span>
      );
    }
    return (
      <div>
        <p><strong>Note:</strong> These would eventually come directly from the manifest file</p>
        <table>
          <thead>
            <tr><th>Repo</th><th>Start Sha</th><th>End Sha</th></tr>
          </thead>
          <tbody>
            {repoInfos.map(this.renderRow)}
          </tbody>
        </table>
        {showDiffsButton}
      </div>
    );
  }
});

export default MergedSinceShell;
