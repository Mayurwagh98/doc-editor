require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Document = require('./models/Document');

const seed = async () => {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Document.deleteMany({});
  console.log('Cleared existing data');

  // Create seed users
  const users = await User.insertMany([
    { name: 'Mayur Wagh', email: 'mswagh98@gmail.com', password: 'password123' },
    { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob Smith', email: 'bob@example.com', password: 'password123' },
  ]);

  // Passwords are auto-hashed by pre-save hook, but insertMany bypasses hooks
  // So we create each user individually
  await User.deleteMany({});

  const mayur = await User.create({ name: 'Mayur Wagh', email: 'mswagh98@gmail.com', password: 'password123' });
  const alice = await User.create({ name: 'Alice Johnson', email: 'alice@example.com', password: 'password123' });
  const bob = await User.create({ name: 'Bob Smith', email: 'bob@example.com', password: 'password123' });

  console.log('Created users:', [mayur.email, alice.email, bob.email]);

  // Create seed documents
  const doc1 = await Document.create({
    title: 'Project Kickoff Notes',
    content: `<h1>Project Kickoff Notes</h1><p>Welcome to our collaborative workspace! This document covers the main goals and milestones.</p><h2>Goals</h2><ul><li>Build a fast, intuitive editor</li><li>Support real-time collaboration</li><li>Keep it lightweight</li></ul><p><strong>Next steps:</strong> Schedule standup for Monday at 9am.</p>`,
    owner: mayur._id,
    sharedWith: [{ user: alice._id, permission: 'editor' }],
  });

  const doc2 = await Document.create({
    title: 'Design Spec v1',
    content: `<h1>Design Specification</h1><p>This document outlines the UX and visual design for the product.</p><h2>Color Palette</h2><p>Primary: <strong>#3B82F6</strong> (blue), Secondary: <em>#6B7280</em> (gray)</p><h2>Typography</h2><p>Headings: Inter Bold, Body: Inter Regular</p>`,
    owner: alice._id,
    sharedWith: [{ user: mayur._id, permission: 'viewer' }],
  });

  const doc3 = await Document.create({
    title: 'My Personal Notes',
    content: `<h2>Ideas</h2><p>Random thoughts and ideas go here. <u>Remember to follow up</u> on the backend performance issue.</p>`,
    owner: mayur._id,
  });

  console.log('Created documents:', [doc1.title, doc2.title, doc3.title]);
  console.log('\n✅ Seed complete!');
  console.log('\nTest accounts:');
  console.log('  Email: mswagh98@gmail.com  | Password: password123');
  console.log('  Email: alice@example.com   | Password: password123');
  console.log('  Email: bob@example.com     | Password: password123');

  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
