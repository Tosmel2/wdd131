"use strict";

/* =========================================
   TASKFLOW — TASK MANAGEMENT APPLICATION
========================================= */

const STORAGE_KEY = "taskflow_tasks_v1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
  sidebar: $("#sidebar"),
  menuToggle: $("#menuToggle"),
  addTaskBtn: $("#addTaskBtn"),
  modal: $("#taskModal"),
  modalTitle: $("#modalTitle"),
  closeModal: $("#closeModal"),
  cancelModal: $("#cancelModal"),
  taskForm: $("#taskForm"),
  taskId: $("#taskId"),
  taskTitle: $("#taskTitle"),
  taskDescription: $("#taskDescription"),
  taskCategory: $("#taskCategory"),
  taskPriority: $("#taskPriority"),
  taskDueDate: $("#taskDueDate"),
  saveTaskBtn: $("#saveTaskBtn"),
  titleError: $("#titleError"),
  dateError: $("#dateError"),
  taskList: $("#taskList"),
  taskListFooter: $("#taskListFooter"),
  searchInput: $("#searchInput"),
  statusFilter: $("#statusFilter"),
  priorityFilter: $("#priorityFilter"),
  sortFilter: $("#sortFilter"),
  clearCompletedBtn: $("#clearCompletedBtn"),
  toastContainer: $("#toastContainer"),
};

// Application state
let tasks = loadTasks();
let currentView = "all";
let currentCategory = null;
let lastFocusedElement = null;

/* =========================================
   DATE HELPERS
========================================= */

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

function formatDate(dateString) {
  if (!dateString) return "No due date";

  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task) {
  return !task.completed &&
    task.dueDate &&
    task.dueDate < getLocalDateString();
}

function isDueToday(task) {
  return !task.completed &&
    task.dueDate === getLocalDateString();
}

/* =========================================
   STORAGE
========================================= */

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved === null) {
      // Sample tasks for first-time visitors.
      // Delete these seed tasks if you prefer an empty dashboard.
      const today = getLocalDateString();

      return [
        {
          id: "sample-1",
          title: "Plan the week ahead",
          description: "Review priorities and organize my schedule.",
          category: "Personal",
          priority: "High",
          dueDate: today,
          completed: false,
          createdAt: Date.now() - 3000,
        },
        {
          id: "sample-2",
          title: "Finish the website layout",
          description: "Complete the responsive dashboard components.",
          category: "Work",
          priority: "Medium",
          dueDate: getDateOffset(1),
          completed: false,
          createdAt: Date.now() - 2000,
        },
        {
          id: "sample-3",
          title: "Read for 30 minutes",
          description: "Spend time learning something new.",
          category: "Study",
          priority: "Low",
          dueDate: getDateOffset(2),
          completed: false,
          createdAt: Date.now() - 1000,
        },
        {
          id: "sample-4",
          title: "Take a short walk",
          description: "A little movement helps me reset.",
          category: "Health",
          priority: "Low",
          dueDate: today,
          completed: true,
          createdAt: Date.now(),
        },
      ];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      throw new Error("Saved task data is invalid.");
    }

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["Work", "Personal", "Study", "Health"].includes(task.category) &&
      ["Low", "Medium", "High"].includes(task.priority) &&
      typeof task.dueDate === "string"
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);

    showToast(
      "Changes could not be saved. Check your browser storage.",
      "error"
    );

    return false;
  }
}

/* =========================================
   TOAST NOTIFICATIONS
========================================= */

function showToast(message, type = "success") {
  const toast = document.createElement("div");

  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  // Automatically dismiss after a short delay.
  setTimeout(() => toast.remove(), 3200);
}

/* =========================================
   DASHBOARD STATISTICS
========================================= */

function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(isOverdue).length;

  const percent = total
    ? Math.round((completed / total) * 100)
    : 0;

  $("#totalTasks").textContent = total;
  $("#pendingTasks").textContent = pending;
  $("#completedTasks").textContent = completed;
  $("#overdueTasks").textContent = overdue;

  $("#progressPercent").textContent = `${percent}%`;
  $("#progressFill").style.width = `${percent}%`;
  $("#progressBar").setAttribute("aria-valuenow", percent);

  $("#progressCount").textContent =
    `${completed} of ${total} tasks completed`;

  $("#progressMessage").textContent =
    total === 0
      ? "Add a task to start making progress."
      : completed === total
        ? "Amazing! You've completed every task."
        : `${pending} ${pending === 1 ? "task" : "tasks"} left to go. You've got this!`;

  elements.clearCompletedBtn.disabled = completed === 0;
}

/* =========================================
   NAVIGATION
========================================= */

const viewDetails = {
  all: {
    title: "Overview",
    section: "Your tasks",
    subtitle: "Everything you need to stay on track.",
  },
  today: {
    title: "My Day",
    section: "Today's tasks",
    subtitle: "Focus on what needs your attention today.",
  },
  upcoming: {
    title: "Upcoming",
    section: "Upcoming tasks",
    subtitle: "Get ahead of your deadlines.",
  },
  completed: {
    title: "Completed",
    section: "Completed tasks",
    subtitle: "Look at everything you've accomplished.",
  },
};

function setView(view) {
  if (!viewDetails[view]) return;

  currentView = view;
  currentCategory = null;

  updateNavigation();
  updatePageHeading();
  renderTasks();
  closeSidebar();
}

function setCategory(category) {
  currentCategory = category;
  currentView = "all";

  updateNavigation();
  updatePageHeading();
  renderTasks();
  closeSidebar();
}

function updateNavigation() {
  $$(".nav-link").forEach((button) => {
    const active =
      !currentCategory && button.dataset.view === currentView;

    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  $$(".category-link").forEach((button) => {
    const active = button.dataset.category === currentCategory;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updatePageHeading() {
  const details = viewDetails[currentView];

  const title = currentCategory
    ? `${currentCategory} tasks`
    : details.title;

  $("#breadcrumbTitle").textContent = title;
  $("#taskSectionTitle").textContent = currentCategory
    ? `${currentCategory} tasks`
    : details.section;

  $("#taskSectionSubtitle").textContent = currentCategory
    ? `All tasks in your ${currentCategory.toLowerCase()} category.`
    : details.subtitle;

  $("#pageTitle").innerHTML = currentCategory
    ? `Focus on <span>${escapeHTML(currentCategory)}.</span>`
    : currentView === "today"
      ? 'Make today <span>count.</span>'
      : currentView === "upcoming"
        ? 'Plan ahead with <span>confidence.</span>'
        : currentView === "completed"
          ? 'Look how far <span>you’ve come.</span>'
          : 'Good things take <span>progress.</span>';

  $("#pageSubtitle").textContent = currentCategory
    ? "One category at a time. Keep making progress."
    : details.subtitle;
}

/* =========================================
   TASK FILTERING AND SORTING
========================================= */

function getVisibleTasks() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;
  const priority = elements.priorityFilter.value;
  const sort = elements.sortFilter.value;
  const today = getLocalDateString();

  let filtered = tasks.filter((task) => {
    const matchesSearch = [
      task.title,
      task.description,
      task.category,
      task.priority,
    ].some((value) => String(value).toLowerCase().includes(search));

    const matchesCategory =
      !currentCategory || task.category === currentCategory;

    const matchesStatus =
      status === "all" ||
      (status === "completed" && task.completed) ||
      (status === "pending" && !task.completed);

    const matchesPriority =
      priority === "all" || task.priority === priority;

    let matchesView = true;

    if (currentView === "today") {
      matchesView = task.dueDate === today && !task.completed;
    }

    if (currentView === "upcoming") {
      matchesView = task.dueDate > today && !task.completed;
    }

    if (currentView === "completed") {
      matchesView = task.completed;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesPriority &&
      matchesView
    );
  });

  const priorityOrder = { High: 3, Medium: 2, Low: 1 };

  filtered.sort((a, b) => {
    if (sort === "priority") {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }

    if (sort === "created") {
      return b.createdAt - a.createdAt;
    }

    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }

    // Due date ascending; completed tasks stay toward the bottom.
    return (
      Number(a.completed) - Number(b.completed) ||
      a.dueDate.localeCompare(b.dueDate) ||
      b.createdAt - a.createdAt
    );
  });

  return filtered;
}

/* =========================================
   SAFE HTML OUTPUT
========================================= */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

/* =========================================
   RENDER TASKS
========================================= */

function renderTasks() {
  const visibleTasks = getVisibleTasks();

  elements.taskList.innerHTML = "";

  if (visibleTasks.length === 0) {
    const hasFilters =
      elements.searchInput.value.trim() ||
      elements.statusFilter.value !== "all" ||
      elements.priorityFilter.value !== "all";

    const emptyTitle = hasFilters
      ? "No matching tasks"
      : currentView === "completed"
        ? "Nothing completed yet"
        : currentView === "today"
          ? "Your day is clear"
          : currentView === "upcoming"
            ? "Nothing coming up"
            : "A fresh start";

    const emptyMessage = hasFilters
      ? "Try changing your search or filters."
      : currentView === "completed"
        ? "Completed tasks will appear here."
        : currentView === "today"
          ? "You have no unfinished tasks due today."
          : currentView === "upcoming"
            ? "No future deadlines yet. Enjoy the breathing room."
            : "Add your first task and start organizing your day.";

    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = hasFilters ? "⌕" : "✦";

    const heading = document.createElement("h3");
    heading.textContent = emptyTitle;

    const paragraph = document.createElement("p");
    paragraph.textContent = emptyMessage;

    empty.append(icon, heading, paragraph);

    if (!hasFilters && currentView !== "completed" &&
        currentView !== "upcoming") {
      const button = document.createElement("button");
      button.className = "primary-button";
      button.textContent = "＋ Create a task";
      button.addEventListener("click", () => openModal());

      empty.appendChild(button);
    }

    elements.taskList.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();

    visibleTasks.forEach((task) => {
      fragment.appendChild(createTaskCard(task));
    });

    elements.taskList.appendChild(fragment);
  }

  const count = visibleTasks.length;

  elements.taskListFooter.innerHTML = "";

  const countLabel = document.createElement("span");
  countLabel.textContent =
    `Showing ${count} ${count === 1 ? "task" : "tasks"}`;

  const totalLabel = document.createElement("span");
  totalLabel.textContent = `${tasks.length} total in workspace`;

  elements.taskListFooter.append(countLabel, totalLabel);

  renderStats();
}

/* =========================================
   CREATE A TASK CARD
========================================= */

function createTaskCard(task) {
  const card = document.createElement("article");

  card.className = `task-card${task.completed ? " is-completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    `${task.completed ? "Reopen" : "Complete"} ${task.title}`
  );

  checkbox.addEventListener("change", () => {
    toggleTask(task.id);
  });

  const main = document.createElement("div");
  main.className = "task-main";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title;

  main.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    main.appendChild(description);
  }

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const category = document.createElement("span");
  category.className = "tag tag-category";
  category.textContent = task.category;

  const priority = document.createElement("span");
  priority.className =
    `tag tag-priority priority-${task.priority.toLowerCase()}`;

  priority.textContent = `● ${task.priority}`;

  const dueDate = document.createElement("span");
  dueDate.className = "tag tag-date";

  if (!task.completed && isOverdue(task)) {
    dueDate.classList.add("overdue");
    dueDate.textContent = `⚠ Overdue · ${formatDate(task.dueDate)}`;
  } else if (isDueToday(task)) {
    dueDate.classList.add("due-today");
    dueDate.textContent = `◷ Due today`;
  } else {
    dueDate.textContent = `◷ ${formatDate(task.dueDate)}`;
  }

  meta.append(category, priority, dueDate);
  main.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "task-action";
  editButton.textContent = "✎";
  editButton.title = "Edit task";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);

  editButton.addEventListener("click", () => openModal(task.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "task-action delete";
  deleteButton.textContent = "⌫";
  deleteButton.title = "Delete task";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

  deleteButton.addEventListener("click", () => deleteTask(task.id));

  actions.append(editButton, deleteButton);
  card.append(checkbox, main, actions);

  return card;
}

/* =========================================
   CREATE AND EDIT TASKS
========================================= */

function openModal(taskId = null) {
  lastFocusedElement = document.activeElement;

  elements.taskForm.reset();
  elements.titleError.textContent = "";
  elements.dateError.textContent = "";
  elements.taskId.value = "";

  if (taskId) {
    const task = tasks.find((item) => item.id === taskId);

    if (!task) return;

    elements.modalTitle.textContent = "Edit your task";
    elements.saveTaskBtn.textContent = "Save changes";

    elements.taskId.value = task.id;
    elements.taskTitle.value = task.title;
    elements.taskDescription.value = task.description;
    elements.taskCategory.value = task.category;
    elements.taskPriority.value = task.priority;
    elements.taskDueDate.value = task.dueDate;
  } else {
    elements.modalTitle.textContent = "Create a new task";
    elements.saveTaskBtn.textContent = "Create task";

    elements.taskCategory.value = currentCategory || "Work";
    elements.taskPriority.value = "Medium";
    elements.taskDueDate.value = getLocalDateString();
  }

  elements.modal.classList.add("open");
  elements.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(() => elements.taskTitle.focus(), 50);
}

function closeModal() {
  elements.modal.classList.remove("open");
  elements.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
}

function validateForm() {
  const title = elements.taskTitle.value.trim();
  const dueDate = elements.taskDueDate.value;

  elements.titleError.textContent = "";
  elements.dateError.textContent = "";

  let valid = true;

  if (!title) {
    elements.titleError.textContent = "Please enter a task title.";
    valid = false;
  }

  if (!dueDate) {
    elements.dateError.textContent = "Please choose a due date.";
    valid = false;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    elements.dateError.textContent = "Please enter a valid date.";
    valid = false;
  } else {
    const [year, month, day] = dueDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      elements.dateError.textContent = "Please enter a valid date.";
      valid = false;
    }
  }

  return valid;
}

function handleTaskSubmit(event) {
  event.preventDefault();

  if (!validateForm()) return;

  const id = elements.taskId.value;

  const existingTask = id
    ? tasks.find((task) => task.id === id)
    : null;

  if (id && !existingTask) {
    showToast("This task could not be found.", "error");
    closeModal();
    return;
  }

  const taskData = {
    id: id || (
      window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    ),
    title: elements.taskTitle.value.trim(),
    description: elements.taskDescription.value.trim(),
    category: elements.taskCategory.value,
    priority: elements.taskPriority.value,
    dueDate: elements.taskDueDate.value,
    completed: existingTask ? existingTask.completed : false,
    createdAt: existingTask ? existingTask.createdAt : Date.now(),
  };

  if (existingTask) {
    tasks = tasks.map((task) =>
      task.id === id ? taskData : task
    );
  } else {
    tasks.unshift(taskData);
  }

  if (!saveTasks()) return;

  closeModal();
  renderTasks();

  showToast(
    existingTask ? "Task updated successfully!" : "New task created!"
  );
}

/* =========================================
   COMPLETE OR REOPEN TASKS
========================================= */

function toggleTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return;

  task.completed = !task.completed;

  if (!saveTasks()) {
    task.completed = !task.completed;
    renderTasks();
    return;
  }

  renderTasks();

  showToast(
    task.completed
      ? "Great work! Task completed."
      : "Task moved back to pending."
  );
}

/* =========================================
   DELETE TASKS
========================================= */

function deleteTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return;

  const confirmed = window.confirm(
    `Delete "${task.title}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter((item) => item.id !== taskId);

  if (!saveTasks()) {
    tasks = previousTasks;
    renderTasks();
    return;
  }

  renderTasks();
  showToast("Task deleted.");
}

function clearCompletedTasks() {
  const completed = tasks.filter((task) => task.completed);

  if (completed.length === 0) return;

  const confirmed = window.confirm(
    `Delete all ${completed.length} completed ${
      completed.length === 1 ? "task" : "tasks"
    }? This action cannot be undone.`
  );

  if (!confirmed) return;

  const previousTasks = tasks;
  tasks = tasks.filter((task) => !task.completed);

  if (!saveTasks()) {
    tasks = previousTasks;
    renderTasks();
    return;
  }

  renderTasks();
  showToast("Completed tasks cleared.");
}

/* =========================================
   MOBILE SIDEBAR
========================================= */

function openSidebar() {
  elements.sidebar.classList.add("open");
  elements.menuToggle.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  elements.sidebar.classList.remove("open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
}

function toggleSidebar() {
  if (elements.sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/* =========================================
   EVENT LISTENERS
========================================= */

elements.addTaskBtn.addEventListener("click", () => openModal());

elements.closeModal.addEventListener("click", closeModal);
elements.cancelModal.addEventListener("click", closeModal);

elements.taskForm.addEventListener("submit", handleTaskSubmit);

elements.modal.addEventListener("click", (event) => {
  if (event.target === elements.modal) {
    closeModal();
  }
});

elements.menuToggle.addEventListener("click", toggleSidebar);

elements.sidebar.addEventListener("click", (event) => {
  if (
    window.innerWidth <= 760 &&
    event.target.closest("a") &&
    !event.target.closest("button")
  ) {
    closeSidebar();
  }
});

$$(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});

$$(".category-link").forEach((button) => {
  button.addEventListener("click", () => {
    setCategory(button.dataset.category);
  });
});

elements.searchInput.addEventListener("input", renderTasks);
elements.statusFilter.addEventListener("change", renderTasks);
elements.priorityFilter.addEventListener("change", renderTasks);
elements.sortFilter.addEventListener("change", renderTasks);

elements.clearCompletedBtn.addEventListener(
  "click",
  clearCompletedTasks
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (elements.modal.classList.contains("open")) {
      closeModal();
    } else {
      closeSidebar();
    }
  }

  // Press "/" to focus search when not typing in another field.
  if (
    event.key === "/" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement.tagName
    ) &&
    !elements.modal.classList.contains("open")
  ) {
    event.preventDefault();
    elements.searchInput.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) {
    closeSidebar();
  }
});

/* =========================================
   INITIALIZE APPLICATION
========================================= */

function initializeApp() {
  const now = new Date();

  $("#headerDate").textContent = now.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  $("#welcomeDate").textContent =
    now.toLocaleDateString("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).toUpperCase();

  updateNavigation();
  updatePageHeading();
  renderTasks();
}

initializeApp();