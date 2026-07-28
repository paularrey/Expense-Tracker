import { useState, useEffect, useRef } from "react";
// Import utility helpers for local storage and API calls
import { getStoredTransactions, saveTransactions } from "./utils/storage";
import { fetchExchangeRates } from "./utils/api";

// Pre-defined monthly budget limits per category (stored in base USD)
const BUDGET_LIMITS = {
  "Rent & Housing": 3500,
  Food: 200,
  Utilities: 150,
  General: 300,
  Entertainment: 250,
};

function App() {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================

  // Transaction list state initialized with data loaded from localStorage
  const [transactions, setTransactions] = useState(() =>
    getStoredTransactions(),
  );

  // Exchange rate map fetched from open.er-api.com (base currency: USD)
  const [exchangeRates, setExchangeRates] = useState(null);

  // Form input states
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [currentType, setCurrentType] = useState("expense"); // 'expense' or 'income'
  const [editingId, setEditingId] = useState(null); // ID of transaction being edited (null when adding)

  // Filtering, sorting, & preference states
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [isDark, setIsDark] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // React refs to track the HTML canvas element and Chart instance forChart.js
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // ==========================================
  // 2. SIDE EFFECTS (useEffect Hooks)
  // ==========================================

  // Effect 1: Save transactions to localStorage whenever the list changes
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  // Effect 2: Fetch live exchange rates once when the component mounts
  useEffect(() => {
    async function loadRates() {
      const rates = await fetchExchangeRates();
      if (rates) {
        setExchangeRates(rates);
      }
    }
    loadRates();
  }, []);

  // Effect 3: Toggle dark mode class on document body when theme state changes
  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDark]);

  // ==========================================
  // 3. FINANCIAL & CURRENCY CALCULATIONS
  // ==========================================

  // Map currency keys to display symbols
  const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    XAF: "FR",
  };
  const symbol = currencySymbols[selectedCurrency] || "$";

  // Current multiplier rate relative to USD base (defaults to 1 if rates aren't fetched yet)
  const rate =
    exchangeRates && exchangeRates[selectedCurrency]
      ? exchangeRates[selectedCurrency]
      : 1;

  // Compute total balance, income, and expenses in BASE USD
  const rawBalance = transactions.reduce((acc, item) => acc + item.amount, 0);
  const rawIncome = transactions
    .filter((item) => item.amount > 0)
    .reduce((acc, item) => acc + item.amount, 0);
  const rawExpense = transactions
    .filter((item) => item.amount < 0)
    .reduce((acc, item) => acc + item.amount, 0);

  // Convert base USD amounts into selected active currency for UI rendering
  const displayBalance = rawBalance * rate;
  const displayIncome = rawIncome * rate;
  const displayExpense = Math.abs(rawExpense) * rate;

  // ==========================================
  // 4. CHART.JS RENDERING LOGIC
  // ==========================================

  useEffect(() => {
    // Ensure canvas exists and Chart.js script is loaded
    if (!chartRef.current || typeof window.Chart === "undefined") return;

    // Group expense amounts by category in base USD
    const expensesByCategory = {};
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const cat = t.category || "General";
        expensesByCategory[cat] =
          (expensesByCategory[cat] || 0) + Math.abs(t.amount);
      });

    const labels = Object.keys(expensesByCategory);
    // Multiply expense totals by active conversion rate for the chart display
    const data = Object.values(expensesByCategory).map((val) => val * rate);

    // Destroy existing chart instance before re-creating to prevent canvas reuse errors
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new window.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No Expenses"],
        datasets: [
          {
            data: data.length ? data : [1],
            backgroundColor: labels.length
              ? [
                  "#ff4d4d",
                  "#36a2eb",
                  "#ffce56",
                  "#4bc0c0",
                  "#9966ff",
                  "#ff9f40",
                ]
              : ["#2a2d3e"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: isDark ? "#fff" : "#000",
              font: { family: "Plus Jakarta Sans", size: 12 },
            },
          },
        },
      },
    });

    // Cleanup chart on component unmount
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [transactions, selectedCurrency, rate, isDark]);

  // ==========================================
  // 5. FORM & TRANSACTION ACTION HANDLERS
  // ==========================================

  // Submit handler for adding or updating a transaction
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!text.trim() || !amount) {
      alert("Please enter description and amount");
      return;
    }

    // Convert input amount back to USD base before saving to state
    const inputVal = parseFloat(amount);
    const usdAmount = Math.abs(inputVal) / rate;
    const finalAmount = currentType === "expense" ? -usdAmount : usdAmount;

    if (editingId) {
      // Edit Mode: update existing transaction by matching ID
      setTransactions(
        transactions.map((t) =>
          t.id === editingId
            ? { ...t, text: text.trim(), amount: finalAmount, category }
            : t,
        ),
      );
      setEditingId(null);
    } else {
      // Add Mode: append new transaction object
      const newTransaction = {
        id: Date.now(),
        text: text.trim(),
        amount: finalAmount,
        category,
      };
      setTransactions([newTransaction, ...transactions]);
    }

    // Reset form fields
    setText("");
    setAmount("");
  };

  // Pre-fill form inputs when edit button is clicked
  const handleEdit = (item) => {
    setEditingId(item.id);
    setText(item.text);
    // Convert base USD amount back to displayed currency amount for input box
    setAmount((Math.abs(item.amount) * rate).toFixed(2));
    setCategory(item.category || "General");
    setCurrentType(item.amount < 0 ? "expense" : "income");
  };

  // Delete transaction by ID
  const handleDelete = (id) => {
    setTransactions(transactions.filter((item) => item.id !== id));
  };

  // Clear all transactions with user confirmation
  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all transactions?")) {
      setTransactions([]);
    }
  };

  // Export current transactions array as CSV file
  // Export current transactions array as CSV file with S/N and Total Row
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to export");
      return;
    }

    // 1. Column Headers (S/N instead of raw ID)
    const headers = [
      "S/N",
      "Description",
      `Amount (${selectedCurrency})`,
      "Category",
    ];

    // 2. Data Rows with clean 1, 2, 3... Serial Numbers
    const rows = transactions.map((t, index) => {
      const convertedAmount = (t.amount * rate).toFixed(2);
      // Escape quotes in description to prevent CSV formatting errors
      const cleanText = t.text.replace(/"/g, '""');
      return [index + 1, `"${cleanText}"`, convertedAmount, `"${t.category}"`];
    });

    // 3. Calculate Total Balance across all transactions
    const totalAmount = transactions
      .reduce((sum, t) => sum + t.amount * rate, 0)
      .toFixed(2);

    // 4. Create the Total Row at the bottom
    const totalRow = ["", '"TOTAL"', totalAmount, ""];

    // 5. Build CSV File String
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
        totalRow.join(","),
      ].join("\n");

    // 6. Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "smart_budget_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // 6. FILTERING & SORTING TRANSACTIONS
  // ==========================================

  const filteredTransactions = transactions
    .filter((t) => {
      const matchesSearch = t.text
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        filterCategory === "All" || t.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return b.id - a.id;
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "highest") return Math.abs(b.amount) - Math.abs(a.amount);
      if (sortBy === "lowest") return Math.abs(a.amount) - Math.abs(b.amount);
      return 0;
    });

  // ==========================================
  // 7. COMPONENT RENDER (JSX)
  // ==========================================

  return (
    <div className="dashboard-container">
      {/* APP HEADER */}
      <header className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h4 m-0 fw-bold">Smart Budget</h1>
          <p className="subtitle m-0">Track, analyze, & optimize cash flow</p>
        </div>

        {/* THEME TOGGLE & CURRENCY SELECTOR */}
        <div className="d-flex align-items-center gap-3">
          <div className="theme-switch-wrapper">
            <label className="theme-switch">
              <input
                type="checkbox"
                id="theme-toggle"
                checked={isDark}
                onChange={(e) => setIsDark(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <select
            id="currency-select"
            className="form-select form-select-sm"
            style={{ width: "auto" }}
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="NGN">NGN (₦)</option>
            <option value="XAF">XAF (FR)</option>
          </select>
        </div>
      </header>

      {/* TOTAL BALANCE DISPLAY */}
      <section className="card-box balance-card text-center">
        <h2 className="text-uppercase tracking-wider">Total Balance</h2>
        <h1 className="fw-bold">
          {symbol}
          {displayBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h1>
      </section>

      {/* TOTAL INCOME & EXPENSE SUMMARY */}
      <section className="card-box">
        <div className="stats-grid">
          <div className="stat-box text-center">
            <h3>TOTAL INCOME</h3>
            <p className="money plus fw-bold">
              {symbol}
              {displayIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div
            className="stat-box text-center"
            style={{ borderLeft: "1px solid var(--border-color)" }}
          >
            <h3>TOTAL EXPENSES</h3>
            <p className="money minus fw-bold">
              {symbol}
              {displayExpense.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* ADD / EDIT TRANSACTION FORM */}
      <section className="card-box">
        <h3 className="h6 mb-3 fw-bold">
          {editingId ? "Edit Transaction" : "Add New Transaction"}
        </h3>

        <form onSubmit={handleAddTransaction}>
          <div className="mb-3">
            <label className="form-label">Transaction Type</label>
            <div className="type-toggle-group">
              <button
                type="button"
                className={`type-toggle-btn ${
                  currentType === "expense" ? "active-expense" : ""
                }`}
                onClick={() => setCurrentType("expense")}
              >
                💸 Expense
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${
                  currentType === "income" ? "active-income" : ""
                }`}
                onClick={() => setCurrentType("income")}
              >
                💰 Income
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Netflix, Groceries..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-12 col-sm-6">
              <label className="form-label">Amount ({selectedCurrency})</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="col-12 col-sm-6">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Food">Food</option>
                <option value="Rent & Housing">Rent & Housing</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Salary">Salary</option>
              </select>
            </div>
          </div>

          <button className="btn-submit" type="submit">
            {editingId ? "Update Transaction" : "Add Transaction"}
          </button>
        </form>
      </section>

      {/* EXPENSE BREAKDOWN CHART */}
      <section className="card-box">
        <h3 className="h6 mb-3 text-center fw-bold">Expense Breakdown</h3>
        <div style={{ height: "220px", position: "relative" }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </section>

      {/* TRANSACTION HISTORY WITH SEARCH & FILTERS */}
      <section className="card-box">
        <h3 className="h6 mb-3 fw-bold">Transaction History</h3>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="row g-2 mb-3">
          <div className="col-12">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="🔎 Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-6">
            <select
              className="form-select form-select-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="General">General</option>
              <option value="Food">Food</option>
              <option value="Rent & Housing">Rent & Housing</option>
              <option value="Utilities">Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Salary">Salary</option>
            </select>
          </div>
          <div className="col-6">
            <select
              className="form-select form-select-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* TRANSACTION LIST */}
        <ul className="list">
          {filteredTransactions.length === 0 ? (
            <li
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "16px",
                justifyContent: "center",
                width: "100%",
              }}
            >
              No transactions found 🚀
            </li>
          ) : (
            filteredTransactions.map((item) => {
              const itemConvertedAmount = Math.abs(item.amount) * rate;
              const isExpense = item.amount < 0;

              return (
                <li key={item.id} className={isExpense ? "minus" : "plus"}>
                  <div className="transaction-info">
                    <div className="transaction-title fw-bold">{item.text}</div>
                    <div className="transaction-cat">{item.category}</div>
                  </div>

                  <div className="transaction-right d-flex align-items-center gap-2">
                    <span
                      className="fw-bold"
                      style={{
                        fontSize: "0.95rem",
                        color: isExpense
                          ? "var(--expense-color)"
                          : "var(--income-color)",
                      }}
                    >
                      {isExpense ? "-" : "+"}
                      {symbol}
                      {itemConvertedAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>

                    {/* EDIT & DELETE ACTION BUTTONS */}
                    <button
                      className="btn-action edit-btn"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>

                    <button
                      className="btn-action delete-btn"
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <i className="bi bi-trash3"></i>
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {/* ACTION BUTTONS: EXPORT CSV & CLEAR ALL */}
        <div className="d-flex gap-2 mt-3">
          <button
            className="btn btn-sm btn-outline-primary flex-grow-1 fw-bold"
            onClick={handleExportCSV}
          >
            <i className="bi bi-download me-1"></i> Export CSV
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger flex-grow-1 fw-bold"
            onClick={handleClearAll}
          >
            <i className="bi bi-trash3 me-1"></i> Clear All
          </button>
        </div>
      </section>

      {/* CATEGORY BUDGET PROGRESS BARS */}
      <section className="card-box">
        <h3 className="h6 mb-3 fw-bold">Category Budgets</h3>
        <div id="budgets-container">
          {Object.entries(BUDGET_LIMITS).map(([catName, usdLimit]) => {
            // Calculate expenses spent under this specific category
            const rawSpent = transactions
              .filter((t) => t.amount < 0 && t.category === catName)
              .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            // Convert spent & budget limit amounts to displayed currency
            const displaySpent = rawSpent * rate;
            const displayLimit = usdLimit * rate;
            const percentage = Math.min(
              Math.round((rawSpent / usdLimit) * 100),
              100,
            );
            const isOver = rawSpent > usdLimit;
            const overAmount = (rawSpent - usdLimit) * rate;

            return (
              <div key={catName} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold" style={{ fontSize: "0.9rem" }}>
                    {catName}
                  </span>
                  <span style={{ fontSize: "0.85rem" }}>
                    {symbol}
                    {displaySpent.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    / {symbol}
                    {displayLimit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* PROGRESS BAR */}
                <div
                  className="progress"
                  style={{
                    height: "6px",
                    backgroundColor: "var(--border-color)",
                  }}
                >
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: isOver
                        ? "#ff4d4d"
                        : percentage > 75
                          ? "#ff9f40"
                          : "#2ec4b6",
                    }}
                  ></div>
                </div>

                {/* BUDGET SPENT % OR OVER-LIMIT WARNING */}
                <div
                  className="mt-1"
                  style={{
                    fontSize: "0.75rem",
                    color: isOver ? "#ff4d4d" : "var(--income-color)",
                  }}
                >
                  {isOver ? (
                    <span>
                      ⚠️ Over limit by {symbol}
                      {overAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      !
                    </span>
                  ) : (
                    <span>{percentage}% spent</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default App;
