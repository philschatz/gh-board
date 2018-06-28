import {Component} from 'react';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import {setRouterHistory, setFilters} from '../../route-utils';
import SettingsStore from '../../settings-store';
import history from '../../history';

import AppNav from './nav';
import Footer from './footer';

class App extends Component {
  componentDidMount() {
    SettingsStore.on('change:tableLayout', this.onChange);
    this._historyListener = history.listen(this.storeHistory);
  }

  UNSAFE_componentWillMount() {
    SettingsStore.off('change:tableLayout', this.onChange);
    setRouterHistory(history);
    setFilters(this.props);
  }

  UNSAFE_componentWillUpdate(newProps) {
    setFilters(newProps);
  }

  componentWillUnmount() {
    this._historyListener();
  }

  storeHistory = () => {
    if (window.ga) {
      const {pathname, hash} = window.location;
      window.ga('set', 'page', pathname + hash);
      // window.ga('set', 'page', '/gh-board/#' + locationChangeEvent.pathname + locationChangeEvent.search);
      window.ga('send', 'pageview');
    }
  };

  onChange = () => {
    this.forceUpdate();
  };

  render() {
    const {params} = this.props;
    const classes = ['app'];

    return (
      <div className={classes.join(' ')}>
        <AppNav params={params}/>
        {/* Subroutes are added here */}
        {this.props.children}
        <Footer/>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(App);
