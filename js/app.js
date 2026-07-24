// js/app.js
import { getStoredTransactions, saveTransactions } from "./storage.js";
import { fetchExchangeRates } from "./api.js";

/* ==========================================================================
   1. STATE & VARIABLES
   ========================================================================== */
let dummyTransactions = getStoredTransactions();
let exchangeRates = {};
let selectedCurrency = "USD";
let editId = null;
let currentType = "expense";
let categoryChart = null;

const categoryBudgets = {
  "Rent & Housing": 3500,
  Food: 200,
  Utilities: 150,
  General: 300,
  Entertainment: 250,
};

/* ==========================================================================
   2. DOM REFERENCES
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
   3. CURRENCY FORMATTER
   ========================================================================== */
function formatMoney(num) {
  const rate = exchangeRates[selectedCurrency] || 1;
  const converted = num * rate;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: selectedCurrency,
  }).format(converted);
}

/* ==========================================================================
   4. FINANCIAL CALCULATIONS
   ========================================================================== */
function updateValues() {
  const amounts = dummyTransactions.map((t) => t.amount);
  const totalNum = amounts.reduce((acc, item) => (acc += item), 0);

  const income = amounts
    .filter((item) => item > 0)
    .reduce((acc, item) => (acc += item), 0);
  const expense = amounts
    .filter((item) => item < 0)
    .reduce((acc, item) => (acc += item), 0);

  if (balance) balance.innerText = formatMoney(totalNum);
  if (moneyPlus) moneyPlus.innerText = formatMoney(income);
  if (moneyMinus) moneyMinus.innerText = formatMoney(expense);
}

/* ==========================================================================
   5. TRANSACTION TYPE UX TOGGLE
   ========================================================================== */
function setTransactionType(type) {
  currentType = type;
  const expenseBtn = document.getElementById("type-expense-btn");
  const incomeBtn = document.getElementById("type-income-btn");

  if (type === "expense") {
    if (expenseBtn) expenseBtn.className = "type-toggle-btn active-expense";
    if (incomeBtn) incomeBtn.className = "type-toggle-btn";
  } else {
    if (incomeBtn) incomeBtn.className = "type-toggle-btn active-income";
    if (expenseBtn) expenseBtn.className = "type-toggle-btn";
  }
}

/* ==========================================================================
   6. RENDERING TRANSACTION LIST
   ========================================================================== */
function renderHistory(filteredList = null) {
  if (!list) return;
  list.innerHTML = "";

  const transactionsToDisplay =
    filteredList !== null ? filteredList : dummyTransactions;

  if (!transactionsToDisplay || transactionsToDisplay.length === 0) {
    list.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 16px; justify-content: center; width: 100%;">No transactions found 🚀</li>`;
    return;
  }

  transactionsToDisplay.forEach((transaction) => {
    const isExpense = transaction.amount < 0;
    const borderClass = isExpense ? "minus" : "plus";

    const li = document.createElement("li");
    li.classList.add(borderClass);

    li.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-title">${transaction.text}</div>
        <div class="transaction-cat">${transaction.category || "General"}</div>
      </div>
      
      <div class="transaction-right">
        <span class="fw-bold" style="font-size: 0.9rem; color: ${isExpense ? "var(--expense-color)" : "var(--income-color)"};">
          ${formatMoney(transaction.amount)}
        </span>
        
        <button class="btn-action edit-btn" onclick="editTransaction(${transaction.id})" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-action delete-btn" onclick="deleteTransaction(${transaction.id})" title="Delete">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    `;

    list.appendChild(li);
  });
}

/* ==========================================================================
   7. SEARCH & FILTER
   ========================================================================== */
function filterTransactions() {
  const searchInput = document.getElementById("search-input");
  const filterCategory = document.getElementById("filter-category");
  const sortOrder = document.getElementById("sort-order");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCat = filterCategory ? filterCategory.value : "All";
  const order = sortOrder ? sortOrder.value : "newest";

  let filtered = dummyTransactions.filter((t) => {
    const matchesSearch =
      t.text.toLowerCase().includes(query) ||
      (t.category && t.category.toLowerCase().includes(query));
    const matchesCategory = selectedCat === "All" || t.category === selectedCat;
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
   8. CHART VISUALIZATION
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
      expenseTotals[cat] = (expenseTotals[cat] || 0) + Math.abs(t.amount);
    });

  const categories = Object.keys(expenseTotals);
  const amounts = Object.values(expenseTotals);

  if (categoryChart) categoryChart.destroy();

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
        plugins: { legend: { labels: { color: textColor } } },
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
              return ` ${label}: ${formatMoney(-value)}`;
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
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
    }
  });

  Object.keys(categoryBudgets).forEach((cat) => {
    const limit = categoryBudgets[cat];
    const spent = categoryTotals[cat] || 0;
    const percentage = Math.min((spent / limit) * 100, 100).toFixed(0);

    let statusClass = "status-ok";
    let barColor = "var(--income-color)";
    let statusText = `${percentage}% spent`;

    if (spent >= limit) {
      statusClass = "status-danger";
      barColor = "var(--expense-color)";
      statusText = `⚠️ Over limit by ${formatMoney(spent - limit)}!`;
    } else if (percentage >= 75) {
      statusClass = "status-warning";
      barColor = "var(--warning-color)";
      statusText = `⚡ Warning: ${percentage}% used`;
    }

    container.innerHTML += `
      <div class="budget-card">
        <div class="budget-header">
          <span>${cat}</span>
          <span>${formatMoney(spent)} / ${formatMoney(limit)}</span>
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
   10. CRUD ACTIONS
   ========================================================================== */
function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === "" || amount.value.trim() === "") {
    alert("Please enter description and amount");
    return;
  }

  const inputVal = Math.abs(parseFloat(amount.value));

  // 1. Get the live rate for your currently selected currency
  const currentRate = exchangeRates[selectedCurrency] || 1;

  // 2. Convert the entered amount (e.g. €100 or ₦5000) to base storage
  const baseUSDAmount = inputVal / currentRate;
  const finalAmount =
    currentType === "expense" ? -baseUSDAmount : baseUSDAmount;

  if (editId !== null) {
    dummyTransactions = dummyTransactions.map((t) =>
      t.id === editId
        ? {
            ...t,
            text: text.value,
            amount: finalAmount,
            category: category.value,
          }
        : t,
    );
    editId = null;
    if (submitBtn) submitBtn.innerText = "Add Transaction";
  } else {
    dummyTransactions.push({
      id: Date.now(),
      text: text.value,
      amount: finalAmount,
      category: category.value,
    });
  }

  saveTransactions(dummyTransactions);
  refreshAllViews();

  text.value = "";
  amount.value = "";
}

function editTransaction(id) {
  const t = dummyTransactions.find((item) => item.id == id);
  if (!t) return;

  if (text) text.value = t.text;
  if (amount) amount.value = Math.abs(t.amount);
  if (category) category.value = t.category || "General";

  setTransactionType(t.amount < 0 ? "expense" : "income");
  editId = t.id;
  if (submitBtn) submitBtn.innerText = "Save Edit";
}

function deleteTransaction(id) {
  dummyTransactions = dummyTransactions.filter((t) => t.id !== id);
  saveTransactions(dummyTransactions);
  refreshAllViews();
}

function clearAllData() {
  if (confirm("Clear all transactions?")) {
    dummyTransactions = [];
    saveTransactions(dummyTransactions);
    refreshAllViews();
  }
}

function exportToCSV() {
  if (!dummyTransactions.length) return alert("No data to export");
  let csv = "ID,Description,Amount,Category\n";
  dummyTransactions.forEach((t) => {
    csv += `${t.id},"${t.text}",${t.amount},"${t.category || "General"}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finance_export.csv";
  a.click();
}

/* ==========================================================================
   11. THEME MANAGEMENT
   ========================================================================== */
function toggleTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const isDark = themeToggle ? themeToggle.checked : false;
  document.body.classList.toggle("dark-mode", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateChart();
}

(function loadSavedTheme() {
  const savedTheme = localStorage.getItem("theme");
  const themeToggle = document.getElementById("theme-toggle");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.checked = true;
  }
})();

/* ==========================================================================
   12. APPLICATION CONTROLLER
   ========================================================================== */
function refreshAllViews() {
  const amountLabel = document.querySelector('label[for="amount"]');
  if (amountLabel) {
    amountLabel.innerText = `Amount (${selectedCurrency})`;
  }

  updateValues();
  filterTransactions();
  updateChart();
  renderBudgets();
}

if (form) form.addEventListener("submit", addTransaction);

// Expose handlers globally for HTML onclick events
window.filterTransactions = filterTransactions;
window.exportToCSV = exportToCSV;
window.clearAllData = clearAllData;
window.toggleTheme = toggleTheme;
window.deleteTransaction = deleteTransaction;
window.editTransaction = editTransaction;
window.setTransactionType = setTransactionType;

async function initApp() {
  const rates = await fetchExchangeRates();
  if (rates) exchangeRates = rates;

  const currencySelect = document.getElementById("currency-select");
  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => {
      selectedCurrency = e.target.value;
      refreshAllViews();
    });
  }

  refreshAllViews();
}

initApp();
