// @ts-check
const { test, expect } = require('@playwright/test');

test('has title', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/FusionAuth Express Web/);
});

test('log in', async ({ page }) => {
  await page.goto('http://localhost:8080/');

  // Create a locator.
  const login = page.getByRole('link', { name: 'Login' });
  await login.click();
  await page.locator('input[name="loginId"]').fill("richard@example.com");
  await page.locator('input[name="password"]').fill("password");

  //only button
  await page.getByRole('button').click();

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

