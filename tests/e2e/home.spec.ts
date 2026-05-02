import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Home', () => {
  test('renders the join prompt and is accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Team Collab/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Join the workspace/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('can join with a name and add a task', async ({ page }) => {
    await page.goto('/');

    const nameInput = page.getByLabel('Display name');
    await nameInput.fill('TestUser');
    await page.getByRole('button', { name: 'Join' }).click();

    await expect(page.getByLabel('New task')).toBeVisible();

    const taskInput = page.getByLabel('New task');
    await taskInput.fill('My first task');
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(page.getByText('My first task')).toBeVisible();
  });

  test('skip-to-content link is keyboard reachable', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
  });
});

test('health endpoint returns JSON', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});
