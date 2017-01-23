import Duck from 'reduck';

import {
  RESET_SETTINGS,
  TOGGLE_SHOW_SIMPLE_LIST,
  TOGGLE_HIDE_UNCATEGORIZED,
  TOGGLE_SHOW_EMPTY_COLUMNS,
  SET_VIEWING_MODE,
  TOGGLE_SHOW_PR_DATA
} from '../actions';

export const VIEWING_MODE = {
  DEV: 1,
  QA: 2,
  COMBINED: 3
};

let storedSettings;
try {
  storedSettings = JSON.parse(window.localStorage.getItem('gh-board-settings'));
} catch (err) {
  storedSettings = undefined;
}

const DEFAULT_STATE = {
  isShowSimpleList: false,
  isHideUncategorized: false,
  isShowEmptyColumns: false,
  viewingMode: VIEWING_MODE.DEV, // The "I want to focus on Issues" or "PullRequests" tri-state
  isShowPullRequestData: false // By default (anon users) this is unchecked. Gets checked when user logs in
};

const initialState = storedSettings || DEFAULT_STATE;

const duck = new Duck('settings', initialState);

export const resetSettings = duck.defineAction(RESET_SETTINGS, {
  creator() {
    return {meta: {updateSettingStorage: true}};
  },
  reducer() {
    return DEFAULT_STATE;
  },
});

export const toggleShowSimpleList = duck.defineAction(TOGGLE_SHOW_SIMPLE_LIST, {
  creator() {
    return {meta: {updateSettingStorage: true}};
  },
  reducer(state) {
    return {
      ...state,
      isShowSimpleList: !state.isShowSimpleList
    };
  },
});

export const toggleHideUncategorized = duck.defineAction(TOGGLE_HIDE_UNCATEGORIZED, {
  creator() {
    return {meta: {updateSettingStorage: true}};
  },
  reducer(state) {
    return {
      ...state,
      isHideUncategorized: !state.isHideUncategorized
    };
  },
});

export const toggleShowEmptyColumns = duck.defineAction(TOGGLE_SHOW_EMPTY_COLUMNS, {
  creator() {
    return {meta: {updateSettingStorage: true}};
  },
  reducer(state) {
    return {
      ...state,
      isShowEmptyColumns: !state.isShowEmptyColumns
    };
  },
});

export const setViewingMode = duck.defineAction(SET_VIEWING_MODE, {
  creator(mode) {
    return {payload: mode, meta: {updateSettingStorage: true}};
  },
  reducer(state, {payload}) {
    return {
      ...state,
      viewingMode: payload
    };
  },
});

export const toggleShowPullRequestData = duck.defineAction(TOGGLE_SHOW_PR_DATA, {
  creator() {
    return {meta: {updateSettingStorage: true}};
  },
  reducer(state) {
    return {
      ...state,
      isShowPullRequestData: !state.isShowPullRequestData
    };
  },
});

export default duck.reducer;
