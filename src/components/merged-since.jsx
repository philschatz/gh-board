import React from 'react';
import _ from 'underscore';
import Client from '../github-client';
import {fetchAll, FETCHALL_MAX} from '../helpers';
import Loadable from './loadable.jsx';
import Time from './time.jsx';

const MERGE_PULL_REQUEST_MESSAGE_REGEXP = /^Merge\ pull\ request #(\d+)/;

const MergedSince = React.createClass({
  render() {
    const {comparison, repoOwner, repoName} = this.props;

    const prCommits = [];
    _.each(comparison[0].commits, (commit) => {
      const msg = commit.commit.message;
      const match = msg.match(MERGE_PULL_REQUEST_MESSAGE_REGEXP);
      if (match) {
        const title = msg.split('\n')[2];
        const at = new Date(commit.commit.author.date);
        prCommits.push({number: match[1], title, at});
      }
    });

    const prLines = _.map(prCommits, ({number, title, at}) => {
      return (
        <li>
          <a
            target='_blank'
            href={'https://github.com/' + repoOwner + '/' + repoName + '/pull/' + number}>#{number}</a>
          {': ' + title + ' '}
          <Time dateTime={at} style={{color: '#ccc'}}/>
        </li>
      ); // '1. #' + number + ': ' + title;
    });

    return (
      <ol>
        {prLines}
      </ol>
    );
  }
});

const MergedSinceShell = React.createClass({
  contextTypes: {
    router: React.PropTypes.func
  },
  render() {
    let {repoOwner, repoNames, sha} = this.context.router.getCurrentParams();

    return (
      <Loadable
        promise={fetchAll(FETCHALL_MAX, Client.getOcto().repos(repoOwner, repoNames).compare(sha, 'master').fetch)}
        renderLoaded={(comparison) => <MergedSince repoOwner={repoOwner} repoName={repoNames} comparison={comparison}/>}
      />
    );
  }
});

export default MergedSinceShell;
