import { test } from '@playwright/test';
import { expect, hydrated } from './helpers';

test.describe('Public site', () => {
    test('home is server-rendered with SEO tags and hydrates without errors @mobile', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

        const response = await page.goto('/');
        const html = await response.text();
        expect(html).toContain('data-server-rendered="true"');
        await expect(page).toHaveTitle(/Hyderabad/);
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /gleangrid-og\.jpg/);
        await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        await hydrated(page);
        expect(errors.filter((e) => !/recaptcha|favicon/i.test(e))).toEqual([]);
    });

    test('URLs are case-insensitive and aliases redirect', async ({ page }) => {
        await page.goto('/Contact');
        await expect(page).toHaveURL(/\/contact$/);
        await page.goto('/TOS');
        await expect(page).toHaveURL(/\/terms$/);
        const res = await page.goto('/definitely-not-here');
        expect(res.status()).toBe(404);
    });

    test('sort menus show their current value on Farmers and Produce', async ({ page }) => {
        await page.goto('/farmers');
        await expect(page.getByRole('button', { name: /^Sort: Top rated$/ })).toBeVisible();
        await page.goto('/products');
        await expect(page.getByRole('button', { name: /^Sort: Featured$/ })).toBeVisible();
    });

    test('navigation between pages is client-side (no full reload)', async ({ page }) => {
        await page.goto('/');
        await hydrated(page);
        await page.evaluate(() => (window.__marker = 'still-here'));
        await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Farmers' }).click();
        await expect(page).toHaveURL(/\/farmers$/);
        expect(await page.evaluate(() => window.__marker)).toBe('still-here');
    });

    test('theme toggle switches between light and dark only', async ({ page }) => {
        await page.goto('/');
        await hydrated(page);
        const html = page.locator('html');
        const toggle = page.getByRole('button', { name: /Switch to (dark|light)/i }).first();
        const before = await html.getAttribute('class');
        await toggle.click();
        await expect.poll(async () => (await html.getAttribute('class'))?.includes('dark')).not.toBe(before?.includes('dark'));
        await toggle.click();
        await expect.poll(async () => (await html.getAttribute('class'))?.includes('dark')).toBe(before?.includes('dark'));
    });

    test('keyboard users can skip to content', async ({ page }) => {
        await page.goto('/about');
        await page.keyboard.press('Tab');
        const skip = page.getByRole('link', { name: 'Skip to content' });
        await expect(skip).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/#main$/);
    });

    test('policy pages, sitemap, robots and llms.txt are served', async ({ page, request }) => {
        for (const path of ['/faq', '/terms', '/privacy', '/returns', '/pickup-policy']) {
            await page.goto(path);
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        }
        expect((await request.get('/sitemap.xml')).status()).toBe(200);
        expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
        expect(await (await request.get('/llms.txt')).text()).toContain('# GleanGrid');
    });
});
