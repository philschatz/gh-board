export const FETCHALL_MAX = 10;

export function fetchAll(maxRequests, fn, args) {
  let acc = [];
  if (!args) {
    args = {perPage: 100};
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
  return Math.sqrt(
     color.r * color.r * .299 +
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
  return {name: UNCATEGORIZED_NAME};
}
