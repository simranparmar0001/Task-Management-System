
const STORAGE_KEY = "taskflow_tasks_v1";

const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("taskTitle");
const descriptionInput = document.getElementById("taskDescription");
const priorityInput = document.getElementById("taskPriority");
const dateInput = document.getElementById("taskDate");
const statusInput = document.getElementById("taskStatus");

const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");

const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formHeading = document.getElementById("formHeading");

let tasks = loadTasks();
let editingId = null;

// Safely load saved tasks from browser storage.
function loadTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved)
            ? saved.filter(task =>
                task &&
                typeof task.id === "string" &&
                typeof task.title === "string" &&
                ["Pending", "In Progress", "Completed"].includes(task.status) &&
                ["Low", "Medium", "High"].includes(task.priority)
            )
            : [];
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

// Save tasks in the browser.
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        alert("Tasks could not be saved. Check your browser storage.");
        console.error("Could not save tasks:", error);
        return false;
    }
}

// Prevent task text from being interpreted as HTML.
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[character];
    });
}

function createId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) return "No deadline";

    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Display today's date.
document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

// Update dashboard counters.
function updateStats() {
    document.getElementById("totalCount").textContent = tasks.length;

    document.getElementById("pendingCount").textContent =
        tasks.filter(task => task.status === "Pending").length;

    document.getElementById("progressCount").textContent =
        tasks.filter(task => task.status === "In Progress").length;

    document.getElementById("completedCount").textContent =
        tasks.filter(task => task.status === "Completed").length;
}

// Create a task card.
function createTaskCard(task) {
    const isCompleted = task.status === "Completed";
    const isOverdue = task.dueDate &&
        task.dueDate < getToday() &&
        !isCompleted;

    const priorityClass = task.priority.toLowerCase();
    const statusClass = task.status.toLowerCase().replace(" ", "-");

    return `
        <article class="task-item ${isCompleted ? "is-completed" : ""}">
            <div class="task-top">
                <input
                    type="checkbox"
                    class="task-check"
                    data-action="toggle"
                    data-id="${escapeHTML(task.id)}"
                    aria-label="Mark ${escapeHTML(task.title)} as completed"
                    ${isCompleted ? "checked" : ""}
                >

                <div class="task-main">
                    <h3 class="task-title">${escapeHTML(task.title)}</h3>

                    ${task.description ? `
                        <p class="task-description">${escapeHTML(task.description)}</p>
                    ` : ""}
                </div>
            </div>

            <div class="task-meta">
                <span class="badge priority-${priorityClass}">
                    ${escapeHTML(task.priority)} Priority
                </span>

                <span class="badge status-${statusClass}">
                    ${escapeHTML(task.status)}
                </span>

                <span class="due-date ${isOverdue ? "overdue" : ""}">
                    ${isOverdue ? "Overdue · " : "Due · "}
                    ${escapeHTML(formatDate(task.dueDate))}
                </span>
            </div>

            <div class="task-actions">
                <button type="button" class="action-btn"
                    data-action="edit" data-id="${escapeHTML(task.id)}">
                    Edit
                </button>

                <button type="button" class="action-btn delete-btn"
                    data-action="delete" data-id="${escapeHTML(task.id)}">
                    Delete
                </button>
            </div>
        </article>
    `;
}

// Display tasks based on search and selected status.
function renderTasks() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = filterStatus.value;

    const filteredTasks = tasks.filter(task => {
        const matchesSearch =
            task.title.toLowerCase().includes(searchTerm) ||
            task.description.toLowerCase().includes(searchTerm);

        const matchesStatus =
            selectedStatus === "All" ||
            task.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    // Sort incomplete tasks before completed ones.
    filteredTasks.sort((a, b) => {
        if (a.status === "Completed" && b.status !== "Completed") return 1;
        if (a.status !== "Completed" && b.status === "Completed") return -1;

        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && !b.dueDate) return -1;

        return (a.dueDate || "").localeCompare(b.dueDate || "");
    });

    document.getElementById("visibleCount").textContent =
        `${filteredTasks.length} task${filteredTasks.length === 1 ? "" : "s"}`;

    if (filteredTasks.length === 0) {
        const noTasks = tasks.length === 0;
        taskList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${noTasks ? "📝" : "🔎"}</div>
                <h3>${noTasks ? "No tasks yet" : "No matching tasks"}</h3>
                <p>${noTasks
                    ? "Create your first task using the form."
                    : "Try another search or status filter."}</p>
            </div>
        `;
    } else {
        taskList.innerHTML = filteredTasks.map(createTaskCard).join("");
    }

    updateStats();
}

// Reset the form after adding or cancelling an edit.
function resetForm() {
    taskForm.reset();
    editingId = null;

    formHeading.textContent = "Create a task";
    saveBtn.innerHTML = "<span>＋</span> Add Task";
    cancelEditBtn.classList.add("hidden");
}

// Add a new task or update an existing one.
taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = titleInput.value.trim();

    if (!title) {
        alert("Please enter a task title.");
        titleInput.focus();
        return;
    }

    const taskData = {
        title,
        description: descriptionInput.value.trim(),
        priority: priorityInput.value,
        dueDate: dateInput.value,
        status: statusInput.value
    };

    if (editingId !== null) {
        const index = tasks.findIndex(task => task.id === editingId);

        if (index === -1) {
            resetForm();
            renderTasks();
            return;
        }

        const updatedTasks = [...tasks];
        updatedTasks[index] = {
            ...updatedTasks[index],
            ...taskData
        };

        const previousTasks = tasks;
        tasks = updatedTasks;

        if (!saveTasks()) {
            tasks = previousTasks;
            return;
        }
    } else {
        const newTask = {
            id: createId(),
            ...taskData,
            createdAt: new Date().toISOString()
        };

        const previousTasks = tasks;
        tasks = [...tasks, newTask];

        if (!saveTasks()) {
            tasks = previousTasks;
            return;
        }
    }

    resetForm();
    renderTasks();
});

// Handle Edit, Delete and Complete actions.
taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        const task = tasks.find(item => item.id === id);
        if (!task) return;

        editingId = task.id;
        titleInput.value = task.title;
        descriptionInput.value = task.description;
        priorityInput.value = task.priority;
        dateInput.value = task.dueDate;
        statusInput.value = task.status;

        formHeading.textContent = "Edit task";
        saveBtn.innerHTML = "Save Changes";
        cancelEditBtn.classList.remove("hidden");

        titleInput.focus();

        document.querySelector(".form-panel").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (action === "delete") {
        const task = tasks.find(item => item.id === id);
        if (!task) return;

        const confirmed = confirm(
            `Are you sure you want to delete "${task.title}"?`
        );

        if (!confirmed) return;

        const previousTasks = tasks;
        tasks = tasks.filter(item => item.id !== id);

        if (!saveTasks()) {
            tasks = previousTasks;
            return;
        }

        if (editingId === id) resetForm();
        renderTasks();
    }
});

// Handle completion checkbox changes.
taskList.addEventListener("change", event => {
    const checkbox = event.target.closest(
        'input[data-action="toggle"]'
    );

    if (!checkbox) return;

    const id = checkbox.dataset.id;
    const previousTasks = tasks;

    tasks = tasks.map(task => {
        if (task.id !== id) return task;

        return {
            ...task,
            status: checkbox.checked ? "Completed" : "Pending"
        };
    });

    if (!saveTasks()) {
        tasks = previousTasks;
    }

    renderTasks();
});

                           // Search and filtering.
searchInput.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);

                       // Cancel editing.
cancelEditBtn.addEventListener("click", resetForm);

                    // Initial render when the page opens.
renderTasks();