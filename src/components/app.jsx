import _ from 'underscore';
import React from 'react';
import {Link, RouteHandler} from 'react-router';
import * as BS from 'react-bootstrap';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import { DragDropContext } from 'react-dnd';

import Client from '../github-client';
import NewVersionChecker from '../new-version-checker';
import LoginModal from './login-modal.jsx';
import LabelBadge from './label-badge.jsx';
import {CurrentUserStore} from '../user-store';
import {FilterStore} from '../filter-store';

import Time from './time.jsx';

const KarmaWarning = React.createClass({
  getInitialState() {
    return {timer: null, limit: null, remaining: null, newestVersion: null};
  },
  componentDidMount() {
    this.setState({timer: setInterval(this.pollKarma, 60000)});
    this.pollKarma();
    NewVersionChecker.on('change', this.updateNewestVersion);
  },
  componentWillUnmount() {
    clearInterval(this.pollKarma);
    NewVersionChecker.off('change', this.updateNewestVersion);
  },
  pollKarma() {
    Client.getOcto().rateLimit.fetch().then((rates) => {
      const {remaining, limit, reset} = rates.resources.core;
      this.setState({remaining, limit, reset});
    });
  },
  updateNewestVersion(newestVersion) {
    this.setState({newestVersion});
  },
  render() {
    const {remaining, limit, reset, newestVersion} = this.state;
    let karmaText;
    let resetText;
    if (remaining / limit < .2) {
      karmaText = (
        <BS.Button bsStyle='warning'>Running low on GitHub Karma: {remaining} / {limit} Either slow down or log in.</BS.Button>
      );
    } else {
      karmaText = (
        <span className='lots-of-karma' title='Rate Limit for the GitHub API'>GitHub Karma: {remaining} / {limit}.</span>
      );
    }
    if (reset) {
      resetText = (
        <span>Resets <Time dateTime={new Date(reset * 1000)}/></span>
      );
    }
    let newestText = null;
    if (newestVersion) {
      newestText = (
        <button className='btn btn-primary' onClick={() => window.location.reload(true)}>New Version released <Time dateTime={new Date(newestVersion.date)}/>. Click to Reload</button>
      );
    }
    return (
      <BS.Navbar fixedBottom>
        <BS.Nav>
          {karmaText}
          {resetText}
          {newestText}
        </BS.Nav>
        <BS.Nav right>
          <a target='_blank' href='https://github.com/philschatz/gh-board'><i className='octicon octicon-mark-github'/> Improve the Source Code!</a>
        </BS.Nav>
      </BS.Navbar>
    );
  }
});

const LoginButton = React.createClass({
  getInitialState() {
    return {info: null, showModal: false};
  },
  componentDidMount() {
    Client.on('changeToken', this.onChangeToken);
    this.onChangeToken();
  },
  componentWillUnmount() {
    Client.off('changeToken', this.onChangeToken);
  },
  onChangeToken() {
    CurrentUserStore.fetch()
    .then((info) => {
      this.setState({info});
    }).catch(() => {
      this.setState({info: null});
    });
  },
  onSignOut() {
    Client.setToken(null);
    CurrentUserStore.clear();
  },
  render() {
    const {info, showModal} = this.state;
    const close = () => this.setState({ showModal: false});

    if (info) {
      return (
        <BS.DropdownButton id='signin-dropdown' className='logoff' title={info.login}>
          <BS.MenuItem disabled href='https://github.com'>Signed in as <strong>{info.login}</strong></BS.MenuItem>
          <BS.MenuItem divider/>
          <BS.MenuItem eventKey='1'><span onClick={this.onSignOut}>Sign Out</span></BS.MenuItem>
        </BS.DropdownButton>
      );
    } else {
      return (
        <span className='signin-and-modal'>
          <BS.Button eventKey={1} onClick={() => this.setState({showModal: true})}>Sign In</BS.Button>
          <LoginModal show={showModal} container={this} onHide={close}/>
        </span>
      );
    }
  }
});

const App = React.createClass({
  componentDidMount() {
    FilterStore.on('change', this.update);
  },
  componentWillUnmount() {
    FilterStore.off('change', this.update);
  },
  changeShowIcebox() {
    FilterStore.setShowIcebox(!FilterStore.getShowIcebox());
  },
  update() {
    this.setState({});
  },
  render() {
    const brand = (
      <Link to='viewDashboard'>Dashboard</Link>
    );
    const filtering = _.map(FilterStore.getLabels(), (label) => {
      return (
        <LabelBadge label={label} onClick={() => FilterStore.removeLabel(label)}/>
      );
    });

    const filterUser = FilterStore.getUser();
    if (filterUser) {
      filtering.push(
        <BS.Badge key='user' onClick={() => FilterStore.clearUser()}>{filterUser.login}</BS.Badge>
      );
    }
    return (
      <div className='app'>
        <BS.Navbar className='topbar-nav navbar-fixed-top' brand={brand} toggleNavKey={0}>
          <BS.Nav>
            <BS.Input
              type='checkbox'
              label='Show Icebox'
              onChange={this.changeShowIcebox}
              checked={FilterStore.getShowIcebox()}/>
            <span className='active-filter'>
              {filtering}
            </span>
          </BS.Nav>
          <BS.Nav right eventKey={0}>
            <LoginButton/>
          </BS.Nav>
        </BS.Navbar>

        {/* Subroutes are added here */}
        <RouteHandler/>

        <KarmaWarning/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
