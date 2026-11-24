(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile menu ---------- */

  const menuToggle = $("#menu-toggle");
  const siteNav = $("#site-nav");
  const menuLabel = menuToggle?.querySelector(".sr-only");

  function setMenu(open) {
    if (!menuToggle || !siteNav) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    siteNav.dataset.open = String(open);
    if (menuLabel) menuLabel.textContent = open ? "Cerrar menú" : "Abrir menú";
  }

  menuToggle?.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  siteNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menuToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) setMenu(false);
  });

  /* ---------- Header on scroll ---------- */

  const header = $(".site-header");

  function updateHeader() {
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Reveal on scroll ---------- */

  const revealItems = $$(".reveal");

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  /* ---------- Reservation ---------- */

  const PRICES = { 30: 1, 60: 1.5, 120: 2.5 };
  const DURATION_LABELS = { 30: "30 minutos", 60: "1 hora", 120: "2 horas" };
  const STATION_LABELS = {
    "puerta-1": "Puerta 1 — Ciudad Universitaria",
    biblioteca: "Biblioteca Central",
    fisi: "FISI — Ingeniería de Sistemas",
    comedor: "Comedor Universitario",
    estadio: "Estadio UNMSM",
  };

  const form = $("#reservation-form");
  const confirmation = $("#confirmation");
  const confirmationCode = $("#confirmation-code");
  const confirmationSummary = $("#confirmation-summary");
  const total = $("#total");
  const newReservation = $("#new-reservation");
  const nameInput = $("#name");
  const stationInput = $("#station");
  const dateInput = $("#date");
  const timeInput = $("#time");

  const fields = {
    name: { input: nameInput, error: $("#name-error") },
    station: { input: stationInput, error: $("#station-error") },
    date: { input: dateInput, error: $("#date-error") },
    time: { input: timeInput, error: $("#time-error") },
  };

  const pad = (value) => String(value).padStart(2, "0");

  function todayISO() {
    const today = new Date();
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }

  if (dateInput) dateInput.min = todayISO();

  function selectedDuration() {
    const value = new FormData(form).get("duration");
    return Number(value) || 30;
  }

  function updateTotal() {
    if (!total) return;
    const price = PRICES[selectedDuration()] ?? PRICES[30];
    total.textContent = `S/ ${price.toFixed(2)}`;
  }

  $$('input[name="duration"]').forEach((input) => {
    input.addEventListener("change", updateTotal);
  });
  updateTotal();

  function setError(key, message) {
    const field = fields[key];
    if (!field) return;
    field.input.setAttribute("aria-invalid", message ? "true" : "false");
    field.error.textContent = message;
  }

  function clearErrors() {
    Object.keys(fields).forEach((key) => setError(key, ""));
  }

  function validate() {
    const errors = {};

    if (nameInput.value.trim().length < 2) {
      errors.name = "Escribe tu nombre para la reserva.";
    }
    if (!stationInput.value) {
      errors.station = "Elige un paradero.";
    }
    if (!dateInput.value) {
      errors.date = "Elige una fecha.";
    } else if (dateInput.value < todayISO()) {
      errors.date = "La fecha no puede ser anterior a hoy.";
    }
    if (!timeInput.value) {
      errors.time = "Elige una hora.";
    }

    return errors;
  }

  Object.entries(fields).forEach(([key, field]) => {
    field.input.addEventListener("input", () => setError(key, ""));
    field.input.addEventListener("change", () => setError(key, ""));
  });

  function formatDate(isoDate) {
    const date = new Date(`${isoDate}T12:00:00`);
    return new Intl.DateTimeFormat("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
  }

  function fillSummary(rows) {
    confirmationSummary.replaceChildren();

    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      confirmationSummary.append(row);
    });
  }

  function showConfirmation() {
    const duration = selectedDuration();
    const price = PRICES[duration] ?? PRICES[30];

    confirmationCode.textContent = `SQ-${Math.floor(1000 + Math.random() * 9000)}`;
    fillSummary([
      ["Nombre", nameInput.value.trim()],
      ["Paradero", STATION_LABELS[stationInput.value]],
      ["Fecha", formatDate(dateInput.value)],
      ["Hora", timeInput.value],
      ["Duración", DURATION_LABELS[duration]],
      ["Total", `S/ ${price.toFixed(2)}`],
    ]);

    form.hidden = true;
    confirmation.hidden = false;
    confirmation.setAttribute("tabindex", "-1");
    confirmation.focus({ preventScroll: true });
    confirmation.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const errors = validate();
    const keys = Object.keys(errors);
    clearErrors();

    if (keys.length > 0) {
      keys.forEach((key) => setError(key, errors[key]));
      fields[keys[0]].input.focus();
      return;
    }

    showConfirmation();
  });

  newReservation?.addEventListener("click", () => {
    form.reset();
    clearErrors();
    updateTotal();
    confirmation.hidden = true;
    form.hidden = false;
    nameInput.focus();
  });

  /* ---------- Footer year ---------- */

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
