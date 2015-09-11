import React from 'react';
import _ from 'underscore';
import {Link} from 'react-router';
import * as BS from 'react-bootstrap';

import Client from '../github-client';
import {fetchAll} from '../helpers';
import Time from './time.jsx';

const SAMPLE_REPOS = [
  {repoOwner: 'react-bootstrap', repoName: 'react-bootstrap'},
  {repoOwner: 'rauhryan', repoName: 'huboard'},
  {repoOwner: 'openstax', repoNames: ['tutor-js', 'tutor-server'], comment: ' (multiple repositories)'},
  {repoOwner: 'jquery', repoName: 'jquery'}
];


const ListGroupWithMore = React.createClass({
  getInitialState() {
    return {morePressedCount: 1};
  },
  onClickMore() {
    this.setState({morePressedCount: this.state.morePressedCount + 1});
  },
  render() {
    const {children} = this.props;
    const {morePressedCount} = this.state;
    const multiple = 10; // Add 10 results at a time
    let partialChildren;
    if (morePressedCount * multiple < children.length) {
      const moreButton = (
        <BS.ListGroupItem onClick={this.onClickMore}>more...</BS.ListGroupItem>
      );
      partialChildren = children.slice(0, morePressedCount * multiple);
      partialChildren.push(moreButton);
    } else {
      partialChildren = children;
    }
    return (
      <BS.ListGroup>
        {partialChildren}
      </BS.ListGroup>
    );
  }
});

const RepoItem = React.createClass({
  render() {
    const {repoOwner, comment} = this.props;
    let {repoName, repoNames} = this.props;

    // Example repos do not have additional information and may contain multiple repos
    let {repo} = this.props;
    repo = repo || {};
    if (repoNames) {
      repoName = repoNames.join(' & ');
      repoNames = repoNames.join('|');
    } else {
      repoNames = repoNames || repoName;
    }


    let iconClass;
    if (repo.private) { iconClass = 'octicon-lock'; }
    else if (repo.fork) { iconClass = 'octicon-repo-forked'; }
    else { iconClass = 'octicon-repo'; }

    const classes = {
      'repo-item': true,
      'is-private': repo.private
    };

    let updatedAt = null;
    if (repo.pushedAt) {
      updatedAt = (
        <small className='repo-updated-at'>
          {'updated '}
          <Time dateTime={repo.pushedAt}/>
        </small>
      );
    }

    return (
      <BS.ListGroupItem key={repoName} className={classes}>
        <i className={'repo-icon octicon ' + iconClass}/>
        <Link className='repo-open-link' to='viewRepo' params={{repoOwner, repoNames}}>{repoName}</Link>
        {repo.private && (<BS.Label className='repo-private-label' bsStyle='warning'>PRIVATE</BS.Label>) || null}
        {updatedAt}
        {comment}
      </BS.ListGroupItem>
    );
  }
});

const Dashboard = React.createClass({
  displayName: 'Dashboard',
  render() {
    const {repos} = this.props;

    const repoOwnersUpdatedAt = {};
    const reposByOwner = {};

    _.each(repos, (repo) => {
      const repoOwner = repo.owner.login;
      const updatedAt = repo.pushedAt;

      if (!repoOwnersUpdatedAt[repoOwner] || repoOwnersUpdatedAt[repoOwner] < updatedAt) {
        repoOwnersUpdatedAt[repoOwner] = updatedAt;
      }
      if (!reposByOwner[repoOwner]) {
        reposByOwner[repoOwner] = [];
      }
      reposByOwner[repoOwner].push(repo);
    });

    let sortedRepoOwners = _.map(repoOwnersUpdatedAt, (updatedAt, repoOwner) => {
      return {repoOwner, updatedAt};
    });
    sortedRepoOwners = _.sortBy(sortedRepoOwners, ({updatedAt}) => {
      return updatedAt;
    });
    sortedRepoOwners.reverse();


    const repoOwnersNodes = _.map(sortedRepoOwners, ({repoOwner, updatedAt}, index) => {
      let sortedRepos = reposByOwner[repoOwner];
      sortedRepos = _.sortBy(sortedRepos, ({pushedAt: repoUpdatedAt}) => {
        return repoUpdatedAt;
      });
      sortedRepos.reverse();

      const sortedRepoNodes = _.map(sortedRepos, (repo) => {
        const repoName = repo.name;

        return (
          <RepoItem
            repoOwner={repoOwner}
            repoName={repoName}
            repo={repo}
            />
        );
      });

      const header = (
        <span className='org-header'>
          <i className='org-icon octicon octicon-organization'/>
          {' '}
          {repoOwner}
          {' (' + sortedRepos.length + ')'}
        </span>
      );

      return (
        <BS.Panel key={repoOwner} header={header} eventKey={index}>
          <ListGroupWithMore>
            {sortedRepoNodes}
          </ListGroupWithMore>
        </BS.Panel>
      );
    });

    return (
      <BS.PanelGroup accordion defaultActiveKey={0}>
        {repoOwnersNodes}
      </BS.PanelGroup>
    );
  }
});


let allMyReposHack = null;

const DashboardShell = React.createClass({
  displayName: 'DashboardShell',
  getInitialState() {
    return {repos: null};
  },
  render() {
    let {repos} = this.state;

    // HACK to not keep re-fetching the user's list of repos
    if (repos) { allMyReposHack = repos; }
    else { repos = allMyReposHack; }

    let myRepos;

    if (repos) {
      myRepos = (
        <Dashboard repos={repos}/>
      );
    } else {
      fetchAll(Client.getOcto().user.repos.fetch)
      .then((allRepos) => this.setState({repos: allRepos}))
      .then(null, () => this.setState({repos: []}));
      myRepos = 'Loading...';
    }

    const examplesHeader = (
      <span className='examples-header'>
        <i className='org-icon octicon octicon-beaker'/>
        {' Example Boards of GitHub Repositories'}
      </span>
    );

    return (
      <div className='dashboard'>
        <BS.Panel key='example-repos' header={examplesHeader}>
          {_.map(SAMPLE_REPOS, (props) => <RepoItem {...props}/>)}
        </BS.Panel>
        {myRepos}
      </div>
    );
  }
});

export default DashboardShell;
