import {EventEmitter} from 'events';

let showIcebox = true;

class Store extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  setShowIcebox(flag) {
    showIcebox = !!flag;
    this.emit('change');
  }
  getShowIcebox() {
    return showIcebox;
  }
}

const FilterStore = new Store();
export {FilterStore};
