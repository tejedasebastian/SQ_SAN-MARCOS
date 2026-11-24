import { test, expect, type Page } from "@playwright/test";

const pad = (value: number) => String(value).padStart(2, "0");

function localDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function fillValidReservation(page: Page) {
  await page.getByLabel("Nombre").fill("Sebastián Tejeda");
  await page.getByLabel("Paradero").selectOption("biblioteca");
  await page.getByLabel("Fecha").fill(localDate(1));
  await page.getByLabel("Hora").selectOption("10:00");
}

test("reserva de 2 horas: errores, cálculo y confirmación", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Llega a tu clase");

  await page.getByRole("link", { name: "Reservar mi scooter" }).click();
  await expect(page.getByRole("heading", { name: "Tu próximo viaje empieza aquí." })).toBeVisible();

  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.locator("#name-error")).toHaveText("Escribe tu nombre para la reserva.");
  await expect(page.locator("#station-error")).toHaveText("Elige un paradero.");
  await expect(page.locator("#date-error")).toHaveText("Elige una fecha.");
  await expect(page.locator("#time-error")).toHaveText("Elige una hora.");

  await fillValidReservation(page);
  await page.locator(".duration").filter({ hasText: "2 h" }).click();
  await expect(page.getByRole("radio", { name: /2 h/ })).toBeChecked();
  await expect(page.locator("#total")).toHaveText("S/ 2.50");

  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.locator("#confirmation")).toBeVisible();
  await expect(page.locator("#confirmation-code")).toHaveText(/^SQ-\d{4}$/);

  const summary = page.locator("#confirmation-summary");
  await expect(summary).toContainText("Sebastián Tejeda");
  await expect(summary).toContainText("Biblioteca Central");
  await expect(summary).toContainText("2 horas");
  await expect(summary).toContainText("S/ 2.50");

  await page.getByRole("button", { name: "Hacer otra reserva" }).click();
  await expect(page.getByLabel("Nombre")).toHaveValue("");
  await expect(page.locator("#total")).toHaveText("S/ 1.00");
});

test("rechaza una fecha pasada y permite corregirla", async ({ page }) => {
  await page.goto("./#reserva");
  await page.getByLabel("Nombre").fill("Ana Quispe");
  await page.getByLabel("Paradero").selectOption("fisi");
  await page.getByLabel("Hora").selectOption("08:00");
  await page.getByLabel("Fecha").fill(localDate(-1));

  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.locator("#date-error")).toHaveText("La fecha no puede ser anterior a hoy.");
  await expect(page.locator("#confirmation")).toBeHidden();

  await page.getByLabel("Fecha").fill(localDate(2));
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.locator("#confirmation")).toBeVisible();
  await expect(page.locator("#confirmation-summary")).toContainText("FISI — Ingeniería de Sistemas");
});

test("móvil: menú, navegación, sin overflow y assets cargados", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.locator("#site-nav")).toBeVisible();
  await page.locator("#site-nav").getByRole("link", { name: "Reservar", exact: true }).click();
  await expect(page.locator("#reserva")).toBeInViewport();

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, `overflow horizontal a ${width}px`).toBeLessThanOrEqual(1);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0)
  );

  expect(consoleErrors).toEqual([]);
});

test("accesibilidad básica y enlaces internos", async ({ page }) => {
  await page.goto("./");

  await expect(page.locator("h1")).toHaveCount(1);

  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();

  const missingTargets = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      .map((anchor) => anchor.getAttribute("href") ?? "")
      .filter((href) => href.length > 1 && !document.querySelector(href))
  );
  expect(missingTargets).toEqual([]);

  const imagesWithoutAlt = await page.evaluate(() =>
    Array.from(document.images)
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => image.src)
  );
  expect(imagesWithoutAlt).toEqual([]);

  const controlsWithoutLabel = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"))
      .filter((control) => !control.labels?.length && !control.getAttribute("aria-label"))
      .map((control) => control.outerHTML.slice(0, 90))
  );
  expect(controlsWithoutLabel).toEqual([]);

  const firstFaq = page.locator(".faq-list details").first();
  await firstFaq.locator("summary").click();
  await expect(firstFaq).toHaveAttribute("open", "");
});
