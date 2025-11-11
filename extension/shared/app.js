(function () {
  const memoryStore = new Map();

  const hasLocalStorage = (() => {
    try {
      const testKey = "__waa_probe__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  })();

  const storageEngine = {
    getItem(key) {
      if (hasLocalStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStore.get(key) ?? null;
    },
    setItem(key, value) {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
      } else {
        memoryStore.set(key, value);
      }
    },
    removeItem(key) {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
      } else {
        memoryStore.delete(key);
      }
    },
  };

  const StorageKeys = Object.freeze({
    QUICK_LINKS: "waa_quick_links",
    NOTES: "waa_notes",
    DATE_NOTES: "waa_date_notes",
  });

  function load(key, fallback) {
    try {
      const raw = storageEngine.getItem(key);
      if (!raw) {
        return clone(fallback);
      }
      return JSON.parse(raw);
    } catch {
      return clone(fallback);
    }
  }

  function save(key, value) {
    storageEngine.setItem(key, JSON.stringify(value));
    document.dispatchEvent(
      new CustomEvent("waa:storage", { detail: { key, value } }),
    );
  }

  function clone(value) {
    return value === undefined ? value : JSON.parse(JSON.stringify(value));
  }

  const GREGORIAN_DAYS_IN_MONTH = [
    31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  const jalaliMonthNames = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  const gregorianMonthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const jalaliWeekdays = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
  const gregorianWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function toJalali(date) {
    const gYear = date.getFullYear();
    const gMonth = date.getMonth() + 1;
    const gDay = date.getDate();

    let gy = gYear - 1600;
    let gm = gMonth - 1;
    let gd = gDay - 1;

    let gDayNo =
      365 * gy +
      Math.floor((gy + 3) / 4) -
      Math.floor((gy + 99) / 100) +
      Math.floor((gy + 399) / 400);

    for (let i = 0; i < gm; ++i) {
      gDayNo += GREGORIAN_DAYS_IN_MONTH[i];
    }
    if (gm > 1 && isGregorianLeap(gYear)) {
      gDayNo += 1;
    }
    gDayNo += gd;

    let jDayNo = gDayNo - 79;
    const jNp = Math.floor(jDayNo / 12053);
    jDayNo %= 12053;

    let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
    jDayNo %= 1461;

    if (jDayNo >= 366) {
      jy += Math.floor((jDayNo - 1) / 365);
      jDayNo = (jDayNo - 1) % 365;
    }

    let jm = 0;
    for (; jm < 11 && jDayNo >= jalaliDaysInMonthLookup(jy, jm + 1); ++jm) {
      jDayNo -= jalaliDaysInMonthLookup(jy, jm + 1);
    }
    const jd = jDayNo + 1;

    return { year: jy, month: jm + 1, day: jd };
  }

  function fromJalali(jy, jm, jd) {
    jy -= 979;
    jm -= 1;
    jd -= 1;

    let jDayNo =
      365 * jy +
      Math.floor(jy / 33) * 8 +
      Math.floor(((jy % 33) + 3) / 4);

    for (let i = 0; i < jm; ++i) {
      jDayNo += jalaliDaysInMonthLookup(jy + 979, i + 1);
    }
    jDayNo += jd;

    let gDayNo = jDayNo + 79;

    let gy = 1600 + 400 * Math.floor(gDayNo / 146097);
    gDayNo %= 146097;

    let leap = true;
    if (gDayNo >= 36525) {
      gDayNo -= 1;
      gy += 100 * Math.floor(gDayNo / 36524);
      gDayNo %= 36524;
      if (gDayNo >= 365) {
        gDayNo += 1;
      } else {
        leap = false;
      }
    }

    gy += 4 * Math.floor(gDayNo / 1461);
    gDayNo %= 1461;

    if (gDayNo >= 366) {
      leap = false;
      gDayNo -= 1;
      gy += Math.floor(gDayNo / 365);
      gDayNo %= 365;
    }

    let gm = 0;
    for (; gm < 11; gm++) {
      const daysInMonth = gm === 1 && leap ? 29 : GREGORIAN_DAYS_IN_MONTH[gm];
      if (gDayNo < daysInMonth) break;
      gDayNo -= daysInMonth;
    }

    const gd = gDayNo + 1;
    return new Date(Date.UTC(gy, gm, gd));
  }

  function isGregorianLeap(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function jalaliDaysInMonthLookup(year, month) {
    if (month < 1 || month > 12) throw new RangeError("ماه جلالی نامعتبر است");
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isJalaliLeap(year) ? 30 : 29;
  }

  function jalaliDaysInMonth(year, month) {
    const start = fromJalali(year, month, 1);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextStart = fromJalali(nextYear, nextMonth, 1);
    return Math.round((nextStart - start) / MS_PER_DAY);
  }

  function isJalaliLeap(year) {
    return jalaliDaysInMonth(year, 12) === 30;
  }

  function formatJalali(date) {
    const { year, month, day } = toJalali(date);
    return `${day} ${jalaliMonthNames[month - 1]} ${year}`;
  }

  const CalendarModes = Object.freeze({
    GREGORIAN: "gregorian",
    JALALI: "jalali",
  });

  const WEEKDAY_CLASSES = [
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
  ];

  class CalendarController {
    constructor(root, options = {}) {
      this.root = root;
      this.mode = CalendarModes.GREGORIAN;
      this.focusDate = startOfMonth(new Date());
      this.jalaliFocus = toJalali(this.focusDate);
      this.selectedDate = null;

      this.onSelect = options.onSelect ?? (() => {});
      this.hasNotes = options.hasNotes ?? (() => false);

      this.monthLabelEl = root.querySelector("#calendar-month");
      this.yearLabelEl = root.querySelector("#calendar-year");
      this.gridEl = root.querySelector("#calendar-grid");

      this.bindControls();
      this.render();
    }

    bindControls() {
      this.root
        .querySelector("[data-action='prev-month']")
        .addEventListener("click", () => this.shiftMonth(-1));
      this.root
        .querySelector("[data-action='next-month']")
        .addEventListener("click", () => this.shiftMonth(1));
      this.root
        .querySelector("#calendar-today-btn")
        .addEventListener("click", () => this.goToToday());

      this.gridEl.addEventListener("click", (event) => {
        const cell = event.target.closest("button[data-date]");
        if (!cell) return;
        const iso = cell.dataset.date;
        const date = new Date(iso);
        this.selectedDate = date;
        this.onSelect(date);
        this.render();
      });
    }

    setMode(mode) {
      if (!Object.values(CalendarModes).includes(mode) || this.mode === mode) {
        return;
      }

      if (mode === CalendarModes.JALALI) {
        const base = this.selectedDate ?? new Date();
        this.jalaliFocus = toJalali(base);
      } else {
        this.focusDate = startOfMonth(this.selectedDate ?? new Date());
      }

      this.mode = mode;
      this.render();
    }

    goToToday() {
      if (this.mode === CalendarModes.GREGORIAN) {
        this.focusDate = startOfMonth(new Date());
      } else {
        this.jalaliFocus = toJalali(new Date());
      }
      this.render();
    }

    shiftMonth(delta) {
      if (this.mode === CalendarModes.GREGORIAN) {
        const month = this.focusDate.getMonth() + delta;
        this.focusDate = startOfMonth(
          new Date(this.focusDate.getFullYear(), month, 1),
        );
      } else {
        const total = this.jalaliFocus.month + delta - 1;
        const yearDelta = Math.floor(total / 12);
        let month = (total % 12) + 1;
        if (month <= 0) {
          month += 12;
        }
        this.jalaliFocus = {
          year: this.jalaliFocus.year + yearDelta,
          month,
        };
      }
      this.render();
    }

    setSelectedDate(date) {
      this.selectedDate = date;
      if (this.mode === CalendarModes.GREGORIAN) {
        this.focusDate = startOfMonth(date);
      } else {
        this.jalaliFocus = toJalali(date);
      }
      this.render();
    }

    render() {
      if (this.mode === CalendarModes.GREGORIAN) {
        const monthIdx = this.focusDate.getMonth();
        this.monthLabelEl.textContent = gregorianMonthNames[monthIdx];
        this.yearLabelEl.textContent = this.focusDate.getFullYear();
        this.renderGrid(this.buildGregorianMatrix());
      } else {
        this.monthLabelEl.textContent =
          jalaliMonthNames[this.jalaliFocus.month - 1];
        this.yearLabelEl.textContent = this.jalaliFocus.year;
        this.renderGrid(this.buildJalaliMatrix());
      }
    }

    renderGrid({ days, weekdays }) {
      this.gridEl.innerHTML = "";
      const fragment = document.createDocumentFragment();

      weekdays.forEach((label, index) => {
        const span = document.createElement("span");
        span.className = `weekday ${WEEKDAY_CLASSES[index % 7]}`;
        span.textContent = label;
        fragment.appendChild(span);
      });

      days.forEach((day) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "calendar-cell";

        if (!day.inMonth) {
          button.classList.add("muted");
        }

        if (day.isToday) {
          button.classList.add("today");
        }

        if (day.isSelected) {
          button.classList.add("selected");
        }

        if (day.hasNotes) {
          button.classList.add("has-note");
        }

        button.dataset.date = day.iso;
        button.innerHTML = `
        <span class="day-number">${day.label}</span>
        <span class="note-dot"></span>
      `;

        fragment.appendChild(button);
      });

      this.gridEl.appendChild(fragment);
    }

    buildGregorianMatrix() {
      const base = new Date(
        this.focusDate.getFullYear(),
        this.focusDate.getMonth(),
        1,
      );
      const startWeekDay = base.getDay();
      const daysInMonth = new Date(
        this.focusDate.getFullYear(),
        this.focusDate.getMonth() + 1,
        0,
      ).getDate();

      const prevMonthDays = new Date(
        this.focusDate.getFullYear(),
        this.focusDate.getMonth(),
        0,
      ).getDate();

      const cells = [];
      const isoSelected = this.selectedDate ? toISO(this.selectedDate) : null;
      const todayIso = toISO(new Date());

      for (let i = startWeekDay - 1; i >= 0; i -= 1) {
        const dayNum = prevMonthDays - i;
        const date = new Date(
          this.focusDate.getFullYear(),
          this.focusDate.getMonth() - 1,
          dayNum,
        );
        const iso = toISO(date);
        cells.push({
          label: dayNum,
          iso,
          inMonth: false,
          isToday: iso === todayIso,
          isSelected: iso === isoSelected,
          hasNotes: this.hasNotes(iso),
        });
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(
          this.focusDate.getFullYear(),
          this.focusDate.getMonth(),
          day,
        );
        const iso = toISO(date);
        cells.push({
          label: day,
          iso,
          inMonth: true,
          isToday: iso === todayIso,
          isSelected: iso === isoSelected,
          hasNotes: this.hasNotes(iso),
        });
      }

      while (cells.length % 7 !== 0) {
        const day = cells.length - (startWeekDay + daysInMonth) + 1;
        const date = new Date(
          this.focusDate.getFullYear(),
          this.focusDate.getMonth() + 1,
          day,
        );
        const iso = toISO(date);
        cells.push({
          label: date.getDate(),
          iso,
          inMonth: false,
          isToday: iso === todayIso,
          isSelected: iso === isoSelected,
          hasNotes: this.hasNotes(iso),
        });
      }

      return {
        weekdays: gregorianWeekdays,
        days: cells,
      };
    }

    buildJalaliMatrix() {
      const focus = this.jalaliFocus;
      const firstDayGregorian = fromJalali(focus.year, focus.month, 1);
      const startWeekDay = firstDayGregorian.getUTCDay();
      const daysInMonth = jalaliDaysInMonth(focus.year, focus.month);

      const prevMonthInfo = this.getAdjacentJalaliMonth(-1);
      const prevMonthDays = jalaliDaysInMonth(
        prevMonthInfo.year,
        prevMonthInfo.month,
      );

      const isoSelected = this.selectedDate ? toISO(this.selectedDate) : null;
      const todayIso = toISO(new Date());

      const cells = [];

      for (let i = startWeekDay - 1; i >= 0; i -= 1) {
        const dayNum = prevMonthDays - i;
        const gregorianDate = fromJalali(
          prevMonthInfo.year,
          prevMonthInfo.month,
          dayNum,
        );
        const iso = toISO(gregorianDate);
        cells.push({
          label: dayNum,
          iso,
          inMonth: false,
          isToday: iso === todayIso,
          isSelected: iso === isoSelected,
          hasNotes: this.hasNotes(iso),
        });
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const gregorianDate = fromJalali(focus.year, focus.month, day);
        const iso = toISO(gregorianDate);
        cells.push({
          label: day,
          iso,
          inMonth: true,
          isToday: iso === todayIso,
          isSelected: iso === isoSelected,
          hasNotes: this.hasNotes(iso),
        });
      }

      while (cells.length % 7 !== 0) {
        const day = cells.length - (startWeekDay + daysInMonth) + 1;
        const info = this.getAdjacentJalaliMonth(1);
        const gregorianDate = fromJalali(info.year, info.month, day);
        const iso = toISO(gregorianDate);
        cells.push({
          label: day,
          iso,
          inMonth: false,
          isToday: iso === todayIso,
          isSelected: iso === isoSelected,
          hasNotes: this.hasNotes(iso),
        });
      }

      return {
        weekdays: jalaliWeekdays,
        days: cells,
      };
    }

    getAdjacentJalaliMonth(delta) {
      const total = this.jalaliFocus.month - 1 + delta;
      const year = this.jalaliFocus.year + Math.floor(total / 12);
      const monthIndex = ((total % 12) + 12) % 12;
      return {
        year,
        month: monthIndex + 1,
      };
    }
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function toISO(date) {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    )
      .toISOString()
      .slice(0, 10);
  }

  class QuickAccessManager {
    constructor(gridEl, formEl, templateEl) {
      this.gridEl = gridEl;
      this.formEl = formEl;
      this.template = templateEl;
      this.cancelBtn = document.getElementById("quick-link-cancel");
      this.idInput = document.getElementById("quick-link-id");
      this.titleInput = document.getElementById("quick-link-title");
      this.urlInput = document.getElementById("quick-link-url");
      this.iconInput = document.getElementById("quick-link-icon");

      this.links = load(StorageKeys.QUICK_LINKS, defaultLinks());
      if (!this.links.length) {
        this.links = defaultLinks();
        this.persist();
      }

      this.bindEvents();
      this.render();
    }

    bindEvents() {
      this.formEl.addEventListener("submit", (event) => {
        event.preventDefault();
        this.handleSubmit();
      });
      this.cancelBtn.addEventListener("click", () => this.resetForm());
      this.gridEl.addEventListener("click", (event) => {
        const card = event.target.closest(".quick-link-card");
        if (!card) return;
        const id = card.dataset.id;
        if (event.target.matches("button.delete")) {
          this.deleteLink(id);
        } else if (event.target.matches("button.edit")) {
          this.populateForm(id);
        }
      });
    }

    handleSubmit() {
      const title = this.titleInput.value.trim();
      const url = this.urlInput.value.trim();
      let icon = this.iconInput.value.trim();

      if (!title || !url) return;
      if (!isValidUrl(url)) {
        alert("لطفاً یک آدرس معتبر وارد کنید.");
        return;
      }

      if (!icon) {
        icon = title.trim().slice(0, 2).toUpperCase();
      }

      const existingId = this.idInput.value;
      if (existingId) {
        this.links = this.links.map((link) =>
          link.id === existingId ? { ...link, title, url, icon } : link,
        );
      } else {
        this.links.unshift({
          id: typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
          title,
          url,
          icon,
        });
      }
      this.persist();
      this.render();
      this.resetForm();
    }

    populateForm(id) {
      const link = this.links.find((item) => item.id === id);
      if (!link) return;
      this.idInput.value = link.id;
      this.titleInput.value = link.title;
      this.urlInput.value = link.url;
      this.iconInput.value = link.icon;
      this.titleInput.focus();
    }

    resetForm() {
      this.formEl.reset();
      this.idInput.value = "";
    }

    deleteLink(id) {
      const link = this.links.find((item) => item.id === id);
      if (!link) return;
      if (!confirm(`حذف میانبر "${link.title}"؟`)) return;
      this.links = this.links.filter((item) => item.id !== id);
      this.persist();
      this.render();
    }

    persist() {
      save(StorageKeys.QUICK_LINKS, this.links);
    }

    render() {
      this.gridEl.innerHTML = "";
      if (!this.links.length) {
        const hint = document.createElement("p");
        hint.className = "empty-placeholder";
        hint.textContent =
          "هنوز میانبری ساخته نشده است. فرم زیر را تکمیل کنید.";
        this.gridEl.appendChild(hint);
        return;
      }

      const fragment = document.createDocumentFragment();
      this.links.forEach((link) => {
        const node = this.template.content.cloneNode(true);
        const card = node.querySelector(".quick-link-card");
        card.dataset.id = link.id;
        node.querySelector(".icon").textContent = link.icon;
        node.querySelector(".title").textContent = link.title;
        const anchor = node.querySelector(".url");
        anchor.href = link.url;
        anchor.textContent = "باز کردن";
        fragment.appendChild(node);
      });
      this.gridEl.appendChild(fragment);
    }
  }

  function defaultLinks() {
    return [
      {
        id: "mail",
        title: "Gmail",
        url: "https://mail.google.com",
        icon: "✉️",
      },
      {
        id: "calendar",
        title: "Google Calendar",
        url: "https://calendar.google.com",
        icon: "📅",
      },
      {
        id: "github",
        title: "GitHub",
        url: "https://github.com",
        icon: "🐙",
      },
      {
        id: "drive",
        title: "Google Drive",
        url: "https://drive.google.com",
        icon: "☁️",
      },
      {
        id: "translate",
        title: "Google Translate",
        url: "https://translate.google.com",
        icon: "🔤",
      },
      {
        id: "dastyar",
        title: "Dastyar",
        url: "https://dastyar.io",
        icon: "🧠",
      },
    ];
  }

  function isValidUrl(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  class NotesManager {
    constructor(listEl, formEl, templateEl) {
      this.listEl = listEl;
      this.formEl = formEl;
      this.template = templateEl;
      this.cancelBtn = document.getElementById("note-cancel");
      this.idInput = document.getElementById("note-id");
      this.titleInput = document.getElementById("note-title");
      this.contentInput = document.getElementById("note-content");

      this.notes = load(StorageKeys.NOTES, []);
      this.bindEvents();
      this.render();
    }

    bindEvents() {
      this.formEl.addEventListener("submit", (event) => {
        event.preventDefault();
        this.saveNote();
      });
      this.cancelBtn.addEventListener("click", () => this.resetForm());
      this.listEl.addEventListener("click", (event) => {
        const card = event.target.closest(".note-card");
        if (!card) return;
        const id = card.dataset.id;
        if (event.target.matches("button.edit")) {
          this.populateForm(id);
        } else if (event.target.matches("button.delete")) {
          this.deleteNote(id);
        }
      });
    }

    saveNote() {
      const title = this.titleInput.value.trim();
      const content = this.contentInput.value.trim();
      if (!title || !content) return;
      const now = new Date().toISOString();
      const existingId = this.idInput.value;
      if (existingId) {
        this.notes = this.notes.map((note) =>
          note.id === existingId
            ? { ...note, title, content, updatedAt: now }
            : note,
        );
      } else {
        this.notes.unshift({
          id: typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}`,
          title,
          content,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.persist();
      this.resetForm();
      this.render();
    }

    populateForm(id) {
      const note = this.notes.find((item) => item.id === id);
      if (!note) return;
      this.idInput.value = note.id;
      this.titleInput.value = note.title;
      this.contentInput.value = note.content;
      this.titleInput.focus();
    }

    resetForm() {
      this.formEl.reset();
      this.idInput.value = "";
    }

    deleteNote(id) {
      const note = this.notes.find((item) => item.id === id);
      if (!note) return;
      if (!confirm(`یادداشت "${note.title}" حذف شود؟`)) return;
      this.notes = this.notes.filter((item) => item.id !== id);
      this.persist();
      this.render();
    }

    persist() {
      save(StorageKeys.NOTES, this.notes);
    }

    render() {
      this.listEl.innerHTML = "";
      if (!this.notes.length) {
        const placeholder = document.createElement("p");
        placeholder.className = "empty-placeholder";
        placeholder.textContent = "یادداشتی ثبت نشده است.";
        this.listEl.appendChild(placeholder);
        return;
      }
      const fragment = document.createDocumentFragment();
      this.notes.forEach((note) => {
        const node = this.template.content.cloneNode(true);
        const card = node.querySelector(".note-card");
        card.dataset.id = note.id;
        node.querySelector("h3").textContent = note.title;
        node.querySelector(".content").textContent = note.content;
        node.querySelector(".timestamps").textContent = formatNoteTimestamp(
          note,
        );
        fragment.appendChild(node);
      });
      this.listEl.appendChild(fragment);
    }
  }

  class DateNotesManager {
    constructor({
      listEl,
      formEl,
      templateEl,
      selectedLabelEl,
      cancelBtn,
      onChange,
    }) {
      this.listEl = listEl;
      this.formEl = formEl;
      this.template = templateEl;
      this.selectedLabelEl = selectedLabelEl;
      this.cancelBtn = cancelBtn;
      this.onChange = onChange ?? (() => {});

      this.idInput = document.getElementById("date-note-id");
      this.titleInput = document.getElementById("date-note-title");
      this.contentInput = document.getElementById("date-note-content");

      this.notesMap = load(StorageKeys.DATE_NOTES, {});
      this.selectedISO = null;
      this.activeMode = "gregorian";

      this.bindEvents();
      this.renderList();
    }

    bindEvents() {
      this.formEl.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!this.selectedISO) return;
        this.saveNote();
      });
      this.cancelBtn.addEventListener("click", () => this.resetForm());
      this.listEl.addEventListener("click", (event) => {
        const card = event.target.closest(".note-card");
        if (!card) return;
        const id = card.dataset.id;
        if (event.target.matches("button.edit")) {
          this.populateForm(id);
        } else if (event.target.matches("button.delete")) {
          this.deleteNote(id);
        }
      });
    }

    setMode(mode) {
      this.activeMode = mode;
      this.updateSelectedLabel();
    }

    selectDate(date) {
      this.selectedISO = date ? date.toISOString().slice(0, 10) : null;
      this.resetForm();
      this.updateSelectedLabel(date);
      this.renderList();
    }

    updateSelectedLabel(date = null) {
      const referenceDate =
        date ??
        (this.selectedISO ? new Date(`${this.selectedISO}T00:00:00Z`) : null);
      if (!this.selectedISO || !referenceDate) {
        this.selectedLabelEl.textContent = "هنوز تاریخی انتخاب نشده است.";
        this.formEl.dataset.disabled = "true";
        return;
      }
      this.formEl.dataset.disabled = "false";

      const persianFormatter = new Intl.DateTimeFormat("fa-IR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const gregorianLabel = persianFormatter.format(referenceDate);
      const jalaliLabel = formatJalali(referenceDate);

      if (this.activeMode === "jalali") {
        this.selectedLabelEl.textContent = `${jalaliLabel} | ${gregorianLabel}`;
      } else {
        this.selectedLabelEl.textContent = `${gregorianLabel} | ${jalaliLabel}`;
      }
    }

    saveNote() {
      const title = this.titleInput.value.trim();
      const content = this.contentInput.value.trim();
      if (!title || !content || !this.selectedISO) return;
      const now = new Date().toISOString();
      const notes = this.notesMap[this.selectedISO] ?? [];
      const existingId = this.idInput.value;
      let updated;
      if (existingId) {
        updated = notes.map((note) =>
          note.id === existingId
            ? { ...note, title, content, updatedAt: now }
            : note,
        );
      } else {
        updated = [
          {
            id: typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}`,
            title,
            content,
            createdAt: now,
            updatedAt: now,
          },
          ...notes,
        ];
      }
      this.notesMap[this.selectedISO] = updated;
      this.persist();
      this.resetForm();
      this.renderList();
      this.onChange();
    }

    populateForm(id) {
      const notes = this.notesMap[this.selectedISO] ?? [];
      const note = notes.find((item) => item.id === id);
      if (!note) return;
      this.idInput.value = note.id;
      this.titleInput.value = note.title;
      this.contentInput.value = note.content;
      this.titleInput.focus();
    }

    resetForm() {
      this.formEl.reset();
      this.idInput.value = "";
    }

    deleteNote(id) {
      if (!this.selectedISO) return;
      const notes = this.notesMap[this.selectedISO] ?? [];
      const note = notes.find((item) => item.id === id);
      if (!note) return;
      if (!confirm(`یادداشت "${note.title}" حذف شود؟`)) return;
      const updated = notes.filter((item) => item.id !== id);
      if (updated.length) {
        this.notesMap[this.selectedISO] = updated;
      } else {
        delete this.notesMap[this.selectedISO];
      }
      this.persist();
      this.renderList();
      this.onChange();
    }

    renderList() {
      this.listEl.innerHTML = "";
      if (!this.selectedISO) {
        this.listEl.innerHTML =
          "<p class='empty-placeholder'>روز مورد نظر را از تقویم انتخاب کنید.</p>";
        return;
      }
      const notes = this.notesMap[this.selectedISO] ?? [];
      if (!notes.length) {
        this.listEl.innerHTML =
          "<p class='empty-placeholder'>برای این روز یادداشتی ثبت نشده است.</p>";
        return;
      }
      const fragment = document.createDocumentFragment();
      notes.forEach((note) => {
        const node = this.template.content.cloneNode(true);
        const card = node.querySelector(".note-card");
        card.dataset.id = note.id;
        node.querySelector("h3").textContent = note.title;
        node.querySelector(".content").textContent = note.content;
        node.querySelector(".timestamps").textContent = formatNoteTimestamp(
          note,
        );
        fragment.appendChild(node);
      });
      this.listEl.appendChild(fragment);
    }

    dateHasNotes(iso) {
      const list = this.notesMap[iso];
      return Array.isArray(list) && list.length > 0;
    }

    persist() {
      save(StorageKeys.DATE_NOTES, this.notesMap);
    }
  }

  function formatNoteTimestamp(note) {
    const created = new Date(note.createdAt);
    const updated = new Date(note.updatedAt ?? note.createdAt);
    const formatter = new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    if (note.createdAt === note.updatedAt) {
      return `ایجاد: ${formatter.format(created)}`;
    }
    return `ویرایش: ${formatter.format(updated)}`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const quickAccess = new QuickAccessManager(
      document.getElementById("quick-access-grid"),
      document.getElementById("quick-access-form"),
      document.getElementById("quick-link-template"),
    );

    const generalNotes = new NotesManager(
      document.getElementById("notes-list"),
      document.getElementById("note-form"),
      document.getElementById("note-template"),
    );

    const dateNotes = new DateNotesManager({
      listEl: document.getElementById("date-notes-list"),
      formEl: document.getElementById("date-note-form"),
      templateEl: document.getElementById("note-template"),
      selectedLabelEl: document.getElementById("selected-date-label"),
      cancelBtn: document.getElementById("date-note-cancel"),
      onChange: () => calendar.render(),
    });

    const calendar = new CalendarController(
      document.getElementById("calendar-panel"),
      {
        onSelect: (date) => {
          dateNotes.selectDate(date);
        },
        hasNotes: (iso) => dateNotes.dateHasNotes(iso),
      },
    );
    dateNotes.setMode(calendar.mode);

    const initialDate = new Date();
    calendar.setSelectedDate(initialDate);
    dateNotes.selectDate(initialDate);

    document
      .getElementById("search-form")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        const value = document.getElementById("search-input").value.trim();
        if (!value) return;
        const url = `https://www.google.com/search?q=${encodeURIComponent(
          value,
        )}`;
        window.open(url, "_blank", "noopener");
      });

    const modeToggleBtn = document.getElementById("calendar-mode-toggle");
    updateModeButton();

    modeToggleBtn.addEventListener("click", () => {
      const nextMode =
        calendar.mode === CalendarModes.GREGORIAN
          ? CalendarModes.JALALI
          : CalendarModes.GREGORIAN;
      calendar.setMode(nextMode);
      dateNotes.setMode(nextMode);
      updateModeButton();
    });

    function updateModeButton() {
      if (calendar.mode === CalendarModes.GREGORIAN) {
        modeToggleBtn.textContent = "تقویم: میلادی";
      } else {
        modeToggleBtn.textContent = "تقویم: شمسی";
      }
    }

    document.getElementById("open-help").addEventListener("click", () => {
      alert(
        [
          "راهنمای سریع دستیار وب:",
          "- در نوار جستجو تایپ کنید و کلید Enter را بزنید تا نتایج گوگل در زبانه جدید باز شود.",
          "- با استفاده از حداقل یک آیکن یا ایموجی میانبرهای شخصی خود را بسازید.",
          "- یادداشت های عمومی مستقل از تاریخ هستند اما از سمت چپ هر روز تقویم می توانید یادداشت های همان روز را ثبت کنید.",
          "- دکمه تقویم را بزنید تا بین حالت میلادی و شمسی جابه جا شوید.",
        ].join("\n"),
      );
    });
  });
})();
