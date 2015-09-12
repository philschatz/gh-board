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
    NewVersionChecker.on('change', this.updateNewestVersion);
    Client.on('request', this.updateRateLimit);
  },
  componentWillUnmount() {
    NewVersionChecker.off('change', this.updateNewestVersion);
    Client.off('request', this.updateRateLimit);
  },
  updateRateLimit(remaining, limit /*, method, path, data, options */) {
    this.setState({remaining, limit});
    // Client.getOcto().rateLimit.fetch().then((rates) => {
    //   const {remaining, limit, reset} = rates.resources.core;
    //   this.setState({remaining, limit, reset});
    // });
  },
  updateNewestVersion(newestVersion) {
    this.setState({newestVersion});
  },
  render() {
    const {remaining, limit, reset, newestVersion} = this.state;
    let karmaText;
    let resetText;
    if (limit) {
      if (remaining / limit < .2) {
        karmaText = (
          <BS.Button bsStyle='warning'>Running low on GitHub Karma: {remaining} / {limit} Either slow down or log in.</BS.Button>
        );
      } else {
        const percent = Math.floor(remaining * 1000 / limit) / 10;
        let bsStyle = 'danger';
        if (percent >= 75) { bsStyle = 'success'; }
        else if (percent >= 40) { bsStyle = 'warning'; }
        karmaText = (
          <span className='karma-stats'>
            <i className='octicon octicon-mark-github'/>
            {'API Karma Left: '}
            <BS.ProgressBar
              className='karma-progress'
              title={'Rate Limit for the GitHub API (' + remaining + '/' + limit + ')'}
              now={remaining}
              max={limit}
              bsStyle={bsStyle}
              label={percent + '% (' + remaining + ')'} />
          </span>
        );
      }
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
      <BS.Navbar fixedBottom className='bottombar-nav'>
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


const SettingsItem = React.createClass({
  render() {
    const {onSelect, isChecked, children} = this.props;

    return (
      <BS.MenuItem onSelect={onSelect}>
        <span className='settings-item-checkbox' data-checked={isChecked}>{children}</span></BS.MenuItem>
    );
  }
});

const App = React.createClass({
  getInitialState() {
    return {info: null, showModal: false};
  },
  componentDidMount() {
    FilterStore.on('change', this.update);
    Client.on('changeToken', this.onChangeToken);
    this.onChangeToken();
  },
  componentWillUnmount() {
    FilterStore.off('change', this.update);
    Client.off('changeToken', this.onChangeToken);
  },
  update() {
    this.setState({});
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

    const classes = ['app'];
    if (FilterStore.getTableLayout()) {
      classes.push('is-table-layout');
    }


    let loginButton;
    if (info) {
      loginButton = (
        <BS.DropdownButton title={info.login}>
          <BS.MenuItem eventKey='1'><span onClick={this.onSignOut}>Sign Out</span></BS.MenuItem>
        </BS.DropdownButton>
      );
    } else {
      loginButton = (
        <span className='signin-and-modal'>
          <BS.Button eventKey={1} onClick={() => this.setState({showModal: true})}>Sign In</BS.Button>
          <LoginModal show={showModal} container={this} onHide={close}/>
        </span>
      );
    }

    const settingsTitle = (
      <span className='display-settings'><i className='octicon octicon-device-desktop'/>{' Settings'}</span>
    );

    return (
      <div className={classes.join(' ')}>
        <BS.Navbar className='topbar-nav navbar-fixed-top' brand={brand} toggleNavKey={0}>
          <BS.Nav>
            <BS.DropdownButton title={settingsTitle}>
              <SettingsItem
                onSelect={FilterStore.toggleHideUncategorized.bind(FilterStore)}
                isChecked={FilterStore.getHideUncategorized()}
                >
                Hide Uncategorized
              </SettingsItem>
              <SettingsItem
                onSelect={FilterStore.toggleShowEmptyColumns.bind(FilterStore)}
                isChecked={FilterStore.getShowEmptyColumns()}
                >
                Show Empty Columns
              </SettingsItem>
              <SettingsItem
                onSelect={FilterStore.toggleTableLayout.bind(FilterStore)}
                isChecked={FilterStore.getTableLayout()}
                >
                Use Table Layout
              </SettingsItem>
              <BS.MenuItem divider/>
              <BS.MenuItem header>Viewing Mode
                <button
                  className='btn btn-xs btn-default'
                  onClick={() => alert('When an Issue and Pull Request are linked (by writing "fixes #123" in the Pull Request description) the related Issue/Pull request is removed from the list.\n Developers will probably want to see the Pull Request in their board (since they created it) while QA would probably rather see the Issue (since they created it).')}
                  >
                  <i className='octicon octicon-question'/>
                </button>
              </BS.MenuItem>
              <SettingsItem
                onSelect={FilterStore.setRelatedHideIssues.bind(FilterStore)}
                isChecked={FilterStore.getRelatedHideIssues()}
                >
                Developer-Friendly View
              </SettingsItem>
              <SettingsItem
                onSelect={FilterStore.setRelatedHidePullRequests.bind(FilterStore)}
                isChecked={FilterStore.getRelatedHidePullRequests()}
                >
                QA-Friendly View
              </SettingsItem>
              <SettingsItem
                onSelect={FilterStore.setRelatedShowAll.bind(FilterStore)}
                isChecked={FilterStore.getRelatedShowAll()}
                >
                Combined View
              </SettingsItem>

            </BS.DropdownButton>
            <span className='active-filter'>
              {filtering}
            </span>
          </BS.Nav>
          <BS.Nav right eventKey={0}>
            {loginButton}
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
