import mongoose from 'mongoose';

let connection = null;

export async function setupTestDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-test';

  try {
    connection = await mongoose.connect(uri);
    return connection;
  } catch (error) {
    throw new Error(`Failed to connect to test database: ${error.message}`);
  }
}

export async function teardownTestDb() {
  if (!connection) return;

  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    connection = null;
  } catch (error) {
    console.error('Teardown error:', error);
  }
}

export async function clearCollections() {
  if (!connection) return;

  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map(collection => collection.deleteMany({}))
  );
}
