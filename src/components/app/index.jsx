import React from 'react';
import {History} from 'react-router';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import {setRouterHistory} from '../../route-utils';
import SettingsStore from '../../settings-store';
import history from '../../history';

import AppNav from './nav';
import Footer from './footer';

const App = React.createClass({
  mixins: [History],
  componentDidMount() {
    SettingsStore.on('change:tableLayout', this.onChange);
    this._historyListener = history.listen(this.storeHistory);
    this.storeHistory({path: this.props.route.path});
  },
  componentWillMount() {
    SettingsStore.off('change:tableLayout', this.onChange);
    setRouterHistory(this.history);
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
