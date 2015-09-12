import _ from 'underscore';
import {EventEmitter} from 'events';

import {contains} from './helpers';

let isHideUncategorized = false;
let isShowEmptyColumns = false;
let isTableLayout = false;

let userFilter = null;
let filteredLabels = [];

class Store extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  toggleHideUncategorized() {
    isHideUncategorized = !isHideUncategorized;
    this.emit('change');
  }
  getHideUncategorized() {
    return isHideUncategorized;
  }
  toggleShowEmptyColumns() {
    isShowEmptyColumns = !isShowEmptyColumns;
    this.emit('change');
  }
  getShowEmptyColumns() {
    return isShowEmptyColumns;
  }
  toggleTableLayout() {
    isTableLayout = !isTableLayout;
    this.emit('change');
  }
  getTableLayout() {
    return isTableLayout;
  }
  clearUser() {
    userFilter = null;
    this.emit('change');
    this.emit('change:user', null);
  }
  setUser(user) {
    userFilter = user;
    this.emit('change');
    this.emit('change:user', user);
  }
  getUser() {
    return userFilter;
  }
  addLabel(label) {
    const containsLabel = contains(filteredLabels, (l) => {
      return l.name === label.name;
    });
    if (!containsLabel) {
      filteredLabels.push(label);
      this.emit('change');
      this.emit('change:labels', filteredLabels);
    }
  }
  removeLabel(label) {
    filteredLabels = _.filter(filteredLabels, (l) => {
      return label.name !== l.name;
    });
    this.emit('change');
    this.emit('change:labels', filteredLabels);
  }
  getLabels() {
    return filteredLabels;
  }
}

const FilterStore = new Store();
export {FilterStore};
