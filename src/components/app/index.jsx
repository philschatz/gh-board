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
import FilterStore from '../../filter-store';
import IssueStore from '../../issue-store';
import history from '../../history';
import {getReposFromStr, convertRepoInfosToStr} from '../../helpers';

import LoginModal from '../login-modal';
import LabelBadge from '../label-badge';
import MoveModal from '../move-modal';
import Time from '../time';
import Loadable from '../loadable';
import GithubFlavoredMarkdown from '../gfm';
import AppNav from './nav';
import Footer from './footer';

const App = React.createClass({
  componentDidMount() {
    SettingsStore.on('change:tableLayout', this.onChange);
    this._historyListener = history.listen(this.storeHistory);
    this.storeHistory({path: this.props.route.path});
  },
  componentWillMount() {
    SettingsStore.off('change:tableLayout', this.onChange);
  },
  componentWillUnmount() {
    this._historyListener();
  },
  storeHistory(locationChangeEvent) {
    if (window.ga) {
      window.ga('set', 'page', '/gh-board' + locationChangeEvent.pathname);
      window.ga('send', 'pageview');
    }
  },
  onChange() {
    this.forceUpdate();
  },
  render() {
    const {params} = this.props;
    const classes = ['app'];
    if (SettingsStore.getTableLayout()) {
      classes.push('is-table-layout');
    }

    return (
      <div className={classes.join(' ')}>
        <AppNav params={params}/>
        {/* Subroutes are added here */}
        {this.props.children}
        <Footer/>
      </div>
    );
  }
});

export default DragDropContext(HTML5Backend)(App);
