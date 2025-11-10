import { load, save, StorageKeys } from "./storage.js";
import { formatJalali } from "./jalali.js";

export class NotesManager {
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
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
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

export class DateNotesManager {
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
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
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
      node.querySelector(".timestamps").textContent = formatNoteTimestamp(note);
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
