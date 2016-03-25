import _ from 'underscore';
import moment from 'moment';

import {getFilters} from './route-utils';
import IssueStore from './issue-store';

// 3 implementations: indexedDB, LocalStorage, In-mem
import Dexie from 'dexie';
import levelup from 'levelup';
import memdown from 'memdown';
import leveljs from 'level-js';
// import localstorage from 'localstorage-down';
// + querying the data
// import levelQuery from 'level-queryengine';
// import jsonqueryEngine from 'jsonquery-engine';


const DB_DATA = {
  'issues': {
    dbVersion: 1,
    indexes: [
    //   { name: '[repoOwner+repoName]', keyPath: ['repoOwner', 'repoName'], unique: false, multiEntry: false },
      { name: 'state', keyPath: 'state', unique: false, multiEntry: false },
    //   // Do state as 2nd arg because it can be omitted.
    //   // See https://stackoverflow.com/questions/12084177/in-indexeddb-is-there-a-way-to-make-a-sorted-compound-query
    //   { name: '[kanbanColumn+state]', keyPath: ['kanbanColumn', 'state'], unique: false, multiEntry: false },
    ]
  },
  // 'labels': {
  //   // dbVersion: 1,
  // },
  'repositories': {
    dbVersion: 1,
    // indexes: [
    //   { name: '[repoOwner+repoName]', keyPath: ['repoOwner', 'repoName'], unique: true, multiEntry: false }
    // ]
  },
  // 'octokatCache': {
  //   dbVersion: 3,
  // }
};


// MonkeyPatch memdown's batch function because it stringifies everything
memdown.prototype._batch = function (array, options, callback) {
  let err
    , i = -1
    , key
    , value
    , iter
    , len = array.length
    , tree = this._store[this._location]

  while (++i < len) {
    if (!array[i])
      continue;

    key = this._isBuffer(array[i].key) ? array[i].key : String(array[i].key)
    err = this._checkKey(key, 'key')
    if (err)
      return setImmediate(function errorCall() { callback(err) })

    iter = tree.find(key)

    if (array[i].type === 'put') {
      // value = this._isBuffer(array[i].value) ? array[i].value : String(array[i].value)
      value = array[i].value

      err = this._checkKey(value, 'value')

      if (err)
        return setImmediate(function errorCall() { callback(err) })

      tree = iter.valid ? iter.update(value) : tree.insert(key, value)
    } else {
      tree = iter.remove()
    }
  }

  this._store[this._location] = tree;

  setImmediate(callback)
}



// Try to load/save to IndexedDB and fall back to localStorage for persisting the cache.
// localStorage support is needed because IndexedDB is disabled for Private browsing in Safari/Firefox
const database = new class Database {
  constructor() {
    this._dbs = {}
    const dbNames = Object.keys(DB_DATA);
    for (const i in dbNames) {
      const key = dbNames[i];
      this._dbs[key] = this._toDb(key);
    }
    this._opts = {asBuffer:false, raw:true, valueEncoding: 'none', fillCache:false};
  }
  _toDb(dbName) {
    // See https://github.com/Level/levelup/wiki/Modules for more
    let driver;
    // driver = memdown;
    driver = leveljs;
    // driver = localstorage;

    const {dbVersion, indexes} = DB_DATA[dbName];
    const dbOpts = {db: driver, fillCache:false, asBuffer:false, raw:true, storePrefix:'', dbVersion:dbVersion, indexes:indexes, valueEncoding: 'none', };
    let actualDb = levelup(dbName, dbOpts);
    let memDb = levelup(dbName, {db:memdown, valueEncoding: 'none'}); // using memdb affects updateCard

    // memDb = levelQuery(memDb);
    // memDb.query.use(jsonqueryEngine());

    // TODO: somehow tell other code to wait until memDb is loaded
    actualDb.createReadStream()
    .on('data', ({key, value}) => {
      memDb.put(key, value);
    })
    .on('error', (err) => {
      callback(err);
    })
    .on('end', () => {
      console.log('Done loading DB into memDb for ', dbName);
    });


    return {memDb, actualDb};
  }
  _toPromise(ctx, method, ...args) {
    return new Promise((resolve, reject) => {
      method.call(ctx, ...args, (err, val) => {
        if (err) { return reject(err); }
        return resolve(val);
      });
    });
  }
  // Ensures that the correct DB is open before performing an operation
  _doOp(dbName, methodName, ...args) {
    const {memDb, actualDb} = this._dbs[dbName];
    let db;
    let method;
    if (methodName === 'get') {
      db = memDb;
      method = memDb.get;
    } else if (methodName === 'put') {
      db = actualDb;
      method = actualDb.put;
      // put it into memDb now, instead of waiting for success
      memDb.put(args[0], args[1], args[2]);
    } else if (methodName === 'batch') {
      db = actualDb;
      method = actualDb.batch;
      // put it into memDb now, instead of waiting for success
      memDb.batch(args[0], args[1], args[2]);
    } else {
      throw new Error('Unknown levelDB operation. Expected get or put but got ' + methodName);
    }
    return this._toPromise(db, method, ...args).then((val) => {
      return val;
    });
  }
  getCard(repoOwner, repoName, number) {
    return this._doOp('issues', 'get', `${repoOwner}/${repoName}#${number}`, this._opts);
  }
  fetchCards() {
    const {states} = getFilters().getState();
    const db = new Dexie('issues');
    db.version(DB_DATA['issues'].dbVersion / 10 /*Dexie multiplies everything by 10 bc IE*/).stores({'issues': 'id, state'})
    return db.open().then(function() {
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
        cards.push(IssueStore.issueNumberToCard(repoOwner, repoName, number, issue, pr, status));
      }).then(() => {
        return cards;
      });
    })

    // // Alternative Method using leveDB (slow)
    // const cards = [];
    // return new Promise((resolve, reject) => {
    //   const start = Date.now();
    //   this._dbs['issues'].actualDb.createReadStream()
    //   .on('data', ({key, value}) => {
    //     const {repoOwner, repoName, issue} = value;
    //     const number = issue.number;
    //     cards.push(new Card(repoOwner, repoName, number, IssueStore.getGraph(), issue));
    //   })
    //   .on('end', () => {
    //     console.log((Date.now() - start) / 1000);
    //     resolve(cards);
    //   });
    // });
  }
  patchCard(card) {
    // this is atomic only because the get is instant because it's in-mem
    const {repoOwner, repoName, number} = card;
    return this.getCard(repoOwner, repoName, number).then((cardData) => {
      _.extend({}, cardData, cardFields);
    });
  }
  toCardValue(card) {
    const {repoOwner, repoName, issue, _pr, _prStatus} = card;
    const {columnRegExp} = getFilters().getState();
    const labelNames = issue.labels.map((label) => label.name);
    const value = {
      repoOwner,
      repoName,
      issue, // TODO: Filter out useless info like URLs. No need to clutter up the db
      // Computed fields used for Card rendering
      labelNames,
      kanbanColumn: labelNames.filter((labelName) => columnRegExp.test(labelName))[0],
      state: issue.state,
      userName: issue.assignee ? issue.assignee.login : issue.user.login,
      milestoneName: issue.milestone ? issue.milestone.title : null,
      updatedAtMs: moment(issue.updatedAt).toDate().getTime(),
    };
    if (_pr) value.pr = _pr; // TODO: Filter out useless info like URLs. No need to clutter up the db
    if (_prStatus) value.status = _prStatus;
    return value;
  }
  putCard(card) {
    // return Promise.resolve();
    const {repoOwner, repoName, number} = card;
    const value = this.toCardValue(card);
    // console.log(`database.putCard ${repoOwner}/${repoName}#${number}`);
    return this._doOp('issues', 'put', `${repoOwner}/${repoName}#${number}`, value, this._opts);
  }
  putCards(cards) {
    const batchOps = cards.map((card) => {
      const {repoOwner, repoName, number} = card;
      const value = this.toCardValue(card);
      return {
        type: 'put',
        key: `${repoOwner}/${repoName}#${number}`,
        value: value
      };
    });
    return this._doOp('issues', 'batch', batchOps, this._opts);
  }

  getLabel(labelName) {
    return this._doOp('labels', 'get', labelName, this._opts);
  }
  putLabel(repoOwner, repoName, label) {
    const {name, color} = label;
    return this._doOp('labels', 'put', name, {color, repoOwner, repoName}, this._opts);
  }

  getRepo(repoOwner, repoName) {
    return this._doOp('repositories', 'get', `${repoOwner}/${repoName}`, this._opts);
  }
  getRepoOrNull(repoOwner, repoName) {
    return new Promise((resolve, reject) => {
      this.getRepo(repoOwner, repoName)
      .then((val) => {
        if (!val.repoName) {
          console.error('BUG: Looks like we retrieved something that is not a repo. Maybe it was a string?', val);
          throw new Error('BUG: Looks like we retrieved something that is not a repo. Maybe it was a string?');
        }
        resolve(val);
      })
      .catch(() => { resolve(null); })
    });
  }
  putRepo(repoOwner, repoName, value) {
    return this._doOp('repositories', 'put', `${repoOwner}/${repoName}`, value, this._opts);
  }

  putRepos(repos) {
    const batchOps = repos.map((repo) => {
      const {repoOwner, repoName} = repo;
      return {
        type: 'put',
        key: `${repoOwner}/${repoName}`,
        value: repo
      };
    });
    return this._doOp('repositories', 'batch', batchOps, this._opts);
  }

  putCardsAndRepos(cards, repos) {
    return this.putCards(cards).then(() => {
      return this.putRepos(repos);
    })
  }

  patchRepo(repoOwner, repoName, changes) {
    return new Promise((resolve, reject) => {
      // this is atomic only because the get is instant because it's in-mem
      this.getRepo(repoOwner, repoName).then((repoData) => {
        this.putRepo(repoOwner, repoName, _.extend({}, repoData, changes))
        .then(() => resolve(null))
        .catch((err) => reject(err));
      }).catch(() => {
        // this error above means the entry wasn't in the DB (which is OK for a PATCH)
        this.putRepo(repoOwner, repoName, changes)
        .then(() => resolve(null))
        .catch((err) => reject(err));
      });
    });
  }
};

window._database = database;


// Singleton
export default database;
