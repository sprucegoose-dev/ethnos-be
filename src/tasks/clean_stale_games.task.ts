import '../../database/connection';

import StaleGamesCleaner from './clean_stale_games';

(async () => {
    await StaleGamesCleaner.cleanUp();
    process.exit();
})();
