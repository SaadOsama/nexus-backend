const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    const userPass = await bcrypt.hash('user123', 10);
    const adminPass = await bcrypt.hash('admin123', 10);

    await db.execute('DELETE FROM users WHERE email IN ("user@nexus.com", "admin@nexus.com")');

    await db.execute(
      'INSERT INTO users (fullName, email, password, role) VALUES (?, ?, ?, ?)',
      ['Default User', 'user@nexus.com', userPass, 'user']
    );

    await db.execute(
      'INSERT INTO users (fullName, email, password, role) VALUES (?, ?, ?, ?)',
      ['System Admin', 'admin@nexus.com', adminPass, 'admin']
    );

    console.log('✅ Default User and Admin seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedDatabase();
