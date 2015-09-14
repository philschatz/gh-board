import startRouter from './components/router.jsx';
import CurrentUserStore from './user-store';

startRouter();

CurrentUserStore.fetchEmojis();
