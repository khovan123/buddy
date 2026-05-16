const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27018/content_db');
  
  const db = mongoose.connection.db;
  const count = await db.collection('Collections').countDocuments({ type: 'TUTORIAL' });
  console.log('TUTORIAL Count:', count);
  
  const collection = await db.collection('Collections').findOne({ type: 'TUTORIAL' });
  console.log('Collection:', JSON.stringify(collection, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
