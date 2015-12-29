export const FETCHALL_MAX = 10;

export function fetchAll(maxRequests, fn, args) {
  let acc = [];
  if (!args) {
    args = {per_page: 100};
  }
  let p = new Promise((resolve, reject) => {
    fn(args).then((val) => {
      acc = acc.concat(val);
      if (val.nextPage && maxRequests) {
        fetchAll(maxRequests - 1, val.nextPage).then((val2) => {
          acc = acc.concat(val2);
          resolve(acc);
        }, reject);
      } else {
        resolve(acc);
      }
    }, reject);
  });
  return p;
}


export function contains(arr, condition) {
  for (const item of arr) {
    if (condition(item)) {
      return true;
    }
  }
  return false;
}

// http://alienryderflex.com/hsp.html
export function isLight(hexColor) {
  const color = {
    r: parseInt(hexColor.substring(0, 2), 16),
    g: parseInt(hexColor.substring(2, 4), 16),
    b: parseInt(hexColor.substring(4, 6), 16)
  };
  // return Math.sqrt(
  //    color.r * color.r * .299 +
  //    color.g * color.g * .587 +
  //    color.b * color.b * .114) >= 130;
  return Math.sqrt(
     color.r * color.r * .199 +
     color.g * color.g * .587 +
     color.b * color.b * .114) >= 130;
}

// Of the form `# - ...`
export const KANBAN_LABEL = /^\d+\ -\ /;
export const UNCATEGORIZED_NAME = '999 - Uncategorized';

export function getCardColumn(card) {
  for (const label of card.issue.labels) {
    if (KANBAN_LABEL.test(label.name)) {
      return label;
    }
  }
  // not found. Must be uncategorized
  return {name: UNCATEGORIZED_NAME, color: 'cccccc'};
}

export function getReposFromStr(repoStr) {
  let lastRepoOwner = null;
  return repoStr.split('|').map((repoInfo) => {
    const repoInfoArr = repoInfo.split(':');
    if (repoInfoArr.length === 1) {
      const [repoName] = repoInfoArr;
      return {repoOwner:lastRepoOwner, repoName};
    } else if (repoInfoArr.length === 2){
      const [repoOwner, repoName] = repoInfoArr;
      lastRepoOwner = repoOwner;
      return {repoOwner, repoName};
    } else {
      throw new Error('Invalid repo format!');
    }
  });
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
  });
}
