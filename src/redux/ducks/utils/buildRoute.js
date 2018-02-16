import _ from 'underscore';
import {KANBAN_LABEL} from '../../../helpers';

export const DEFAULT_STATE = {
  milestoneTitles: [],
  tagNames: [],
  states: ['open'],
  types: ['issue', 'pull-request'],
  columnLabels: [],
  columnRegExp: KANBAN_LABEL
};

export function getReposFromParams(params) {
  const repoStr = (params || {}).repoStr || '';
  let lastRepoOwner = null;
  return repoStr.split('|').reduce((prev, repoInfo) => {
    if (!repoInfo) { return prev; }
    const repoInfoArr = repoInfo.split(':');
    if (repoInfoArr.length === 1) {
      const [repoName] = repoInfoArr;
      prev.push({repoOwner:lastRepoOwner, repoName});
    } else if (repoInfoArr.length === 2){
      const [repoOwner, repoName] = repoInfoArr;
      lastRepoOwner = repoOwner;
      prev.push({repoOwner, repoName});
    } else {
      throw new Error('Invalid repo format!');
    }
    return prev;
  }, []);
}

export function convertRepoInfosToStr(repoInfos) {
  let lastRepoOwner = null;
  return repoInfos.map(({repoOwner, repoName}) => {
    if (lastRepoOwner === repoOwner) {
      return repoName;
    } else {
      lastRepoOwner = repoOwner;
      return [repoOwner, repoName].join(':');
    }
  }).join('|');
}

function toQueryString(options) {
  if (!options || options === {}) {
    return '';
  }
  let params = [];
  const ref = options || {};
  for (const key in ref) {
    let values = ref[key];
    if (!Array.isArray(values)) {
      values = [values];
    }
    values.forEach((val) => {
      params.push(`${key}=${encodeURIComponent(val)}`);
    });
  }
  if (params.length > 0) {
    return `?${params.join('&')}`;
  } else {
    return '';
  }
}

function addParams(options, key, vals, defaults) {
  const arr = options[key] || [];
  if (Array.isArray(vals)) {
    if (!defaults || JSON.stringify(defaults) !== JSON.stringify(vals)) {
      options[key] = arr.concat(vals);
    }
  } else if (vals && (typeof defaults === 'undefined' || vals !== defaults)) {
    arr.push(vals);
    options[key] = arr;
  } else {
    // it was null, so ignore it
  }
}

function regexToString(reg) {
  let s = reg.toString();
  // Strip off the wrapping `/` marks
  return s.substring(1, s.length-1);
}

const KANBAN_LABEL_STRING = regexToString(KANBAN_LABEL);

// Generate a URL based on various filters and whatnot
export default function buildRoute(pathname, {milestoneTitles, tagNames, columnLabels, userName, columnRegExp, states, types, routeSegmentName} = {}, repoInfos = []) {
  milestoneTitles = milestoneTitles || [];
  tagNames = tagNames || [];

  // when not changing the page then keep the original path segment
  // **BUT:** Allow setting '' explicitly to override this
  if (pathname === null) {
    pathname = routeSegmentName;
  }

  const options = {};
  addParams(options, 'm', milestoneTitles);
  addParams(options, 'l', tagNames);
  addParams(options, 'c', columnLabels);
  addParams(options, 'u', userName);
  addParams(options, 's', states, DEFAULT_STATE.states); // include the defaults so the URL is cleaner
  addParams(options, 't', types, DEFAULT_STATE.types);
  if (columnRegExp) {
    addParams(options, 'x', regexToString(columnRegExp), KANBAN_LABEL_STRING);
  }

  const parts = [];
  if (repoInfos.length) {
    const repoStr = convertRepoInfosToStr(repoInfos);
    parts.push(`/r/${repoStr}`);
  }

  if (pathname) { parts.push(`/${pathname}`); }

  return encodeURI(parts.join('')) + toQueryString(options);
}

export class FilterBuilder {
  constructor(state, repoInfos) {
    this.repoInfos = repoInfos;
    this.state = state || DEFAULT_STATE;
  }
  _immutable(update, erase) {
    return new FilterBuilder(erase ? update : {
      ...this.state,
      ...update,
    }, this.repoInfos);
  }
  _toggleKey(key, value) {
    let current = this.state[key];
    let i = current.indexOf(value);
    // if the string isn't found, try adding/removing the '-' to see if
    // there is an exclusion string that we can still remove
    // if (i < 0) {
    //   if (value[0] === '-') {
    //     i = current.indexOf(value.substring(1));
    //   } else {
    //     i = current.indexOf(`-${value}`);
    //   }
    // }

    let updated;

    if (i < 0) {
      updated = current.concat(value);
    } else {
      updated = current.slice(0, i).concat(current.slice(i+1));
    }
    return this._immutable({
      [key]: updated
    });
  }
  clearFilters() {
    this.state = DEFAULT_STATE;
    return this._immutable(DEFAULT_STATE, true);
  }
  // addMilestone(ms)
  // removeMilestone(ms)
  toggleMilestoneTitle(title) {
    return this._toggleKey('milestoneTitles', title);
  }
  clearMilestoneTitles() {
    return this._immutable({
      milestoneTitles: []
    });
  }
  // addTag(tag)
  // removeTag(tag)
  toggleTagName(tagName) {
    return this._toggleKey('tagNames', tagName);
  }
  toggleColumnLabel(columnLabel) {
    return this._toggleKey('columnLabels', columnLabel);
  }
  toggleState(state) {
    return this._toggleKey('states', state);
  }
  toggleType(type) {
    return this._toggleKey('types', type);
  }
  // setUser(user)
  // clearUser()
  toggleUserName(name) {
    const {userName} = this.state;
    if (userName) {
      name = null;
    }
    return this._immutable({
      username: name
    });
  }
  // setColumnRegExp(reStr)
  setRouteName(routeSegmentName) {
    return this._immutable({
      routeSegmentName
    });
  }
  url() {
    return buildRoute(null, this.state, this.repoInfos);
  }
  getState() {
    return Object.assign({}, this.state, {columnRegExp: KANBAN_LABEL});
  }
}
