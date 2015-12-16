import Recordo from 'recordo';
import startRouter from './components/router.jsx';
import CurrentUserStore from './user-store';

Recordo.initialize();
startRouter();

CurrentUserStore.fetchEmojis();
