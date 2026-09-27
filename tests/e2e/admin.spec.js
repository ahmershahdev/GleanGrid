import { test } from '@playwright/test';
import { expect, signInAs } from './helpers';

test.describe('Administrator', () => {
    test.beforeEach(async ({ page }) => signInAs(page, 'Administrator'));

    test('dashboard, audit log and settings are reachable from the sidebar', async ({ page }) => {
        await expect(page).toHaveURL(/\/admin$/);
        await page.getByRole('link', { name: 'Audit log' }).first().click();
        await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
        await page.getByRole('link', { name: 'Settings' }).first().click();
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
        await expect(page.getByRole('switch', { name: 'New customers can register' })).toBeVisible();
    });

    test('order detail shows the trigger-recorded history', async ({ page }) => {
        await page.goto('/admin/orders');
        await page.locator('a[href*="/admin/orders/GG-"]').first().click();
        await expect(page.getByText('Recorded automatically by a database trigger.')).toBeVisible();
    });

    test('guests are sent to sign-in from the admin area', async ({ browser }) => {
        const guest = await browser.newPage({ baseURL: test.info().project.use.baseURL });
        const res = await guest.goto('/admin');
        await expect(guest).toHaveURL(/\/login/);
        expect(res.ok()).toBeTruthy();
        await guest.close();
    });
});
