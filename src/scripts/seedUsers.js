require('dotenv').config();
const { initDatabase } = require('../config/database');
const User = require('../models/User');

const seedUsers = async () => {
  try {
    initDatabase();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const testUser = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-15'
    };
    
    const existingUser = await User.findByEmail(testUser.email);
    if (existingUser) {
      console.log('Test user already exists');
      return;
    }
    
    const user = await User.create(testUser);
    console.log('Test user created successfully:', User.formatUser(user));
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();