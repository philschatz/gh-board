import React from 'react';
import _ from 'underscore';
import {Link} from 'react-router';

import Client from '../github-client';
import Loadable from './loadable.jsx';

const Dashboard = React.createClass({
  displayName: 'Dashboard',
  render() {
    const {data} = this.props;

    const items = _.map(data, (repo) => {
      const repoOwner = repo.owner.login;
      const repoName = repo.name;

      return (
        <div key={repo.id}>
          {repoOwner} /
          <Link to='viewRepo' params={{repoOwner, repoName}}>{repoName}</Link>
        </div>
      );
    });

    return (
      <div className='dashboard'>
        {items}
      </div>
    );
  }
});

const DashboardShell = React.createClass({
  displayName: 'DashboardShell',
  render() {
    const sampleRepos = [
      'react-bootstrap/react-bootstrap',
      'rauhryan/huboard',
      'philschatz/gh-board'
    ];
    const anonLinks = _.map(sampleRepos, (repo) => {
      const params = {
        repoOwner: repo.split('/')[0],
        repoName: repo.split('/')[1]
      };
      return (
        <li key={repo}>
          <Link to='viewRepo' params={params}>{repo}</Link>
        </li>
      )
    });
    const anonymousText = (
      <span>
        Are you logged in? You can try these repos:

        <ul>
          {anonLinks}
        </ul>
      </span>
    );
    return (
      <Loadable
        promise={Client.getOcto().user.repos.fetch()}
        renderLoaded={(data) => { return (<Dashboard data={data}/>); } }
        renderError={() => { return anonymousText; }}
      />
    );
  }
});

export default DashboardShell;
