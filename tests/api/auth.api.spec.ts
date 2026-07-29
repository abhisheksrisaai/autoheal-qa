import { test, expect } from '@playwright/test';

/**
 * API Tests: Authentication endpoints.
 * 
 * While SauceDemo doesn't have a public API, these tests demonstrate
 * the API testing patterns using the framework's API client.
 */

test.describe('Auth API', () => {
  const API_BASE = process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';

  test('@api GET /posts - should return list of posts', async ({ request }) => {
    const response = await request.get(`${API_BASE}/posts`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    
    // Validate structure of first post
    const post = body[0];
    expect(post).toHaveProperty('userId');
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('body');
  });

  test('@api GET /posts/:id - should return a single post', async ({ request }) => {
    const response = await request.get(`${API_BASE}/posts/1`);
    
    expect(response.status()).toBe(200);
    
    const post = await response.json();
    expect(post.id).toBe(1);
    expect(post.userId).toBe(1);
    expect(typeof post.title).toBe('string');
    expect(typeof post.body).toBe('string');
  });

  test('@api POST /posts - should create a new post', async ({ request }) => {
    const newPost = {
      title: 'Test Post',
      body: 'This is a test post body',
      userId: 1,
    };

    const response = await request.post(`${API_BASE}/posts`, {
      data: newPost,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(201);
    
    const created = await response.json();
    expect(created.title).toBe(newPost.title);
    expect(created.body).toBe(newPost.body);
    expect(created.id).toBeDefined();
  });

  test('@api PUT /posts/:id - should update a post', async ({ request }) => {
    const updatedData = {
      id: 1,
      title: 'Updated Title',
      body: 'Updated body content',
      userId: 1,
    };

    const response = await request.put(`${API_BASE}/posts/1`, {
      data: updatedData,
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    
    const updated = await response.json();
    expect(updated.title).toBe(updatedData.title);
  });

  test('@api DELETE /posts/:id - should delete a post', async ({ request }) => {
    const response = await request.delete(`${API_BASE}/posts/1`);
    expect(response.status()).toBe(200);
  });

  test('@api GET /posts?userId=1 - should filter by userId', async ({ request }) => {
    const response = await request.get(`${API_BASE}/posts`, {
      params: { userId: '1' },
    });

    expect(response.status()).toBe(200);
    
    const posts = await response.json();
    posts.forEach((post: any) => {
      expect(post.userId).toBe(1);
    });
  });
});
