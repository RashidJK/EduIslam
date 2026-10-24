import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockQuranProvider, skipOnboarding } from './helpers';

const PAGES = ['/app', '/learn', '/lesson/letters-1', '/quran', '/quran/1', '/memorization', '/duas', '/salah', '/stories', '/calendar', '/progress', '/settings', '/search?q=kahf'];

test('the landing page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});

for (const path of PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await mockQuranProvider(page);
    await skipOnboarding(page);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => ({ id: v.id, help: v.help, nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 3) }))).toEqual([]);
  });
}

test('dark mode keeps sufficient contrast on the dashboard', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await mockQuranProvider(page);
  await skipOnboarding(page);
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(results.violations.map((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([]);
});
