require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await User.deleteMany({});
  await Lead.deleteMany({});
  await Notification.deleteMany({});

  console.log('Creating users...');
  const users = await User.create([
    { name: 'Admin User', email: 'admin@crm.com', password: 'password123', role: 'admin' },
    { name: 'Manager One', email: 'manager@crm.com', password: 'password123', role: 'manager' },
    { name: 'Sales Rep One', email: 'sales1@crm.com', password: 'password123', role: 'sales' },
    { name: 'Sales Rep Two', email: 'sales2@crm.com', password: 'password123', role: 'sales' }
  ]);

  const [admin, manager, sales1, sales2] = users;

  console.log('Creating leads...');
  const statuses = ['new', 'contacted', 'qualified', 'won', 'lost'];
  const sources = ['website', 'referral', 'cold', 'social', 'other'];
  const leadsData = [];

  for (let i = 1; i <= 20; i++) {
    leadsData.push({
      name: `Lead Contact ${i}`,
      phone: `+91900000${String(i).padStart(4, '0')}`,
      email: `lead${i}@example.com`,
      source: sources[i % sources.length],
      status: statuses[i % statuses.length],
      notes: `Sample notes for lead ${i}`,
      assignedTo: i % 3 === 0 ? sales1._id : i % 3 === 1 ? sales2._id : null,
      createdBy: i % 2 === 0 ? sales1._id : manager._id
    });
  }

  await Lead.create(leadsData);

  console.log('\n✅ Seed completed!');
  console.log('  admin@crm.com    / password123  (admin)');
  console.log('  manager@crm.com  / password123  (manager)');
  console.log('  sales1@crm.com   / password123  (sales)');
  console.log('  sales2@crm.com   / password123  (sales)');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
