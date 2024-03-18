// @ts-check
const { test, expect } = require('@playwright/test');

test('has title', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/FusionAuth Express Web/);
});

test('FA has title', async ({ page }) => {
  await page.goto('http://localhost:9011/admin');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Login | FusionAuth/);
});

test('FA has title with redirect', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  const login = page.getByRole('link', { name: 'Login' });
  await login.click();

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Login | FusionAuth/);
});

test('log in', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Create a locator.
  const login = page.getByRole('link', { name: 'Login' });
  await login.click();
  await expect(page).toHaveTitle(/Login | FusionAuth/);
  // await page.screenshot({ path: 'screenshot.png' });

  await expect(page.locator('#loginId')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  const loginId = await page.locator('#loginId');
  await loginId.fill("richard@example.com");
  const pw = await page.locator('#password');
  await pw.fill("password");

  //only button
  const button = await page.locator('.button.blue');
  await button.click();
  await expect(page).toHaveTitle(/FusionAuth Express Web/);

  // Expect to see the user's email on the page
  await expect(page.getByText('richard@example.com')).toBeVisible();

});

test('log in failure', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Create a locator.
  const login = page.getByRole('link', { name: 'Login' });
  await login.click();
  await page.locator('input[name="loginId"]').fill("richard@example.com");
  await page.locator('input[name="password"]').fill("notTHEpassword");

  //only button
  await page.getByRole('button').click();

  // Expect to see the user's email on the page
  await expect(page.getByText('Invalid login credentials.')).toBeVisible();

});

