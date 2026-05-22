const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Document = require('../models/Document');

const MONGO_URI = 'mongodb://localhost:27017/docsapp_test';

let token, userId, otherToken, otherId;

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Document.deleteMany({});

  // Create primary user
  const reg = await request(app).post('/api/auth/register').send({
    name: 'Doc User',
    email: 'docuser@example.com',
    password: 'password123',
  });
  token = reg.body.token;
  userId = reg.body.user._id;

  // Create second user
  const reg2 = await request(app).post('/api/auth/register').send({
    name: 'Other User',
    email: 'other@example.com',
    password: 'password123',
  });
  otherToken = reg2.body.token;
  otherId = reg2.body.user._id;
});

describe('POST /api/documents', () => {
  it('creates a document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Doc', content: '<p>Hello</p>' });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('My Doc');
    expect(res.body.owner.email).toBe('docuser@example.com');
  });

  it('rejects empty title', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '   ' });

    expect(res.statusCode).toBe(400);
  });

  it('requires auth', async () => {
    const res = await request(app).post('/api/documents').send({ title: 'Test' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/documents', () => {
  it('returns owned and shared documents', async () => {
    // Create doc owned by primary user
    await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Owned Doc' });

    // Create doc owned by other, shared with primary
    const docRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Shared Doc' });

    await request(app)
      .post(`/api/documents/${docRes.body._id}/share`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ email: 'docuser@example.com', permission: 'editor' });

    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    const titles = res.body.map((d) => d.title);
    expect(titles).toContain('Owned Doc');
    expect(titles).toContain('Shared Doc');
  });
});

describe('PUT /api/documents/:id', () => {
  it('updates a document', async () => {
    const create = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', content: '<p>v1</p>' });

    const docId = create.body._id;

    const res = await request(app)
      .put(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated', content: '<p>v2</p>' });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.content).toBe('<p>v2</p>');
  });

  it('denies update to non-member', async () => {
    const create = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Private Doc' });

    const res = await request(app)
      .put(`/api/documents/${create.body._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ content: '<p>hacked</p>' });

    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/documents/:id/share', () => {
  it('shares a document with another user', async () => {
    const doc = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Shared' });

    const res = await request(app)
      .post(`/api/documents/${doc.body._id}/share`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@example.com', permission: 'editor' });

    expect(res.statusCode).toBe(200);
    expect(res.body.sharedWith.length).toBe(1);
    expect(res.body.sharedWith[0].user.email).toBe('other@example.com');
  });

  it('only owner can share', async () => {
    const doc = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Protected' });

    const res = await request(app)
      .post(`/api/documents/${doc.body._id}/share`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ email: 'someone@example.com', permission: 'viewer' });

    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/documents/:id', () => {
  it('owner can delete', async () => {
    const doc = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To Delete' });

    const res = await request(app)
      .delete(`/api/documents/${doc.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });

  it('non-owner cannot delete', async () => {
    const doc = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Protected' });

    const res = await request(app)
      .delete(`/api/documents/${doc.body._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toBe(403);
  });
});
