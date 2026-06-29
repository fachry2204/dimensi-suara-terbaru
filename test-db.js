import db from './server/config/db.js';

async function test() {
    try {
        const [genres] = await db.query('SELECT * FROM genres LIMIT 5');
        console.log('Genres:', genres);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
