import React from 'react';
import _ from 'underscore';
import Client from '../github-client';
import {fetchAll, FETCHALL_MAX, getReposFromStr} from '../helpers';
import Loadable from './loadable';
import {getRelatedIssues} from '../gfm-dom';
import IssueStore from '../issue-store';
import IssueList from './issue-list';
import Issue from './issue';

const MERGE_PULL_REQUEST_MESSAGE_REGEXP = /^Merge\ pull\ request #(\d+)/;

const MergedSince = React.createClass({
  renderCard(repoOwner, repoName, issue) {
    const card = IssueStore.issueToCard(repoOwner, repoName, issue);
    return (
      <Issue card={card}/>
    );
  },
  renderPullRequest(pr) {
    const {repoOwner, repoName} = this.props;
    const relatedIssues = getRelatedIssues(pr.body, repoOwner, repoName);
    if (relatedIssues.length) {
      const relatedIssuesHtml = relatedIssues.map((related) => {
        const {repoOwner, repoName, number} = related;
        return (
          <Loadable
            key={repoOwner + repoName + number}
            promise={Client.getOcto().repos(repoOwner, repoName).issues(number).fetch()}
            renderLoaded={(issue) => this.renderCard(repoOwner, repoName, issue)}
          />
        );
      });
      return (
        <div className='-issues-related-to-the-pull-request'>
          {relatedIssuesHtml}
        </div>
      );
    } else {
      const card = IssueStore.issueToCard(repoOwner, repoName, pr);
      return (
        <Issue card={card}/>
      );
    }
  },
  render() {
    const {comparisons, repoInfos, startShas, endShas} = this.props;

    let prCommits = [];
    _.each(comparisons, (comparison, i) => {
      const {repoOwner, repoName} = repoInfos[i]
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
            key={number}
            promise={Client.getOcto().repos(repoOwner, repoName).issues(number).fetch()}
            renderLoaded={this.renderPullRequest}
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
    let {repoStr, startShas, endShas} = this.props.params;
    const repoInfos = getReposFromStr(repoStr);

    startShas = startShas.split('|');
    if (!endShas) {
      endShas = [];
      repoInfos.forEach(() => {
        endShas.push('master');
      });
    }
    if (startShas.length !== repoInfos.length || endShas.length !== repoInfos.length) {
      alert('The number of shas to compare does not match the number of repositories');
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

export default MergedSinceShell;
