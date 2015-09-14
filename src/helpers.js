export const FETCHALL_MAX = 10;

export function fetchAll(maxRequests, fn, args) {
  let acc = [];
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

// Of the form `# - ...`
export const KANBAN_LABEL = /^\d+\ -\ /;
export const UNCATEGORIZED_NAME = '999 - Uncategorized';
