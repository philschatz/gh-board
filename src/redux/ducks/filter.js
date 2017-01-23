import Duck from 'reduck';
import {LOCATION_CHANGE} from 'react-router-redux';
import qs from 'qs';

import {KANBAN_LABEL} from '../../helpers';

const initialState = {
  milestoneTitles: [],
  tagNames: [],
  states: ['open'],
  types: ['issue', 'pull-request'],
  columnLabels: [],
  columnRegExp: KANBAN_LABEL
};

const duck = new Duck('filter', initialState);

function parseArray(x) {
  if (Array.isArray(x)) {
    return x;
  } else {
    return [x];
  }
}

duck.addReducerCase(LOCATION_CHANGE, {
  reducer(state, {payload}) {
    const {pathname, search} = payload;
    const query = qs.parse(search.replace(/^\?/, ''));
    return {
      ...state,
      ...query.m && {milestoneTitles: parseArray(query.m)},
      ...query.l && {tagNames: parseArray(query.l)},
      ...query.c && {columnLabels: parseArray(query.c)},
      ...query.u && {userName: query.u},
      ...query.s && {states: parseArray(query.s)},
      ...query.t && {types: parseArray(query.t)},
      ...query.x && {columnRegExp: new RegExp(query.x)}
    };
  },
});

export default duck.reducer;
