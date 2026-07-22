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

// Tracks whether we are editing an existing transaction (null = creation mode)
let editId = null;

// Tracks active user selected type ("expense" or "income")
let currentType = "expense";

// Active Chart instance reference
let categoryChart = null;

// Monthly budget caps for categories
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
const submitBtn = document.getElementById("submit-btn");

/* ==========================================================================
   3. STORAGE UTILITIES
   ========================================================================== */

/**
 * Persists transactions array to browser localStorage
 */
function updateLocalStorage() {
  localStorage.setItem("transactions", JSON.stringify(dummyTransactions));
}

/* ==========================================================================
   4. FINANCIAL CALCULATIONS & SUMMARY
   ========================================================================== */

// Utility for clean dollar formatting
function formatCurrency(number) {
  return Math.abs(number).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Updates numerical calculations for Total Balance, Income, and Expenses
 */
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
   5. TRANSACTION TYPE SELECTOR UX TOGGLE
   ========================================================================== */

/**
 * Handles switching between Expense and Income mode in the form
 */
function setTransactionType(type) {
  currentType = type;
  const expenseBtn = document.getElementById("type-expense-btn");
  const incomeBtn = document.getElementById("type-income-btn");

  if (type === "expense") {
    expenseBtn.className = "type-toggle-btn active-expense";
    incomeBtn.className = "type-toggle-btn";
  } else {
    incomeBtn.className = "type-toggle-btn active-income";
    expenseBtn.className = "type-toggle-btn";
  }
}

/* ==========================================================================
   6. TRANSACTION LIST RENDERING
   ========================================================================== */

/**
 * Renders transaction rows with individual ghost action buttons
 */
function renderHistory(filteredList = null) {
  if (!list) return;

  list.innerHTML = "";

  const transactionsToDisplay =
    filteredList !== null ? filteredList : dummyTransactions;

  if (!transactionsToDisplay || transactionsToDisplay.length === 0) {
    list.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 20px; justify-content: center;">No transactions found 🚀</li>`;
    return;
  }

  transactionsToDisplay.forEach((transaction) => {
    const isExpense = transaction.amount < 0;
    const sign = isExpense ? "-" : "+";
    const borderClass = isExpense ? "minus" : "plus";

    const li = document.createElement("li");
    li.classList.add(borderClass);

    // Separated ghost buttons for Edit and Delete
    li.innerHTML = `
      <div>
        <div class="fw-bold" style="color: var(--text-main);">${transaction.text}</div>
        <small style="color: var(--text-muted);">${transaction.category || "General"}</small>
      </div>
      
      <div class="d-flex align-items-center gap-3">
        <span class="fw-bold" style="color: ${isExpense ? "var(--expense-color)" : "var(--income-color)"};">
          ${sign}$${Math.abs(transaction.amount).toFixed(2)}
        </span>
        
        <div class="action-buttons">
          <button 
            class="btn-action edit-btn" 
            onclick="editTransaction(${transaction.id})"
            title="Edit Transaction"
          >
            <i class="bi bi-pencil"></i>
          </button>
          <button 
            class="btn-action delete-btn" 
            onclick="deleteTransaction(${transaction.id})"
            title="Delete Transaction"
          >
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    `;

    list.appendChild(li);
  });
}

/* ==========================================================================
   7. SEARCH, CATEGORY FILTER & SORTING ENGINE
   ========================================================================== */

function filterTransactions() {
  const searchInput = document.getElementById("search-input");
  const filterCategory = document.getElementById("filter-category");
  const sortOrder = document.getElementById("sort-order");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCat = filterCategory ? filterCategory.value : "All";
  const order = sortOrder ? sortOrder.value : "newest";

  let filtered = dummyTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.text.toLowerCase().includes(query) ||
      (transaction.category &&
        transaction.category.toLowerCase().includes(query));

    const matchesCategory =
      selectedCat === "All" || transaction.category === selectedCat;

    return matchesSearch && matchesCategory;
  });

  filtered = filtered.slice().sort((a, b) => {
    if (order === "newest") return b.id - a.id;
    if (order === "oldest") return a.id - b.id;
    if (order === "highest") return Math.abs(b.amount) - Math.abs(a.amount);
    if (order === "lowest") return Math.abs(a.amount) - Math.abs(b.amount);
    return 0;
  });

  renderHistory(filtered);
}

/* ==========================================================================
   8. CHART.JS VISUALIZATION
   ========================================================================== */

function updateChart() {
  const canvas = document.getElementById("categoryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const expenseTotals = {};

  dummyTransactions
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const cat = t.category || "General";
      const amt = Math.abs(t.amount);
      expenseTotals[cat] = (expenseTotals[cat] || 0) + amt;
    });

  const categories = Object.keys(expenseTotals);
  const amounts = Object.values(expenseTotals);

  if (categoryChart) {
    categoryChart.destroy();
  }

  const isDark = document.body.classList.contains("dark-mode");
  const textColor = isDark ? "#f8fafc" : "#0f172a";

  if (categories.length === 0) {
    categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["No Expenses"],
        datasets: [
          { data: [1], backgroundColor: [isDark ? "#334155" : "#e2e8f0"] },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: { enabled: false },
        },
      },
    });
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: categories,
      datasets: [
        {
          data: amounts,
          backgroundColor: [
            "#f43f5e",
            "#3b82f6",
            "#f59e0b",
            "#10b981",
            "#8b5cf6",
            "#ec4899",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor } },
        tooltip: {
          callbacks: {
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
   9. CATEGORY BUDGET PROGRESS BARS
   ========================================================================== */

function renderBudgets() {
  const container = document.getElementById("budgets-container");
  if (!container) return;

  container.innerHTML = "";

  const categoryTotals = {};
  dummyTransactions.forEach((t) => {
    if (t.amount < 0) {
      const cat = t.category || "General";
      const spent = Math.abs(t.amount);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + spent;
    }
  });

  Object.keys(categoryBudgets).forEach((cat) => {
    const limit = categoryBudgets[cat];
    const spent = categoryTotals[cat] || 0;
    const percentage = Math.min((spent / limit) * 100, 100).toFixed(0);

    let statusClass = "status-ok";
    let barColor = "var(--income-color)";
    let statusText = `${percentage}% of $${limit} spent`;

    if (spent >= limit) {
      statusClass = "status-danger";
      barColor = "var(--expense-color)";
      statusText = `⚠️ Over budget by $${(spent - limit).toFixed(2)}!`;
    } else if (percentage >= 75) {
      statusClass = "status-warning";
      barColor = "var(--warning-color)";
      statusText = `⚡ Warning: ${percentage}% used`;
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
   10. TRANSACTION CRUD ACTIONS
   ========================================================================== */

function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Please enter both description and amount");
    return;
  }

  // Calculate final sign based on selected type toggle (Expense = negative, Income = positive)
  const numericVal = Math.abs(parseFloat(amount.value));
  const finalAmount = currentType === "expense" ? -numericVal : numericVal;

  if (editId !== null) {
    dummyTransactions = dummyTransactions.map((t) => {
      if (t.id === editId) {
        return {
          ...t,
          text: text.value,
          amount: finalAmount,
          category: category.value,
        };
      }
      return t;
    });

    editId = null;
    if (submitBtn) submitBtn.innerText = "Add Transaction";
  } else {
    const transaction = {
      id: Date.now(),
      text: text.value,
      amount: finalAmount,
      category: category.value,
    };
    dummyTransactions.push(transaction);
  }

  updateLocalStorage();
  refreshAllViews();

  text.value = "";
  amount.value = "";
}

function editTransaction(id) {
  const transaction = dummyTransactions.find((t) => t.id == id);
  if (!transaction) return;

  if (text) text.value = transaction.text;
  if (amount) amount.value = Math.abs(transaction.amount);
  if (category) category.value = transaction.category || "General";

  // Auto-set the Income/Expense toggle button based on stored amount
  setTransactionType(transaction.amount < 0 ? "expense" : "income");

  editId = transaction.id;
  if (submitBtn) submitBtn.innerText = "Save Edit";
}

function deleteTransaction(id) {
  dummyTransactions = dummyTransactions.filter((t) => t.id !== id);
  updateLocalStorage();
  refreshAllViews();
}

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
   11. DATA EXPORT (CSV FORMAT)
   ========================================================================== */

function exportToCSV() {
  if (!dummyTransactions || dummyTransactions.length === 0) {
    alert("No transactions to export!");
    return;
  }

  let csvContent = "ID,Description,Amount,Category\n";
  let totalIncome = 0;
  let totalExpenses = 0;

  dummyTransactions.forEach((t) => {
    const val = Number(t.amount) || 0;
    const cat = t.category || "General";
    csvContent += `${t.id},"${t.text}",${val},"${cat}"\n`;

    if (val > 0) totalIncome += val;
    else totalExpenses += val;
  });

  const netBalance = totalIncome + totalExpenses;

  csvContent += `\n`;
  csvContent += `,"--- SUMMARY TOTALS ---",,\n`;
  csvContent += `,"Total Income",${totalIncome.toFixed(2)},\n`;
  csvContent += `,"Total Expenses",${totalExpenses.toFixed(2)},\n`;
  csvContent += `,"Net Balance",${netBalance.toFixed(2)},\n`;

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
   12. THEME MANAGEMENT
   ========================================================================== */

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

  updateChart(); // Re-render chart to update label colors
}

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
   13. APPLICATION CONTROLLER
   ========================================================================== */

function refreshAllViews() {
  updateValues();
  filterTransactions();
  updateChart();
  renderBudgets();
}

if (form) form.addEventListener("submit", addTransaction);

// Expose handlers globally
window.filterTransactions = filterTransactions;
window.exportToCSV = exportToCSV;
window.clearAllData = clearAllData;
window.toggleTheme = toggleTheme;
window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;
window.setTransactionType = setTransactionType;

refreshAllViews();
