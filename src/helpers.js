export function fetchAll(fn, args) {
  let acc = [];
  let p = new Promise((resolve, reject) => {
    fn(args).then((val) => {
      acc = acc.concat(val);
      if (val.nextPage) {
        fetchAll(val.nextPage).then((val2) => {
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
const KANBAN_LABEL = /^\d+\ -\ /;
const ICEBOX_NAME = '999 - Icebox';

export {KANBAN_LABEL, ICEBOX_NAME};
