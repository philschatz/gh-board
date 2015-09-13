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
          <li>
            <span className='karma-stats'>
              <i className='octicon octicon-cloud-download'/>
              {' API Requests Left: '}
              <BS.ProgressBar
                className='karma-progress'
                title={'Rate Limit for the GitHub API (' + remaining + '/' + limit + ')'}
                now={remaining}
                max={limit}
                bsStyle={bsStyle}
                label={percent + '% (' + remaining + ')'} />
            </span>
          </li>
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

const App = React.createClass({
  contextTypes: {
    router: React.PropTypes.func
  },
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

    const classes = ['app'];
    if (FilterStore.getTableLayout()) {
      classes.push('is-table-layout');
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
      repoInfo = (
        <BS.NavItem>{repoOwner}{' / '}{repoNames.join(' & ')}</BS.NavItem>
      );
    }

    return (
      <div className={classes.join(' ')}>
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
                  onClick={() => alert('When an Issue and Pull Request are linked (by writing "fixes #123" in the Pull Request description) the related Issue/Pull request is removed from the list.\n Developers will probably want to see the Pull Request in their board (since they created it) while QA would probably rather see the Issue (since they created it).')}
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
            </BS.NavDropdown>
            {loginButton}
          </BS.Nav>
        </BS.Navbar>

        <LoginModal show={showModal} container={this} onHide={close}/>

        {/* Subroutes are added here */}
        <RouteHandler/>

        <KarmaWarning/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
