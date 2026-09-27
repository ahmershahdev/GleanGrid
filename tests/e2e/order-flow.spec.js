import { test } from '@playwright/test';
import { emptyBasket, expect, hydrated, signInAs, signOut } from './helpers';

test('customer pre-order, farmer accepts via scan lookup, customer cancels', async ({ page }) => {
    await signInAs(page, 'Customer');
    await hydrated(page);
    await emptyBasket(page);

    await page.goto('/farmers/green-acres-organic-farm');
    await hydrated(page);
    await page.getByRole('button', { name: /^Add$/ }).first().click();
    await expect(page.getByText('Added to your basket')).toBeVisible();

    await page.goto('/cart');
    await hydrated(page);
    await page.getByRole('link', { name: /Choose pickup windows/ }).click();
    await expect(page).toHaveURL(/\/account\/checkout/);
    await hydrated(page);
    await page.getByRole('button', { name: /Place \d+ pre-order/ }).click();
    await expect(page).toHaveURL(/\/account\/orders$/);

    await page.locator('a[href*="/account/orders/GG-"]').first().click();
    await expect(page.getByText('Your pickup pass')).toBeVisible();
    const code = (await page.getByRole('heading', { level: 1 }).textContent()).trim();
    expect(code).toMatch(/^GG-[A-Z0-9]{6}$/);

    await signOut(page);
    await signInAs(page, 'Farmer');
    await page.goto('/farmer/scan');
    await hydrated(page);
    await page.getByLabel('Order code').fill(code);
    await page.getByRole('button', { name: 'Open order' }).click();
    await expect(page).toHaveURL(new RegExp(`/farmer/orders/${code}$`));
    await expect(page.getByRole('heading', { name: code })).toBeVisible();

    await signOut(page);
    await signInAs(page, 'Customer');
    await page.goto(`/account/orders/${code}`);
    await hydrated(page);
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await page.getByRole('button', { name: 'Yes, cancel it' }).click();
    await expect(page.getByText('Cancelled').first()).toBeVisible();
});

test('favourite toggles instantly and survives a reload', async ({ page }) => {
    await signInAs(page, 'Customer');
    await page.goto('/products');
    await hydrated(page);
    const heart = page.locator('main article').first().getByRole('button', { name: /favourites/ });
    const before = await heart.getAttribute('aria-pressed');
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true', { timeout: 300 });
    await page.reload();
    await expect(page.locator('main article').first().getByRole('button', { name: /favourites/ })).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
    await page.locator('main article').first().getByRole('button', { name: /favourites/ }).click();
});
