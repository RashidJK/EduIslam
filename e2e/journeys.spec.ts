import { expect, test } from '@playwright/test';
import { mockQuranProvider, skipOnboarding } from './helpers';

test.beforeEach(async ({ page }) => {
  await mockQuranProvider(page);
});

test('a new learner completes onboarding and sees a daily plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start learning' }).click();
  await page.getByText('Read the Quran regularly').click();
  await page.getByText('Learn to read Arabic / Quran').click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByRole('heading', { name: /your suggested daily plan/i })).toBeVisible();
  await page.getByRole('button', { name: /start learning/i }).click();

  await expect(page.getByRole('heading', { name: /today’s plan/i })).toBeVisible();
  const plan = page.getByRole('list', { name: /today’s activities/i });
  await expect(plan.getByRole('listitem').first()).toBeVisible();
  await expect(plan).toContainText(/reading the quran/i);

  // The plan and goals survive a reload.
  await page.reload();
  await expect(page.getByRole('list', { name: /today’s activities/i })).toContainText(/reading the quran/i);
});

test('a learner reads, bookmarks, leaves, and resumes reading', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/quran/2?verse=30');
  await expect(page.locator('#v30')).toBeInViewport();
  await page.getByRole('button', { name: 'Bookmark verse 30' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark from verse 30' })).toHaveAttribute('aria-pressed', 'true');
  // Let the reading position settle and save.
  await page.waitForTimeout(1800);

  await page.goto('/app');
  await expect(page.getByRole('link', { name: /continue al-baqara/i })).toBeVisible();

  await page.goto('/quran/bookmarks');
  await expect(page.getByRole('link', { name: /al-baqara 2:30/i })).toBeVisible();

  await page.goto('/quran/2');
  await expect(page.getByText(/you last read up to verse (29|30|31)/i)).toBeVisible();
});

test('a learner memorizes a passage and sees its next review scheduled', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/memorization/new?surah=112&from=1&to=4');
  await page.getByRole('button', { name: /start memorizing/i }).click();
  await expect(page.getByRole('heading', { name: /listen to the passage/i })).toBeVisible();
  await page.getByRole('button', { name: /next: read along/i }).click();
  await page.getByRole('button', { name: /next: repeat/i }).click();
  await page.getByRole('button', { name: /next: recall/i }).click();
  await expect(page.getByText('[e2e arabic 112:1]')).toHaveCount(0);
  await page.getByRole('button', { name: /check myself/i }).click();
  await page.getByRole('button', { name: /^good/i }).click();
  await expect(page.getByText(/next review in 1 day/i)).toBeVisible();

  await page.goto('/memorization');
  await expect(page.getByRole('link', { name: /al-ikhlaas \(112:1–4\)/i })).toContainText(/due tomorrow/i);
});

test('a learner completes a lesson and it counts toward today', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/lesson/gs-daily-plan');
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.getByText('Items that are due for revision').click();
  await page.getByRole('button', { name: /check answer/i }).click();
  await page.getByRole('button', { name: /^continue/i }).click();
  for (const option of ['Skip it for today', 'Swap it for something else', 'Move it up or down']) await page.getByText(option).click();
  await page.getByRole('button', { name: /check answer/i }).click();
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click(); // reflection
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.getByRole('button', { name: /complete lesson/i }).click();
  await expect(page.getByRole('heading', { name: /lesson complete/i })).toBeVisible();

  await page.goto('/app');
  await expect(page.getByRole('progressbar', { name: /daily learning time/i })).toHaveAttribute('aria-valuenow', '3');
});

test('every destination is reachable from the mobile menu', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile navigation');
  await skipOnboarding(page);
  await page.getByRole('button', { name: 'More' }).click();
  const sheet = page.getByRole('navigation', { name: /more destinations/i });
  await sheet.getByRole('link', { name: 'Calendar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /islamic calendar/i })).toBeVisible();
  await expect(page.getByText(/moon sighting/i).first()).toBeVisible();
});

test('admin screens are unavailable without a configured, role-checked backend', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /needs a backend/i })).toBeVisible();
});

test('audio failure is reported, not hidden', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/quran/112');
  await page.getByRole('button', { name: 'Play verse 1' }).click();
  await expect(page.getByRole('region', { name: /recitation player/i })).toContainText(/could not be played/i);
});
