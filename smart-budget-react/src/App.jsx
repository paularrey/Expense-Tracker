// 1. Core React hooks for state management, side effects, and DOM references
import { useState, useEffect, useRef } from "react";

// 2. Lucide UI icons for buttons, balance visibility, auth, and badges
import {
  Eye,
  EyeOff,
  Plus,
  Wallet,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  Download,
  Trash2,
  SlidersHorizontal,
  Activity,
  ChevronDown,
  ChevronUp,
  PieChart,
  Target,
  LogOut,
  User,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

// 3. Storage utilities to load and save user transaction data locally
import { getStoredTransactions, saveTransactions } from "./utils/storage";

// 4. API utility to fetch live foreign exchange conversion rates
import { fetchExchangeRates } from "./utils/api";

const BUDGET_LIMITS = {
  "Rent & Housing": 3500,
  Food: 200,
  Utilities: 150,
  General: 300,
  Entertainment: 250,
};

// --- BRAND LOGO COMPONENT ---
function BrandLogo({ size = "md" }) {
  const iconSize = size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const boxSize = size === "lg" ? "p-3.5 rounded-2xl" : "p-2.5 rounded-xl";

  return (
    <div
      className={`bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 ${boxSize} flex items-center justify-center shrink-0`}
    >
      <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("smart_budget_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  // --- APP DASHBOARD STATE ---
  const [hideBalance, setHideBalance] = useState(() => {
    return localStorage.getItem("hideBalance") === "true";
  });

  const [isDark, setIsDark] = useState(true);
  const [showPulseDetails, setShowPulseDetails] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Collapsible sidebar accordion states
  const [showChartSection, setShowChartSection] = useState(true);
  const [showBudgetsSection, setShowBudgetsSection] = useState(true);

  const [transactions, setTransactions] = useState(() =>
    getStoredTransactions(),
  );
  const [exchangeRates, setExchangeRates] = useState(null);

  // Form input states
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [currentType, setCurrentType] = useState("expense");
  const [editingId, setEditingId] = useState(null);

  // Filtering & sorting states
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // React refs
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // --- SIDE EFFECTS ---
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    async function loadRates() {
      const rates = await fetchExchangeRates();
      if (rates) setExchangeRates(rates);
    }
    loadRates();
  }, []);

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError("");

    if (!authEmail || !authPassword) {
      setAuthError("Please fill in all required fields.");
      return;
    }

    if (authMode === "signup") {
      if (!authName) {
        setAuthError("Please enter your name.");
        return;
      }

      const newUser = { name: authName.trim(), email: authEmail.trim() };
      localStorage.setItem("smart_budget_user", JSON.stringify(newUser));
      setCurrentUser(newUser);
    } else {
      // Simulate Login Verification
      const existingUser = {
        name: authName.trim() || authEmail.split("@")[0],
        email: authEmail.trim(),
      };
      localStorage.setItem("smart_budget_user", JSON.stringify(existingUser));
      setCurrentUser(existingUser);
    }

    // Reset Auth Form
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
  };

  const handleLogout = () => {
    localStorage.removeItem("smart_budget_user");
    setCurrentUser(null);
  };

  const togglePrivacy = () => {
    setHideBalance((prev) => {
      const newValue = !prev;
      localStorage.setItem("hideBalance", String(newValue));
      return newValue;
    });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleDashboardClick = (e) => {
    e.preventDefault();
    setSearchTerm("");
    setFilterCategory("All");
    setSortBy("newest");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- FINANCIAL CALCULATIONS ---
  const currencySymbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    XAF: "FR",
  };
  const symbol = currencySymbols[selectedCurrency] || "$";
  const rate =
    exchangeRates && exchangeRates[selectedCurrency]
      ? exchangeRates[selectedCurrency]
      : 1;

  const rawBalance = transactions.reduce((acc, item) => acc + item.amount, 0);
  const rawIncome = transactions
    .filter((item) => item.amount > 0)
    .reduce((acc, item) => acc + item.amount, 0);
  const rawExpense = transactions
    .filter((item) => item.amount < 0)
    .reduce((acc, item) => acc + item.amount, 0);

  const displayBalance = rawBalance * rate;
  const displayIncome = rawIncome * rate;
  const displayExpense = Math.abs(rawExpense) * rate;

  // --- CHART RENDERING ---
  useEffect(() => {
    if (
      !currentUser ||
      !showChartSection ||
      !chartRef.current ||
      typeof window.Chart === "undefined"
    )
      return;

    const expensesByCategory = {};
    transactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const cat = t.category || "General";
        expensesByCategory[cat] =
          (expensesByCategory[cat] || 0) + Math.abs(t.amount);
      });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory).map((val) => val * rate);

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
                  "#f43f5e",
                  "#06b6d4",
                  "#eab308",
                  "#10b981",
                  "#a855f7",
                  "#f97316",
                ]
              : [isDark ? "#334155" : "#e2e8f0"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: isDark ? "#94a3b8" : "#475569",
              font: { family: "sans-serif", size: 11 },
              boxWidth: 10,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [
    currentUser,
    transactions,
    selectedCurrency,
    rate,
    isDark,
    showChartSection,
  ]);

  // --- ACTION HANDLERS ---
  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!text.trim() || !amount) {
      alert("Please enter description and amount");
      return;
    }

    const inputVal = parseFloat(amount);
    const usdAmount = Math.abs(inputVal) / rate;
    const finalAmount = currentType === "expense" ? -usdAmount : usdAmount;

    if (editingId) {
      setTransactions(
        transactions.map((t) =>
          t.id === editingId
            ? { ...t, text: text.trim(), amount: finalAmount, category }
            : t,
        ),
      );
      setEditingId(null);
    } else {
      const newTransaction = {
        id: Date.now(),
        text: text.trim(),
        amount: finalAmount,
        category,
      };
      setTransactions([newTransaction, ...transactions]);
    }

    setText("");
    setAmount("");
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setText(item.text);
    setAmount((Math.abs(item.amount) * rate).toFixed(2));
    setCategory(item.category || "General");
    setCurrentType(item.amount < 0 ? "expense" : "income");
  };

  const handleDelete = (id) => {
    setTransactions(transactions.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all transactions?")) {
      setTransactions([]);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("No transactions to export");
      return;
    }

    const headers = [
      "S/N",
      "Description",
      `Amount (${selectedCurrency})`,
      "Category",
    ];
    const rows = transactions.map((t, index) => {
      const convertedAmount = (t.amount * rate).toFixed(2);
      const cleanText = t.text.replace(/"/g, '""');
      return [index + 1, `"${cleanText}"`, convertedAmount, `"${t.category}"`];
    });

    const totalAmount = transactions
      .reduce((sum, t) => sum + t.amount * rate, 0)
      .toFixed(2);
    const totalRow = ["", '"TOTAL"', totalAmount, ""];

    const csvString = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      totalRow.join(","),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "smart_budget_transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- FILTER & SORT ---
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

  // Dynamic Theme Classes
  const bgMain = isDark
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";
  const bgSidebar = isDark
    ? "bg-slate-900/60 border-slate-800/60"
    : "bg-white/80 border-slate-200/80";
  const borderTone = isDark ? "border-slate-800/60" : "border-slate-200";
  const subtleText = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark
    ? "bg-slate-900/80 border-slate-800 focus:border-cyan-500"
    : "bg-white border-slate-200 focus:border-indigo-500";

  // ==========================================
  // VIEW 1: AUTHENTICATION SCREEN (IF LOGGED OUT)
  // ==========================================
  if (!currentUser) {
    return (
      <div
        className={`min-h-screen flex flex-col justify-center items-center p-6 ${bgMain} relative overflow-hidden`}
      >
        {/* Ambient Glow Effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Logo Branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <BrandLogo size="lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Smart Budget
              </h1>
              <p className={`text-xs ${subtleText} mt-1`}>
                Next-Gen Financial Intelligence Workspace
              </p>
            </div>
          </div>

          {/* Auth Card */}
          <div
            className={`p-8 rounded-2xl border ${borderTone} ${isDark ? "bg-slate-900/70 backdrop-blur-xl shadow-2xl" : "bg-white shadow-xl"} space-y-6`}
          >
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-800/40 pb-2">
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition cursor-pointer ${
                  authMode === "login"
                    ? "border-b-2 border-cyan-400 text-cyan-400"
                    : `${subtleText} hover:text-slate-200`
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition cursor-pointer ${
                  authMode === "signup"
                    ? "border-b-2 border-cyan-400 text-cyan-400"
                    : `${subtleText} hover:text-slate-200`
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "signup" && (
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${subtleText}`}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      className={`w-full text-xs rounded-xl pl-10 pr-4 py-3 border focus:outline-none ${inputBg}`}
                      placeholder="e.g. Alex Morgan"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${subtleText}`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    className={`w-full text-xs rounded-xl pl-10 pr-4 py-3 border focus:outline-none ${inputBg}`}
                    placeholder="alex@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${subtleText}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    className={`w-full text-xs rounded-xl pl-10 pr-4 py-3 border focus:outline-none ${inputBg}`}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>
                  {authMode === "login" ? "Enter Workspace" : "Get Started Now"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div
              className={`flex items-center justify-center gap-1.5 text-[11px] ${subtleText} pt-2`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Encrypted local workspace session</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MAIN WORKSPACE (IF LOGGED IN)
  // ==========================================
  return (
    <div
      className={`min-h-screen flex flex-col lg:flex-row font-sans transition-colors duration-200 ${bgMain}`}
    >
      {/* --- SIDEBAR PANEL --- */}
      <aside
        className={`w-full lg:w-64 ${bgSidebar} border-b lg:border-b-0 lg:border-r p-6 flex flex-col justify-between shrink-0`}
      >
        <div className="space-y-8">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div>
              <h1 className="font-bold text-base tracking-wide">
                Smart Budget
              </h1>
              <p className={`text-xs ${subtleText}`}>Workspace</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={handleDashboardClick}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer ${
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              }`}
            >
              <Wallet className="w-4 h-4" />
              Dashboard
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: User Profile, Theme Switcher & Logout */}
        <div className={`pt-4 border-t ${borderTone} space-y-4`}>
          {/* Logged In User Profile Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs uppercase">
                {currentUser.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div>
                <p className="text-xs font-bold leading-none">
                  {currentUser.name || "User"}
                </p>
                <p
                  className={`text-[10px] ${subtleText} mt-0.5 truncate max-w-[100px]`}
                >
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`p-2 rounded-xl text-slate-400 hover:text-rose-400 transition cursor-pointer`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div
            className={`flex items-center justify-between pt-2 border-t ${borderTone}`}
          >
            <span className={`text-xs font-medium ${subtleText}`}>Theme</span>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border ${borderTone} transition cursor-pointer flex items-center gap-2 text-xs font-medium`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN UNIFIED WORKSPACE --- */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto max-w-5xl w-full">
        {/* TOP HEADER */}
        <header
          className={`flex items-center justify-between gap-4 pb-6 border-b ${borderTone}`}
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
            <p className={`text-xs ${subtleText}`}>
              Track, analyze, & manage cash flow effortlessly
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Actions Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl border ${borderTone} transition cursor-pointer`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Actions
                <ChevronDown className="w-3 h-3" />
              </button>

              {showActionsMenu && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-xl border ${borderTone} ${isDark ? "bg-slate-900 shadow-2xl" : "bg-white shadow-xl"} py-1 z-50`}
                >
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-700"}`}
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-500" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      handleClearAll();
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition ${isDark ? "hover:bg-slate-800 text-rose-400" : "hover:bg-slate-50 text-rose-600"}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Data
                  </button>
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className={`text-xs font-semibold rounded-xl px-3 py-2 border ${borderTone} bg-transparent focus:outline-none cursor-pointer`}
            >
              <option
                value="USD"
                className={isDark ? "bg-slate-900" : "bg-white"}
              >
                USD ($)
              </option>
              <option
                value="EUR"
                className={isDark ? "bg-slate-900" : "bg-white"}
              >
                EUR (€)
              </option>
              <option
                value="GBP"
                className={isDark ? "bg-slate-900" : "bg-white"}
              >
                GBP (£)
              </option>
              <option
                value="NGN"
                className={isDark ? "bg-slate-900" : "bg-white"}
              >
                NGN (₦)
              </option>
              <option
                value="XAF"
                className={isDark ? "bg-slate-900" : "bg-white"}
              >
                XAF (FR)
              </option>
            </select>
          </div>
        </header>

        {/* UNIFIED HERO FINANCIAL ROW */}
        <section className={`pb-6 border-b ${borderTone} space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${subtleText}`}
              >
                Total Net Balance
              </span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-4xl font-extrabold tracking-tight">
                  {hideBalance
                    ? "••••••••"
                    : `${symbol}${displayBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </h2>
                <button
                  onClick={togglePrivacy}
                  className={`p-2 rounded-xl text-slate-400 hover:text-cyan-400 transition cursor-pointer`}
                  title={hideBalance ? "Show balance" : "Hide balance"}
                >
                  {hideBalance ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowPulseDetails(!showPulseDetails)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${borderTone} transition cursor-pointer text-xs font-semibold`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>{showPulseDetails ? "Hide Pulse" : "Financial Pulse"}</span>
            </button>
          </div>

          {showPulseDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div
                className={`p-4 rounded-xl border ${borderTone} ${isDark ? "bg-slate-900/40" : "bg-white"}`}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 mb-1">
                  <TrendingUp className="w-4 h-4" /> Total Income
                </div>
                <p className="text-xl font-bold">
                  {symbol}
                  {displayIncome.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div
                className={`p-4 rounded-xl border ${borderTone} ${isDark ? "bg-slate-900/40" : "bg-white"}`}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-rose-500 mb-1">
                  <TrendingDown className="w-4 h-4" /> Total Expenses
                </div>
                <p className="text-xl font-bold">
                  {symbol}
                  {displayExpense.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* SEAMLESS TRANSACTION ENTRY FORM */}
        <section className={`pb-8 border-b ${borderTone} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-400">
              {editingId ? "Edit Entry" : "New Entry"}
            </h3>
            <div className="flex gap-1 p-1 rounded-xl bg-slate-800/20 border border-slate-800/40">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  currentType === "expense"
                    ? "bg-rose-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setCurrentType("expense")}
              >
                Expense
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  currentType === "income"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setCurrentType("income")}
              >
                Income
              </button>
            </div>
          </div>

          <form
            onSubmit={handleAddTransaction}
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="sm:col-span-2">
              <input
                type="text"
                className={`w-full text-xs rounded-xl p-3 border focus:outline-none ${inputBg}`}
                placeholder="Description (e.g. Groceries, Rent)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div>
              <input
                type="number"
                step="0.01"
                className={`w-full text-xs rounded-xl p-3 border focus:outline-none ${inputBg}`}
                placeholder={`Amount (${symbol})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <select
                className={`w-full text-xs rounded-xl p-3 border focus:outline-none cursor-pointer ${inputBg}`}
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

            <div className="sm:col-span-4">
              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {editingId ? "Update Transaction" : "Save Transaction"}
              </button>
            </div>
          </form>
        </section>

        {/* SEAMLESS TRANSACTION STREAM & CONTROLS */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-400">
              Activity
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${inputBg}`}
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <select
                className={`text-xs rounded-xl px-3 py-2 border focus:outline-none cursor-pointer ${inputBg}`}
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

              <select
                className={`text-xs rounded-xl px-3 py-2 border focus:outline-none cursor-pointer ${inputBg}`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest</option>
                <option value="lowest">Lowest</option>
              </select>
            </div>
          </div>

          <ul className={`divide-y ${borderTone}`}>
            {filteredTransactions.length === 0 ? (
              <li className={`py-8 text-center text-xs ${subtleText}`}>
                No transactions match your query
              </li>
            ) : (
              filteredTransactions.map((item) => {
                const itemConvertedAmount = Math.abs(item.amount) * rate;
                const isExpense = item.amount < 0;

                return (
                  <li
                    key={item.id}
                    className="py-3.5 flex items-center justify-between group transition"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{item.text}</p>
                      <p className={`text-xs ${subtleText}`}>{item.category}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm font-bold ${isExpense ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {isExpense ? "-" : "+"}
                        {symbol}
                        {itemConvertedAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={() => handleEdit(item)}
                          className={`p-1.5 rounded-lg ${subtleText} hover:text-cyan-400 transition cursor-pointer`}
                        >
                          <i className="bi bi-pencil text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className={`p-1.5 rounded-lg ${subtleText} hover:text-rose-400 transition cursor-pointer`}
                        >
                          <i className="bi bi-trash3 text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </main>

      {/* --- RIGHT TELEMETRY & ANALYTICS SIDEBAR --- */}
      <aside
        className={`w-full lg:w-80 ${bgSidebar} border-t lg:border-t-0 lg:border-l p-6 shrink-0 space-y-6`}
      >
        {/* COLLAPSIBLE 1: Expense Breakdown Chart */}
        <div className={`border-b ${borderTone} pb-4`}>
          <button
            onClick={() => setShowChartSection(!showChartSection)}
            className="w-full flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition">
                Expense Breakdown
              </h3>
            </div>
            {showChartSection ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showChartSection && (
            <div className="h-44 relative mt-4 transition-all duration-300">
              <canvas ref={chartRef}></canvas>
            </div>
          )}
        </div>

        {/* COLLAPSIBLE 2: Category Budgets */}
        <div>
          <button
            onClick={() => setShowBudgetsSection(!showBudgetsSection)}
            className="w-full flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition">
                Category Budgets
              </h3>
            </div>
            {showBudgetsSection ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showBudgetsSection && (
            <div className="space-y-4 mt-4 transition-all duration-300">
              {Object.entries(BUDGET_LIMITS).map(([catName, usdLimit]) => {
                const rawSpent = transactions
                  .filter((t) => t.amount < 0 && t.category === catName)
                  .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                const displaySpent = rawSpent * rate;
                const displayLimit = usdLimit * rate;
                const percentage = Math.min(
                  Math.round((rawSpent / usdLimit) * 100),
                  100,
                );
                const isOver = rawSpent > usdLimit;

                return (
                  <div key={catName} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold">{catName}</span>
                      <span className={subtleText}>
                        {symbol}
                        {displaySpent.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        / {symbol}
                        {displayLimit.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>

                    <div
                      className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? "bg-rose-500"
                            : percentage > 75
                              ? "bg-amber-500"
                              : "bg-cyan-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default App;
