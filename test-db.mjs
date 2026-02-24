import { getDb } from './server/db.js';
const db = await getDb();
if (!db) {
    console.error('No DB connection');
    process.exit(1);
}
try {
    const result = await db.execute('SELECT COUNT(*) as count FROM conversations');
    console.log('Conversations count:', result[0].count);
    
    const result2 = await db.execute('SELECT COUNT(*) as count FROM leads');
    console.log('Leads count:', result2[0].count);
    
    console.log('DB Connection OK');
} catch (e) {
    console.error('DB Error:', e.message);
}
