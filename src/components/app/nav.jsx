import _ from 'underscore';
import React from 'react';
import {Link, History} from 'react-router';
import * as BS from 'react-bootstrap';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import SettingsStore from '../../settings-store';
import Client from '../../github-client';
import NewVersionChecker from '../../new-version-checker';
import CurrentUserStore from '../../user-store';
import IssueStore from '../../issue-store';
import history from '../../history';
import {getFilters, buildRoute, LABEL_CACHE} from '../../route-utils';
import {getReposFromStr, convertRepoInfosToStr} from '../../helpers';

import LoginModal from '../login-modal';
import LabelBadge from '../label-badge';
import MoveModal from '../move-modal';
import Time from '../time';
import Loadable from '../loadable';
import GithubFlavoredMarkdown from '../gfm';


const SettingsItem = React.createClass({
  render() {
    const {key, onSelect, isChecked, className, to, children} = this.props;
    let {href} = this.props;

    if (!href && to) {
      href = `#${to}`; // Link
    }

    return (
      <BS.MenuItem key={key} href={href} onSelect={onSelect} className={className}>
        <span className='settings-item-checkbox' data-checked={isChecked}>{children}</span></BS.MenuItem>
    );
  }
});

const MilestonesDropdown = React.createClass({
  mixins: [History],
  update() {
    this.forceUpdate();
  },
  render() {
    const {milestones} = this.props;
    const selectedMilestoneTitles = getFilters().state.milestoneTitles;

    const renderMilestone = (milestone) => {
      let dueDate;
      if (milestone.dueOn) {
        dueDate = (
          <span key='due-at' className='due-at'>
            {' due '}
            <Time dateTime={new Date(milestone.dueOn)}/>
          </span>
        );
      }
      return [
        <i key='icon' className='milestone-icon octicon octicon-milestone'/>,
        <span key='milestone-title' className='milestone-title'>
          <GithubFlavoredMarkdown
            inline
            disableLinks={true}
            text={milestone.title}/>
        </span>,
        dueDate
      ];
    };

    if (milestones.length) {
      const milestonesItems = _.map(milestones, (milestone) => {
        return (
          <SettingsItem
            className='milestone-item'
            key={milestone.title}
            isChecked={getFilters().state.milestoneTitles.length && getFilters().state.milestoneTitles.indexOf(milestone.title) >= 0}
            to={getFilters().toggleMilestoneTitle(milestone.title).url()}
          >{renderMilestone(milestone)}</SettingsItem>
        );
      });
      let clearMilestoneFilter;
      if (getFilters().state.milestoneTitles.length > 0) {
        clearMilestoneFilter = (
          <SettingsItem key='clear' to={getFilters().clearMilestoneTitles().url()}>Clear Milestone Filter</SettingsItem>
        );
      }

      let selectedMilestoneItem;
      if (selectedMilestoneTitles.length) {
        if (selectedMilestoneTitles.length > 1) {
          selectedMilestoneItem = `${selectedMilestoneTitles.length} milestones`;
        } else {
          // Only 1 milestone is selected so show the milestone title
          selectedMilestoneItem = renderMilestone({title: selectedMilestoneTitles[0]});
        }
      } else {
        selectedMilestoneItem = 'All Issues and Pull Requests';
      }
      return (
        <BS.NavDropdown id='milestone-dropdown' className='milestone-dropdown' title={<span className='selected-milestone'>{selectedMilestoneItem}</span>}>
          <BS.MenuItem key='1' header>Filter by Milestone</BS.MenuItem>
          {milestonesItems}
          {clearMilestoneFilter}
          <BS.MenuItem key='3' divider/>
          <BS.MenuItem key='4' disabled>Not in a Milestone</BS.MenuItem>
          <BS.MenuItem key='5' divider/>
          <SettingsItem key='6' to={getFilters().setRouteName('by-milestone').url()}>Milestone Planning View</SettingsItem>
          <SettingsItem key='7' to={getFilters().setRouteName('gantt').url()}>Gantt Chart</SettingsItem>
        </BS.NavDropdown>
      );
    } else {
      return null;
    }

  }
});

const MilestonesDropdownShell = React.createClass({
  render() {
    const {repoInfos} = this.props;
    // Use primary repo
    const [{repoOwner, repoName}] = repoInfos;

    return (
      <Loadable
        promise={IssueStore.fetchMilestones(repoOwner, repoName)}
        renderLoaded={(milestones) => <MilestonesDropdown repoInfos={repoInfos} milestones={milestones}/>}
        />
    );
  }
});

const AppNav = React.createClass({
  getInitialState() {
    return {info: null, showModal: false};
  },
  componentDidMount() {
    SettingsStore.on('change', this.update);
    SettingsStore.on('change:showPullRequestData', this.update);
    SettingsStore.on('change:tableLayout', this.update);
    Client.on('changeToken', this.onChangeToken);
    this.onChangeToken();
  },
  componentWillUnmount() {
    SettingsStore.off('change', this.update);
    SettingsStore.off('change:showPullRequestData', this.update);
    SettingsStore.off('change:tableLayout', this.update);
    Client.off('changeToken', this.onChangeToken);
  },
  update() {
    this.setState({});
  },
  onChangeToken() {
    CurrentUserStore.fetchUser()
    .then((info) => {
      // TODO: when anonymous, getting the current user should be an error.
      // probably a bug in CurrentUserStore
      if (info) {
        SettingsStore.setShowPullRequestData();
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
  starThisProject() {
    Client.getOcto().user.starred('philschatz/gh-board').add().then(() => {
      /*eslint-disable no-alert */
      alert('Thanks for starring!\n I hope you enjoy the other pages more than this simple alert, but thank you for helping me out!');
      /*eslint-enable no-alert */
    });
  },
  render() {
    let routeInfo = getFilters().state;
    let {repoInfos} = routeInfo;
    const {info, showModal} = this.state;

    // Note: The dashboard page does not have a list of repos
    const close = () => this.setState({ showModal: false});

    const brand = (
      <Link to={buildRoute('dashboard')}><i className='octicon octicon-home'/></Link>
    );
    const filtering = _.map(getFilters().state.tagNames, (tagName) => {
      // TODO: HACK. Find a better way to update the color of labels
      const label = LABEL_CACHE[tagName] || {name: tagName, color: 'ffffff'};
      return (
        <LabelBadge key={tagName} isClickable label={label}/>
      );
    });

    const {userName} = getFilters().state;
    if (userName) {
      filtering.push(
        <Link
          key='user'
          className='badge'
          to={getFilters().toggleUserName(userName).url()}
          >{userName}
        </Link>
      );
    }

    let loginButton;
    if (info) {
      const avatarImage = (
        <img
          alt={'@' + info.login}
          className='avatar-image'
          src={info.avatar.url}/>
      );
      loginButton = (
        <BS.NavDropdown key='signin-dropdown' id='signin-dropdown' title={avatarImage}>
          <BS.MenuItem key='1' header>Signed in as <strong>{info.login}</strong></BS.MenuItem>
          <BS.MenuItem key='2' onSelect={this.starThisProject}>Click to <i className='octicon octicon-star icon-spin' style={{color: '#fbca04'}}/> the <strong>gh-board</strong> repo if you like this project</BS.MenuItem>
          <BS.MenuItem key='3' divider/>
          <BS.MenuItem key='4' eventKey='1'><span onClick={this.onSignOut}>Sign Out</span></BS.MenuItem>
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

    let repoDetails = null;
    let milestonesDropdown = null;
    if (!filtering.length && repoInfos.length) {
      // Grab the 1st repo
      const [{repoOwner, repoName}] = repoInfos;
      let repoNameItems;
      if (repoInfos.length === 1) {
        repoNameItems = (
          <span className='repo-name'>{repoName}</span>
        );
      } else {
        repoNameItems = _.map(repoInfos, ({repoOwner, repoName}, index) => {
          const repoInfos = [{repoOwner, repoName}];
          const repoLink = buildRoute('kanban', {repoInfos});
          return (
            <span key={repoLink} className='repo-name-wrap'>
              {index !== 0 && '&' || null}{/* Put an & between repo names */}
              <Link to={repoLink} className='repo-name'>{repoName}</Link>
            </span>
          );
        });
      }
      repoDetails = (
        <li className='repo-links'>
          <span className='repo-owner'>{repoOwner}</span>
          {'/'}
          {repoNameItems}
        </li>
      );
    }
    if (repoInfos.length) {
      milestonesDropdown = (
        <MilestonesDropdownShell repoInfos={repoInfos}/>
      );
    }
    const settingsMenuHelp = () => {
      /*eslint-disable no-alert */
      alert('When an Issue and Pull Request are linked (by writing "fixes #123" in the Pull Request description) the related Issue/Pull request is removed from the list.\n Developers will probably want to see the Pull Request in their board (since they created it) while QA would probably rather see the Issue (since they created it).');
      /*eslint-enable no-alert */
    };

    let managerMenu;
    if (repoInfos.length) {
      managerMenu = (
        <SettingsItem key='manager' to={getFilters().setRouteName('by-user').url()}>Manager (Issues by User)</SettingsItem>
      );
    }

    return (
      <div className='app-nav'>
        <BS.Navbar className='topbar-nav' fixedTop>
          <BS.Navbar.Header>
            <BS.Navbar.Brand>{brand}</BS.Navbar.Brand>
          </BS.Navbar.Header>
          <BS.Nav key='repo-details'>
            {repoDetails}
            <li key='active-filter' className='active-filter'>
              <span className='-just-here-because-bootstrap-pads-anchor-children-in-the-nav'>
                {filtering}
              </span>
            </li>
          </BS.Nav>
          <BS.Nav key='right' pullRight>
            {milestonesDropdown}
            <BS.NavDropdown key='settings' id='display-settings' title={settingsTitle}>
              <BS.MenuItem key='display' header>Display Settings</BS.MenuItem>
              <SettingsItem
                key='HideUncategorized'
                onSelect={SettingsStore.toggleHideUncategorized.bind(SettingsStore)}
                isChecked={SettingsStore.getHideUncategorized()}
                >
                Hide Uncategorized
              </SettingsItem>
              <SettingsItem
                key='ShowEmptyColumns'
                onSelect={SettingsStore.toggleShowEmptyColumns.bind(SettingsStore)}
                isChecked={SettingsStore.getShowEmptyColumns()}
                >
                Show Empty Columns
              </SettingsItem>
              <SettingsItem
                key='TableLayout'
                onSelect={SettingsStore.toggleTableLayout.bind(SettingsStore)}
                isChecked={SettingsStore.getTableLayout()}
                >
                Use Table Layout
              </SettingsItem>
              <BS.MenuItem key='divider' divider/>
              <BS.MenuItem key='viewing-mode' header>Viewing Mode
                <button
                  className='btn btn-xs btn-default'
                  onClick={settingsMenuHelp}
                  >
                  <i className='octicon octicon-question'/>
                </button>
              </BS.MenuItem>
              <SettingsItem
                key='RelatedHideIssues'
                onSelect={SettingsStore.setRelatedHideIssues.bind(SettingsStore)}
                isChecked={SettingsStore.getRelatedHideIssues()}
                >
                Developer-Friendly
              </SettingsItem>
              <SettingsItem
                key='RelatedHidePullRequests'
                onSelect={SettingsStore.setRelatedHidePullRequests.bind(SettingsStore)}
                isChecked={SettingsStore.getRelatedHidePullRequests()}
                >
                QA-Friendly
              </SettingsItem>
              <SettingsItem
                key='RelatedShowAll'
                onSelect={SettingsStore.setRelatedShowAll.bind(SettingsStore)}
                isChecked={SettingsStore.getRelatedShowAll()}
                >
                Combined
              </SettingsItem>
              {managerMenu}
              <BS.MenuItem key='divider2' divider/>
              <BS.MenuItem key='api-settings' header>GitHub API Settings</BS.MenuItem>
              <SettingsItem
                key='ShowPullRequestData'
                onSelect={SettingsStore.toggleShowPullRequestData.bind(SettingsStore)}
                isChecked={SettingsStore.getShowPullRequestData()}
                >
                Show More Pull Request Info
              </SettingsItem>
            </BS.NavDropdown>
            {loginButton}
          </BS.Nav>
        </BS.Navbar>
        <LoginModal show={showModal} container={this} onHide={close}/>
        <MoveModal container={this}/>
      </div>
    );
  }

});

export default AppNav;
