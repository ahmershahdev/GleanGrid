import { expect } from '@playwright/test';

export async function signInAs(page, role) {
    await page.goto('/login');
    await page.getByRole('button', { name: new RegExp(`demo ${role}`, 'i') }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

export async function signOut(page) {
    await page.context().clearCookies();
}

export async function hydrated(page) {
    await page.waitForFunction(() => document.documentElement.dataset.hydrated === '1');
}

export async function emptyBasket(page) {
    await page.evaluate(() => localStorage.setItem('gg-cart', '[]'));
}

export { expect };
