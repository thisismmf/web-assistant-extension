import {
  formatJalali,
  fromJalali,
  gregorianMonthNames,
  gregorianWeekdays,
  jalaliDaysInMonth,
  jalaliMonthNames,
  jalaliWeekdays,
  toJalali,
} from "./jalali.js";

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

export class CalendarController {
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
    const startWeekDay = base.getDay(); // 0-6
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
    const isoSelected = this.selectedDate
      ? toISO(this.selectedDate)
      : null;
    const todayIso = toISO(new Date());

    // Leading days
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

    // Current month
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

    // Trailing days to reach 6 rows max
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

    const isoSelected = this.selectedDate
      ? toISO(this.selectedDate)
      : null;
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
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function formatHuman(date, mode = CalendarModes.GREGORIAN) {
  if (mode === CalendarModes.JALALI) {
    return formatJalali(date);
  }
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export { CalendarModes };
