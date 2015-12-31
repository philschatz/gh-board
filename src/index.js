import 'babel-polyfill';
import Recordo from 'recordo';
import startRouter from './router';
import CurrentUserStore from './user-store';

Recordo.initialize();
startRouter();

CurrentUserStore.fetchEmojis();
