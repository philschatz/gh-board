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
import CurrentUserStore from '../user-store';
import FilterStore from '../filter-store';

import Time from './time.jsx';

const RATE_LIMIT_POLLING_INTERVAL = 30 * 60 * 1000;

const KarmaWarning = React.createClass({
  getInitialState() {
    return {timer: null, limit: null, remaining: null, newestVersion: null};
  },
  componentDidMount() {
    NewVersionChecker.on('change', this.updateNewestVersion);
    Client.on('request', this.updateRateLimit);
    this.pollRateLimit();
  },
  componentWillUnmount() {
    NewVersionChecker.off('change', this.updateNewestVersion);
    Client.off('request', this.updateRateLimit);
  },
  updateRateLimit(remaining, limit /*, method, path, data, options */) {
    this.setState({remaining, limit});
  },
  updateNewestVersion(newestVersion) {
    this.setState({newestVersion});
  },
  pollRateLimit() {
    Client.getOcto().rateLimit.fetch().then((rates) => {
      let {remaining, limit, reset} = rates.resources.core;
      reset = new Date(reset * 1000);
      this.setState({remaining, limit, reset});
      setTimeout(this.pollRateLimit, RATE_LIMIT_POLLING_INTERVAL);
    });
  },
  render() {
    const {remaining, limit, reset, newestVersion} = this.state;
    let karmaText;
    let resetText;
    if (reset) {
      resetText = (
        <span className='reset-at'>Resets <Time dateTime={reset}/></span>
      );
    }

    let isKarmaLow = true;
    if (limit) {
      if (remaining / limit < .2) {
        karmaText = (
          <BS.Button bsStyle='danger' bsSize='sm'>{remaining} / {limit}. Sign In to avoid this. {resetText}</BS.Button>
        );
        resetText = null;
      } else {
        isKarmaLow = false;
        const percent = Math.floor(remaining * 1000 / limit) / 10;
        let bsStyle = 'danger';
        if (percent >= 75) { bsStyle = 'success'; }
        else if (percent >= 40) { bsStyle = 'warning'; }
        karmaText = (
          <BS.ProgressBar
            className='karma-progress'
            title={'Rate Limit for the GitHub API (' + remaining + '/' + limit + ')'}
            now={remaining}
            max={limit}
            bsStyle={bsStyle}
            label={percent + '% (' + remaining + ')'} />
        );
      }
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
          <li>
            <span className={'karma-stats' + (isKarmaLow && ' is-karma-low' || '')}>
              <i className='octicon octicon-cloud-download' title='GitHub API'/>
              {' API Requests Left: '}
              {karmaText}
              {resetText}
            </span>
          </li>
          {newestText}
        </BS.Nav>
        <BS.Nav right>
          <BS.NavItem target='_blank' href='https://github.com/philschatz/gh-board'><i className='octicon octicon-mark-github'/> Source Code</BS.NavItem>
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

const AppNav = React.createClass({
  contextTypes: {
    router: React.PropTypes.func
  },
  getInitialState() {
    return {info: null, showModal: false};
  },
  componentDidMount() {
    FilterStore.on('change', this.update);
    FilterStore.on('change:showPullRequestData', this.update);
    FilterStore.on('change:tableLayout', this.update);
    Client.on('changeToken', this.onChangeToken);
    this.onChangeToken();
  },
  componentWillUnmount() {
    FilterStore.off('change', this.update);
    FilterStore.off('change:showPullRequestData', this.update);
    FilterStore.off('change:tableLayout', this.update);
    Client.off('changeToken', this.onChangeToken);
  },
  update() {
    this.setState({});
  },
  onChangeToken() {
    CurrentUserStore.fetch()
    .then((info) => {
      // TODO: when anonymous, getting the current user should be an error.
      // probably a bug in CurrentUserStore
      if (info) {
        FilterStore.setShowPullRequestData();
      }
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
    let {repoOwner, repoNames} = this.context.router.getCurrentParams();
    if (repoNames) {
      repoNames = repoNames.split('|');
    }

    const {info, showModal} = this.state;
    const close = () => this.setState({ showModal: false});

    const brand = (
      <Link to='viewDashboard'><i className='octicon octicon-home'/></Link>
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

    let loginButton;
    if (info) {
      loginButton = (
        <BS.NavDropdown title={info.login}>
          <BS.MenuItem eventKey='1'><span onClick={this.onSignOut}>Sign Out</span></BS.MenuItem>
        </BS.NavDropdown>
      );
    } else {
      loginButton = (
        <BS.NavItem className='sign-in' onClick={() => this.setState({showModal: true})}>Sign In</BS.NavItem>
      );
    }

    const settingsTitle = (
      <i className='octicon octicon-gear'/>
    );

    let repoInfo = null;
    if (!filtering.length && repoOwner) {
      let repoNameItems;
      if (repoNames.length === 1) {
        repoNameItems = (
          <span className='repo-name'>{repoNames[0]}</span>
        );
      } else {
        repoNameItems = _.map(repoNames, (repoName, index) => {
          return (
            <span className='repo-name-wrap'>
              {index !== 0 && '&' || null}{/* Put an & between repo names */}
              <Link className='repo-name' to='viewBoard' params={{repoOwner, repoNames: repoName}}>{repoName}</Link>
            </span>
          );
        });
      }
      repoInfo = (
        <li className='repo-links'>
          <span className='repo-owner'>{repoOwner}</span>
          {'/'}
          {repoNameItems}
        </li>
      );
    }

    const settingsMenuHelp = () => {
      /*eslint-disable no-alert */
      alert('When an Issue and Pull Request are linked (by writing "fixes #123" in the Pull Request description) the related Issue/Pull request is removed from the list.\n Developers will probably want to see the Pull Request in their board (since they created it) while QA would probably rather see the Issue (since they created it).');
      /*eslint-enable no-alert */
    };

    return (
      <div className='app-nav'>
        <BS.Navbar className='topbar-nav' fixedTop brand={brand}>
          <BS.Nav>
            {repoInfo}
            <BS.NavItem className='active-filter'>
              {filtering}
            </BS.NavItem>
          </BS.Nav>
          <BS.Nav right>
            <BS.NavDropdown title={settingsTitle}>
              <BS.MenuItem header>Display Settings</BS.MenuItem>
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
                  onClick={settingsMenuHelp}
                  >
                  <i className='octicon octicon-question'/>
                </button>
              </BS.MenuItem>
              <SettingsItem
                onSelect={FilterStore.setRelatedHideIssues.bind(FilterStore)}
                isChecked={FilterStore.getRelatedHideIssues()}
                >
                Developer-Friendly
              </SettingsItem>
              <SettingsItem
                onSelect={FilterStore.setRelatedHidePullRequests.bind(FilterStore)}
                isChecked={FilterStore.getRelatedHidePullRequests()}
                >
                QA-Friendly
              </SettingsItem>
              <SettingsItem
                onSelect={FilterStore.setRelatedShowAll.bind(FilterStore)}
                isChecked={FilterStore.getRelatedShowAll()}
                >
                Combined
              </SettingsItem>
              <BS.MenuItem divider/>
              <BS.MenuItem header>GitHub API Settings</BS.MenuItem>
              <SettingsItem
                onSelect={FilterStore.toggleShowPullRequestData.bind(FilterStore)}
                isChecked={FilterStore.getShowPullRequestData()}
                >
                Show More Pull Request Info
              </SettingsItem>
            </BS.NavDropdown>
            {loginButton}
          </BS.Nav>
        </BS.Navbar>
        <LoginModal show={showModal} container={this} onHide={close}/>
      </div>
    );
  }


});

const App = React.createClass({
  componentDidMount() {
    FilterStore.on('change:tableLayout', this.onChange);
  },
  componentWillMount() {
    FilterStore.off('change:tableLayout', this.onChange);
  },
  onChange() {
    this.forceUpdate();
  },
  render() {
    const classes = ['app'];
    if (FilterStore.getTableLayout()) {
      classes.push('is-table-layout');
    }

    return (
      <div className={classes.join(' ')}>
        <AppNav/>
        {/* Subroutes are added here */}
        <RouteHandler/>
        <KarmaWarning/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
