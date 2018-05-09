import {EventEmitter} from 'events';
import {Component} from 'react';
import Moment from 'moment';

const RELOAD_TIME_SHORT = 30 * 1000;
const RELOAD_TIME_LONG = 5 * 60 * 1000;

function getReloadTime() {
  if (document.hidden) {
    return RELOAD_TIME_LONG;
  } else {
    return RELOAD_TIME_SHORT;
  }
}

export const Timer = new class Store extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  onTick(listener)  { this.on('tick', listener); }
  offTick(listener) { this.off('tick', listener); }
};

// since there can be hundreds of issues, increase the max limit
Timer.setMaxListeners(0);

// `tick` every `UPDATE_INTERVAL`
let timerTimeout = null;
const timerFn = () => {
  Timer.emit('tick');
  if (window.ga) {
    window.ga('send', 'event', {
      eventCategory: 'visibility',
      eventAction: 'poll',
      eventValue: document.hidden ? 0 : 1,
      eventLabel: document.hidden ? 'Hidden' : 'Visible'
    });
  }

  // const d = new Date();
  // console.log('tick', d.getMinutes(), d.getSeconds());
  timerTimeout = setTimeout(timerFn, getReloadTime());
};
timerFn();

const handleVisibilityChange = () => {
  if (!document.hidden) {
    clearTimeout(timerTimeout);
    timerFn();
  }
  if (window.ga) {
    window.ga('send', 'event', {
      eventCategory: 'visibility',
      eventAction: 'change',
      eventValue: document.hidden ? 0 : 1,
      eventLabel: document.hidden ? 'Hidden' : 'Visible'
    });
  }

};
document.addEventListener('visibilitychange', handleVisibilityChange, false);

class Time extends Component {
  state = {forceUpdate: this.forceUpdate.bind(this)};

  UNSAFE_componentWillMount() {
    Timer.onTick(this.state.forceUpdate);
  }

  componentWillUnmount() {
    Timer.offTick(this.state.forceUpdate);
  }

  render() {
    const {dateTime, className} = this.props;
    const humanized = Moment(dateTime).fromNow();
    return (
      <time {...this.props} dateTime={dateTime} className={className} title={dateTime}>{humanized}</time>
    );
  }
}

export default Time;
