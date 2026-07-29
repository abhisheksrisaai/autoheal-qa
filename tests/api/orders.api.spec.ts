import { test, expect } from '@playwright/test';

/**
 * API Tests: Orders/Products endpoints.
 */

test.describe('Orders API', () => {
  const API_BASE = process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';

  test('@api GET /comments - should return comments', async ({ request }) => {
    const response = await request.get(`${API_BASE}/comments`);
    
    expect(response.status()).toBe(200);
    
    const comments = await response.json();
    expect(Array.isArray(comments)).toBeTruthy();
    expect(comments.length).toBeGreaterThan(0);
    
    comments.forEach((comment: any) => {
      expect(comment).toHaveProperty('email');
      expect(comment).toHaveProperty('name');
      expect(comment).toHaveProperty('body');
      expect(comment.email).toContain('@');
    });
  });

  test('@api GET /comments?postId=1 - should filter by postId', async ({ request }) => {
    const response = await request.get(`${API_BASE}/comments`, {
      params: { postId: '1' },
    });

    expect(response.status()).toBe(200);
    
    const comments = await response.json();
    comments.forEach((comment: any) => {
      expect(comment.postId).toBe(1);
    });
  });

  test('@api GET /albums - should return albums list', async ({ request }) => {
    const response = await request.get(`${API_BASE}/albums`);

    expect(response.status()).toBe(200);
    
    const albums = await response.json();
    expect(Array.isArray(albums)).toBeTruthy();
    expect(albums.length).toBeGreaterThan(0);
    
    const album = albums[0];
    expect(album).toHaveProperty('userId');
    expect(album).toHaveProperty('id');
    expect(album).toHaveProperty('title');
  });

  test('@api GET /users - should return users', async ({ request }) => {
    const response = await request.get(`${API_BASE}/users`);

    expect(response.status()).toBe(200);
    
    const users = await response.json();
    expect(Array.isArray(users)).toBeTruthy();
    
    const user = users[0];
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('address');
    expect(user.address).toHaveProperty('city');
    expect(user.address).toHaveProperty('zipcode');
  });

  test('@api POST /comments - should handle missing fields gracefully', async ({ request }) => {
    const response = await request.post(`${API_BASE}/comments`, {
      data: { body: 'test' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Typicode returns 201 even with partial data
    expect(response.status()).toBe(201);
  });
});
