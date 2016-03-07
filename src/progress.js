import {EventEmitter} from 'events';

class Progress extends EventEmitter {
  constructor() {
    super();
    this.max = 0;
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
      throw new Error(`BUG! cannot tick when progress is already complete. ticks=${this.ticks} max=${this.max}`);
    }
    if (this.max && this.ticks > this.max) {
      throw new Error('BUG! cannot tick when max ticks have occurred');
    }
    this.ticks += 1;
    this.emit('tick', context, this.ticks, this.max);
  }
  addTicks(num, context) {
    this.max += num;
    this.emit('add-ticks', context, this.ticks, this.max);
  }
  stop(context) {
    this.isComplete = true;
    this.emit('stop', context, this.ticks, this.max);
  }
}

export default Progress
