import {KANBAN_LABEL} from '../../../helpers';

export const DEFAULT_STATE = {
  milestoneTitles: [],
  tagNames: [],
  states: ['open'],
  types: ['issue', 'pull-request'],
  columnLabels: [],
  columnRegExp: KANBAN_LABEL
};

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
  } else if (vals) {
    arr.push(vals);
    options[key] = arr;
  } else {
    // it was null, so ignore it
  }
}

// Generate a URL based on various filters and whatnot
// `/r/:repoStr(/m/:milestonesStr)(/t/:tagsStr)(/u/:user)(/x/:columnRegExp)/:name(/:startShas)(/:endShas)
export default function buildRoute(pathname, {milestoneTitles, tagNames, columnLabels, userName, columnRegExp, states, types}={}) {
  milestoneTitles = milestoneTitles || [];
  tagNames = tagNames || [];

  const options = {};
  addParams(options, 'm', milestoneTitles);
  addParams(options, 'l', tagNames);
  addParams(options, 'c', columnLabels);
  addParams(options, 'u', userName);
  addParams(options, 's', states, DEFAULT_STATE.states); // include the defaults so the URL is cleaner
  addParams(options, 't', types, DEFAULT_STATE.types);
  if (columnRegExp) {
    const re = columnRegExp.toString();
    // Strip off the wrapping `/` marks
    addParams(options, 'x', re.substring(1, re.length-1));
  }

  return pathname + toQueryString(options);
}
