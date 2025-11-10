import { CalendarController, CalendarModes } from "./modules/calendar.js";
import { DateNotesManager, NotesManager } from "./modules/notes.js";
import { QuickAccessManager } from "./modules/quickAccess.js";

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

  // Search form -> Google search
  document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = document.getElementById("search-input").value.trim();
    if (!value) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
    window.open(url, "_blank", "noopener");
  });

  // Calendar mode toggle
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

  // Help dialog
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
