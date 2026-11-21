const mongoose = require('mongoose');

jest.setTimeout(30000);

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/complaint_redressal_test';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_long_enough_1234567890';
  process.env.JWT_EXPIRES_IN = '1h';

  try {
    await mongoose.connect(TEST_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    // Clear test database collections before tests run
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  } catch (err) {
    console.warn('Local MongoDB connection failed in test setup, attempting MongoMemoryServer...', err.message);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    global.__MONGO_SERVER__ = mongoServer;
  }
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.db.dropDatabase();
    } catch (e) {
      // ignore
    }
    await mongoose.disconnect();
  }
  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
  }
}, 10000);
