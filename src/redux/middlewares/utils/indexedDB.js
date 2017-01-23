import Dexie from 'dexie';
import filterCards from './filterCards';
import Card from '../../ducks/utils/card';

//
// Declare Database
//
let db = new Dexie('gh-board');
db.version(1).stores({
  issues: 'id,[repoOwner+repoName],state',
  repoLabels: '[repoOwner+repoName]',
  repositories: '[repoOwner+repoName]'
});

window._db = db;

export function resetDatabases() {
  return Promise.all([
    db.issues.delete(),
    db.repoLabels.delete(),
    db.repositories.delete(),
  ]);
}

export function fetchCards(filter, repoInfos) {
  const {states} = filter;
  const cards = [];
  let query;
  if (states.length === 1) {
    query = db.issues.where('state').equals('open');
  } else if (states.length === 2 /* [open, closed] */) {
    query = db.issues;
  }
  return query.each((value) => {
    const {repoOwner, repoName, issue, pr, status} = value;
    const number = issue.number;
    cards.push(new Card(repoOwner, repoName, number, null, issue, pr, status));
  }).then(() => {
    return filterCards(cards, filter, repoInfos);
  });
}

function toCardValue(card) {
  const {repoOwner, repoName, issue, _pr, _prStatus} = card;
  const value = {
    id: issue.id,
    repoOwner,
    repoName,
    issue, // TODO: Filter out useless info like URLs. No need to clutter up the db
    state: issue.state
  };
  if (_pr) value.pr = _pr; // TODO: Filter out useless info like URLs. No need to clutter up the db
  if (_prStatus) value.status = _prStatus;
  return value;
}

export function putCard(card) {
  return db.issues.put(toCardValue(card));
}

export function putCards(cards) {
  return db.issues.bulkPut(cards.map(toCardValue));
}

export function putRepoLabels(repoOwner, repoName, labels) {
  return db.repoLabels.put({labels, repoOwner, repoName});
}

export function getRepoOrNull(repoOwner, repoName) {
  return db.repositories.get({
    repoOwner,
    repoName
  }).then((val) => {
    if (!val.repoName) {
      console.error('BUG: Looks like we retrieved something that is not a repo. Maybe it was a string?', val);
      throw new Error('BUG: Looks like we retrieved something that is not a repo. Maybe it was a string?');
    }
    return val;
  })
  .catch(() => null);
}

export function putRepos(repos) {
  return db.repositories.bulkPut(repos.map(r => r));
}

export function putCardsAndRepos(cards, repos) {
  return Promise.all([
    putCards(cards),
    putRepos(repos)
  ]);
}

export function getRepoLabelsOrNull(repoOwner, repoName) {
  return db.repoLabels.get({
    repoOwner,
    repoName
  })
  .catch(() => null);
}
