import {EventEmitter} from 'events';

function localGet(key) {
  const settings = window.localStorage.getItem('gh-board-settings');
  if (settings) {
    return JSON.parse(settings)[key];
  }
  return null;
}
function localSet(key, val) {
  const settings = window.localStorage.getItem('gh-board-settings');
  if (settings) {
    const obj = JSON.parse(settings);
    obj[key] = val;
    window.localStorage.setItem('gh-board-settings', JSON.stringify(obj));
  } else {
    const obj = {};
    obj[key] = val;
    window.localStorage.setItem('gh-board-settings', JSON.stringify(obj));
  }
}

let isShowSimpleList = localGet('isShowSimpleList') || false;
let isHideUncategorized = localGet('isHideUncategorized') || false;
let isShowEmptyColumns = localGet('isShowEmptyColumns') || false;
let isTableLayout = localGet('isTableLayout') || false; // eslint-disable-line
let isRelated = localGet('isRelated') || 1; // The "I want to focus on Issues" or "PullRequests" tri-state
let isShowPullRequestData = localGet('isShowPullRequestData') || false; // By default (anon users) this is unchecked. Gets checked when user logs in

class SettingsStore extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }

  resetSettings() {
    window.localStorage.removeItem('gh-board-settings');
    window.sessionStorage.removeItem('octokat-cache');
    this.emit('change');
  }

  toggleShowSimpleList() {
    isShowSimpleList = !isShowSimpleList;
    localSet('isShowSimpleList', isShowSimpleList);
    this.emit('change');
  }
  getShowSimpleList() {
    return isShowSimpleList;
  }
  toggleHideUncategorized() {
    isHideUncategorized = !isHideUncategorized;
    localSet('isHideUncategorized', isHideUncategorized);
    this.emit('change');
  }
  getHideUncategorized() {
    return isHideUncategorized;
  }
  toggleShowEmptyColumns() {
    isShowEmptyColumns = !isShowEmptyColumns;
    localSet('isShowEmptyColumns', isShowEmptyColumns);
    this.emit('change');
  }
  getShowEmptyColumns() {
    return isShowEmptyColumns;
  }
  setRelatedShowAll() {
    isRelated = 3;
    localSet('isRelated', isRelated);
    this.emit('change');
  }
  getRelatedShowAll() {
    return isRelated === 3;
  }
  setRelatedHideIssues() {
    isRelated = 1;
    localSet('isRelated', isRelated);
    this.emit('change');
  }
  getRelatedHideIssues() { // TODO: Is this used?
    return isRelated === 1;
  }
  setRelatedHidePullRequests() {
    isRelated = 2;
    localSet('isRelated', isRelated);
    this.emit('change');
  }
  getRelatedHidePullRequests() {
    return isRelated === 2;
  }
  toggleShowPullRequestData() {
    isShowPullRequestData = !isShowPullRequestData;
    localSet('isShowPullRequestData', isShowPullRequestData);
    // this.emit('change');
    this.emit('change:showPullRequestData', isShowPullRequestData);
  }
  setShowPullRequestData() {
    // The App does this when we verify the user is logged in
    isShowPullRequestData = true;
    localSet('isShowPullRequestData', isShowPullRequestData);
    // this.emit('change');
    this.emit('change:showPullRequestData', isShowPullRequestData);
  }
  getShowPullRequestData() {
    return isShowPullRequestData;
  }

}


export default new SettingsStore();
