import {EventEmitter} from 'events';

class Progress extends EventEmitter {
  constructor(max) {
    super();
    this.max = max;
    this.ticks = 0;
    this.isComplete = false;
  }
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  start(context) {
    this.emit('start', context);
  }
  tick(context) {
    if (this.isComplete) {
      throw new Error('BUG! cannot tick when progress is already complete');
    }
    if (this.max && this.ticks > this.max) {
      throw new Error('BUG! cannot tick when max ticks have occurred');
    }
    this.ticks += 1;
    this.emit('tick', context, this.ticks);
  }
  stop(context) {
    this.isComplete = true;
    this.emit('stop', context);
  }
}

export default Progress
