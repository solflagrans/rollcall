import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("demo12345");
  await page.getByRole("button", { name: "Войти" }).click();
}

test("headman creates a lesson and changes statuses", async ({ page }) => {
  await login(page, "headman@rollcall.test");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/lessons/new");
  await page.getByLabel(/Алексей Воронцов: Отсутствовал/).click();
  await page.getByLabel(/Анна Волкова: Опоздал/).click();
  await page.getByRole("button", { name: "Сохранить занятие" }).click();
  await expect(page.getByText("Занятие сохранено")).toBeVisible();
  await expect(page).toHaveURL(/journal/);
});

test("student sees only own statistics and cannot access admin", async ({ page }) => {
  await login(page, "student1@rollcall.test");
  await expect(page).toHaveURL(/student/);
  await expect(page.getByText("Здесь видны только ваши отметки посещаемости")).toBeVisible();
  await page.goto("/students");
  await expect(page).toHaveURL(/access-denied/);
});

test("deputy has the same dashboard and create access", async ({ page }) => {
  await login(page, "deputy@rollcall.test");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/lessons/new");
  await expect(page.getByRole("heading", { name: "Новое занятие" })).toBeVisible();
});

test("expired session redirects protected pages without crashing", async ({ page }) => {
  await page.goto("/journal");
  await expect(page).toHaveURL(/login/);
  await page.goto("/students");
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole("heading", { name: "С возвращением" })).toBeVisible();
});

test("admin can repeatedly switch between journal and students", async ({ page }) => {
  await login(page, "headman@rollcall.test");
  await expect(page).toHaveURL(/dashboard/);
  for (let index = 0; index < 10; index += 1) {
    await page.goto("/students");
    await expect(page.getByRole("heading", { name: "Студенты", exact: true })).toBeVisible();
    await page.goto("/journal");
    await expect(page.getByRole("heading", { name: "Журнал", exact: true })).toBeVisible();
  }
});
