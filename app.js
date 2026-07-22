/* ==========================================================================
   1. LOCAL STORAGE & INITIAL STATE
   ========================================================================== */

// Retrieve saved transactions from Local Storage if available
const localStorageTransactions = JSON.parse(
  localStorage.getItem("transactions"),
);

// Fallback to empty array if no stored transactions exist
let dummyTransactions =
  localStorage.getItem("transactions") !== null ? localStorageTransactions : [];

// Tracks whether we are currently editing an existing transaction (null = normal mode)
let editId = null;

// Stores the active Chart.js instance so we can destroy/re-render it cleanly
let categoryChart = null;

// Pre-defined monthly budget caps for expense categories
const categoryBudgets = {
  "Rent & Housing": 3500,
  Food: 200,
  Utilities: 150,
  General: 300,
  Entertainment: 250,
};

/* ==========================================================================
   2. DOM ELEMENT REFERENCES
   ========================================================================== */

const balance = document.getElementById("balance");
const list = document.getElementById("list");
const moneyPlus = document.getElementById("money-plus");
const moneyMinus = document.getElementById("money-minus");
const form = document.getElementById("form");
const text = document.getElementById("text");
const amount = document.getElementById("amount");
const category = document.getElementById("category");

/* ==========================================================================
   3. STORAGE UTILITIES
   ========================================================================== */

/**
 * Saves current transactions array into browser's localStorage
 */
function updateLocalStorage() {
  localStorage.setItem("transactions", JSON.stringify(dummyTransactions));
}

/* ==========================================================================
   4. FINANCIAL CALCULATIONS & SUMMARY
   ========================================================================== */

/**
 * Recalculates Total Balance, Total Income, and Total Expenses
 * and updates the respective UI element text content.
 */
// Helper function to format numbers with commas & 2 decimals
function formatCurrency(number) {
  return Math.abs(number).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function updateValues() {
  const amounts = dummyTransactions.map((t) => t.amount);
  const totalNum = amounts.reduce((acc, item) => (acc += item), 0);

  const sign = totalNum < 0 ? "-" : "";
  const formattedTotal = formatCurrency(totalNum);

  const income = amounts
    .filter((item) => item > 0)
    .reduce((acc, item) => (acc += item), 0);

  const expense = amounts
    .filter((item) => item < 0)
    .reduce((acc, item) => (acc += item), 0);

  if (balance) balance.innerText = `${sign}$${formattedTotal}`;
  if (moneyPlus) moneyPlus.innerText = `+$${formatCurrency(income)}`;
  if (moneyMinus) moneyMinus.innerText = `-$${formatCurrency(expense)}`;
}
/* ==========================================================================
   5. TRANSACTION LIST RENDERING
   ========================================================================== */

/**
 * Renders list items in the DOM based on provided dataset or default state
 * @param {Array|null} filteredList - Optional pre-filtered/sorted array
 */
function renderHistory(filteredList = null) {
  if (!list) return;

  // Clear existing items before redrawing
  list.innerHTML = "";

  // Use passed filtered list or fall back to main transaction array
  const transactionsToDisplay =
    filteredList !== null ? filteredList : dummyTransactions;

  // Empty state handling
  if (!transactionsToDisplay || transactionsToDisplay.length === 0) {
    list.innerHTML = `<li class="empty-state" style="text-align: center; color: #888; padding: 15px;">No matching transactions found 🚀</li>`;
    return;
  }

  // Loop through transactions and append styled list items
  transactionsToDisplay.forEach((transaction) => {
    const isExpense = transaction.amount < 0;
    const sign = isExpense ? "-" : "+";
    const borderClass = isExpense ? "minus" : "plus";

    const li = document.createElement("li");
    li.classList.add(borderClass);

    li.innerHTML = `
      <span>
        ${transaction.text} 
        <small style="opacity: 0.7;">(${transaction.category || "General"})</small>
      </span>
      <span>${sign}$${Math.abs(transaction.amount).toFixed(2)}</span>
      <div>
        <!-- Edit Action Button -->
        <button class="edit-btn" onclick="editTransaction(${transaction.id})" style="margin-right: 5px; cursor: pointer; background: transparent; border: none; font-size: 1rem;">✏️</button>
        <!-- Delete Action Button -->
        <button class="delete-btn" onclick="deleteTransaction(${transaction.id})" style="cursor: pointer; background: transparent; border: none; color: #f44336; font-weight: bold; font-size: 1rem;">❌</button>
      </div>
    `;

    list.appendChild(li);
  });
}

/* ==========================================================================
   6. SEARCH, CATEGORY FILTER & SORTING ENGINE
   ========================================================================== */

/**
 * Filters and sorts transactions based on UI input states
 */
function filterTransactions() {
  const searchInput = document.getElementById("search-input");
  const filterCategory = document.getElementById("filter-category");
  const sortOrder = document.getElementById("sort-order");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCat = filterCategory ? filterCategory.value : "All";
  const order = sortOrder ? sortOrder.value : "newest";

  // Step A: Filter by search query text & category selection
  let filtered = dummyTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.text.toLowerCase().includes(query) ||
      (transaction.category &&
        transaction.category.toLowerCase().includes(query));

    const matchesCategory =
      selectedCat === "All" || transaction.category === selectedCat;

    return matchesSearch && matchesCategory;
  });

  // Step B: Sort filtered results
  filtered = filtered.slice().sort((a, b) => {
    if (order === "newest") return b.id - a.id; // Higher ID timestamp = newer
    if (order === "oldest") return a.id - b.id; // Lower ID timestamp = older
    if (order === "highest") return Math.abs(b.amount) - Math.abs(a.amount);
    if (order === "lowest") return Math.abs(a.amount) - Math.abs(b.amount);
    return 0;
  });

  // Re-render UI list with final processed array
  renderHistory(filtered);
}

/* ==========================================================================
   7. CHART.JS VISUALIZATION
   ========================================================================== */

/**
 * Aggregates expenses by category and renders the Doughnut Chart
 */
function updateChart() {
  const canvas = document.getElementById("categoryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const expenseTotals = {};

  // Group and sum negative amounts (expenses) by category
  dummyTransactions
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const cat = t.category || "General";
      const amt = Math.abs(t.amount);
      expenseTotals[cat] = (expenseTotals[cat] || 0) + amt;
    });

  const categories = Object.keys(expenseTotals);
  const amounts = Object.values(expenseTotals);

  // Safely destroy previous instance to avoid canvas overlay glitches
  if (categoryChart) {
    categoryChart.destroy();
  }

  // Handle chart visual state when no expenses exist
  if (categories.length === 0) {
    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["No Expenses"],
        datasets: [{ data: [1], backgroundColor: ["#334155"] }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#ffffff" } },
          tooltip: { enabled: false },
        },
      },
    });
    return;
  }

  // Render populated chart
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#ffffff" },
        },
        tooltip: {
          callbacks: {
            // Formats tooltips with exact dollar amounts and overall percentage
            label: function (context) {
              const label = context.label || "";
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return ` ${label}: $${value.toFixed(2)} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

/* ==========================================================================
   8. CATEGORY BUDGET PROGRESS BARS
   ========================================================================== */

/**
 * Calculates spending vs limit per category and renders progress indicators
 */
function renderBudgets() {
  const container = document.getElementById("budgets-container");
  if (!container) return;

  container.innerHTML = "";

  // Sum spending per category
  const categoryTotals = {};
  dummyTransactions.forEach((t) => {
    if (t.amount < 0) {
      const cat = t.category || "General";
      const spent = Math.abs(t.amount);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + spent;
    }
  });

  // Render progress card for each configured budget category
  Object.keys(categoryBudgets).forEach((cat) => {
    const limit = categoryBudgets[cat];
    const spent = categoryTotals[cat] || 0;
    const percentage = Math.min((spent / limit) * 100, 100).toFixed(0);

    let statusClass = "status-ok";
    let barColor = "#2ecc71"; // Green default
    let statusText = `${percentage}% of $${limit} spent`;

    // Dynamic warning/danger status states
    if (spent >= limit) {
      statusClass = "status-danger";
      barColor = "#e74c3c"; // Red overflow
      statusText = `⚠️ Over budget by $${(spent - limit).toFixed(2)}!`;
    } else if (percentage >= 75) {
      statusClass = "status-warning";
      barColor = "#f39c12"; // Orange warning
      statusText = `⚡ Warning: ${percentage}% of budget used`;
    }

    container.innerHTML += `
      <div class="budget-card">
        <div class="budget-header">
          <span>${cat}</span>
          <span>$${spent.toFixed(2)} / $${limit}</span>
        </div>
        <div class="progress-bar-background">
          <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${barColor};"></div>
        </div>
        <span class="budget-status ${statusClass}">${statusText}</span>
      </div>
    `;
  });
}

/* ==========================================================================
   9. TRANSACTION CRUD ACTIONS (CREATE, READ, UPDATE, DELETE)
   ========================================================================== */

/**
 * Form submit handler to create new or edit existing transactions
 */
function addTransaction(e) {
  e.preventDefault();

  // Basic form validation
  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Please enter both description and amount");
    return;
  }

  // Branch 1: Update Existing Mode
  if (editId !== null) {
    dummyTransactions = dummyTransactions.map((t) => {
      if (t.id === editId) {
        return {
          ...t,
          text: text.value,
          amount: +amount.value, // '+' converts string input to number
          category: category.value,
        };
      }
      return t;
    });

    // Reset edit mode state
    editId = null;
    const submitBtn = form.querySelector("button");
    if (submitBtn) submitBtn.innerText = "Add Transaction";
  }
  // Branch 2: Create New Mode
  else {
    const transaction = {
      id: Date.now(), // Unique ID based on current timestamp
      text: text.value,
      amount: +amount.value,
      category: category.value,
    };
    dummyTransactions.push(transaction);
  }

  updateLocalStorage();
  refreshAllViews();

  // Clear inputs
  text.value = "";
  amount.value = "";
}

/**
 * Populates inputs with existing transaction values to initiate edit mode
 */
function editTransaction(id) {
  const transaction = dummyTransactions.find((t) => t.id == id);
  if (!transaction) return;

  if (text) text.value = transaction.text;
  if (amount) amount.value = transaction.amount;
  if (category) category.value = transaction.category || "General";

  editId = transaction.id;

  const submitBtn = form.querySelector("button");
  if (submitBtn) submitBtn.innerText = "Save Edit";
}

/**
 * Removes a transaction by ID
 */
function deleteTransaction(id) {
  dummyTransactions = dummyTransactions.filter((t) => t.id !== id);
  updateLocalStorage();
  refreshAllViews();
}

/**
 * Purges all local transaction storage after confirmation
 */
function clearAllData() {
  if (!dummyTransactions || dummyTransactions.length === 0) {
    alert("There are no transactions to clear!");
    return;
  }

  if (confirm("Are you sure you want to delete ALL transactions?")) {
    dummyTransactions = [];
    updateLocalStorage();
    refreshAllViews();
  }
}

/* ==========================================================================
   10. DATA EXPORT (CSV FORMAT)
   ========================================================================== */

/**
 * Generates a structured CSV file from current state and initiates download
 */
function exportToCSV() {
  if (!dummyTransactions || dummyTransactions.length === 0) {
    alert("No transactions to export!");
    return;
  }

  let csvContent = "ID,Description,Amount,Category\n";
  let totalIncome = 0;
  let totalExpenses = 0;

  // Build CSV rows and accumulate mathematical summary totals
  dummyTransactions.forEach((t) => {
    const val = Number(t.amount) || 0;
    const cat = t.category || "General";
    csvContent += `${t.id},"${t.text}",${val},"${cat}"\n`;

    if (val > 0) totalIncome += val;
    else totalExpenses += val;
  });

  const netBalance = totalIncome + totalExpenses;

  // Append summary section at bottom of CSV
  csvContent += `\n`;
  csvContent += `,"--- SUMMARY TOTALS ---",,\n`;
  csvContent += `,"Total Income",${totalIncome.toFixed(2)},\n`;
  csvContent += `,"Total Expenses",${totalExpenses.toFixed(2)},\n`;
  csvContent += `,"Net Balance",${netBalance.toFixed(2)},\n`;

  // Create virtual link download trigger
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "finance_dashboard_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   11. THEME MANAGEMENT
   ========================================================================== */

/**
 * Toggles light/dark mode class on <body> and persists choice to storage
 */
function toggleTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const isDark = themeToggle ? themeToggle.checked : false;

  if (isDark) {
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
  }
}

// Self-executing function to apply saved user theme on page render
(function loadSavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  const themeToggle = document.getElementById("theme-toggle");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.checked = true;
  } else {
    document.body.classList.remove("dark-mode");
    if (themeToggle) themeToggle.checked = false;
  }
})();

/* ==========================================================================
   12. APPLICATION CONTROLLER / INITIALIZATION
   ========================================================================== */

/**
 * Orchestrates a complete refresh across all UI modules
 */
function refreshAllViews() {
  updateValues();
  filterTransactions();
  updateChart();
  renderBudgets();
}

// Attach Form Listener
if (form) form.addEventListener("submit", addTransaction);

// Expose handlers to global window scope for inline HTML event attributes (e.g., onclick="")
window.filterTransactions = filterTransactions;
window.exportToCSV = exportToCSV;
window.clearAllData = clearAllData;
window.toggleTheme = toggleTheme;
window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;

// Boot up app on script execution
refreshAllViews();
