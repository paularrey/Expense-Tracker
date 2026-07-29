// 1. Core React hooks
import { useState, useEffect, useRef } from "react";

// 2. Lucide UI icons
import {
  Eye,
  EyeOff,
  Plus,
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
  Menu,
  X,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

// 3. Utilities
import { getStoredTransactions, saveTransactions } from "./utils/storage";
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
  const boxSize = size === "lg" ? "p-3 rounded-2xl" : "p-2 rounded-xl";

  return (
    <div
      className={`bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 ${boxSize} flex items-center justify-center shrink-0`}
    >
      <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("smart_budget_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState("login"); // "login" | "signup" | "forgot" | "reset"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCodeInput, setResetCodeInput] = useState("");
  const [activeResetCode, setActiveResetCode] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  // --- MOBILE SIDEBAR / MENU STATE ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- APP DASHBOARD STATE ---
  const [hideBalance, setHideBalance] = useState(() => {
    return localStorage.getItem("hideBalance") === "true";
  });

  const [isDark, setIsDark] = useState(true);
  const [showPulseDetails, setShowPulseDetails] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Accordions closed by default
  const [showChartSection, setShowChartSection] = useState(false);
  const [showBudgetsSection, setShowBudgetsSection] = useState(false);

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

  // Chart refs
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Persistent storage for registered user database
  const getRegisteredUsers = () => {
    return JSON.parse(localStorage.getItem("smart_budget_users_db") || "[]");
  };

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
    setAuthMessage("");

    const registeredUsers = getRegisteredUsers();
    const cleanEmail = authEmail.trim().toLowerCase();

    // 1. FORGOT PASSWORD FLOW
    if (authMode === "forgot") {
      if (!cleanEmail) {
        setAuthError("Please enter your email address.");
        return;
      }
      const existingUser = registeredUsers.find((u) => u.email === cleanEmail);
      if (!existingUser) {
        setAuthError("No account found with this email address.");
        return;
      }

      const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
      setActiveResetCode(mockCode);
      setAuthMode("reset");
      setAuthMessage(`Password reset code sent! (Demo Code: ${mockCode})`);
      return;
    }

    // 2. COMPLETE PASSWORD RESET
    if (authMode === "reset") {
      if (!resetCodeInput.trim()) {
        setAuthError("Please enter the reset code.");
        return;
      }
      if (resetCodeInput.trim() !== activeResetCode) {
        setAuthError(
          "Invalid reset code. Check the code provided in the message.",
        );
        return;
      }
      if (!newPassword || newPassword.length < 4) {
        setAuthError("Password must be at least 4 characters long.");
        return;
      }

      const updatedUsers = registeredUsers.map((u) => {
        if (u.email === cleanEmail) {
          return { ...u, password: newPassword };
        }
        return u;
      });

      localStorage.setItem(
        "smart_budget_users_db",
        JSON.stringify(updatedUsers),
      );
      setAuthMode("login");
      setAuthMessage(
        "Password updated successfully! Please sign in with your new password.",
      );
      setAuthPassword("");
      setNewPassword("");
      setResetCodeInput("");
      return;
    }

    // 3. SIGN UP FLOW
    if (authMode === "signup") {
      if (!authName || !cleanEmail || !authPassword) {
        setAuthError("Please fill in all required fields.");
        return;
      }

      const existingUser = registeredUsers.find((u) => u.email === cleanEmail);
      if (existingUser) {
        setAuthError(
          "An account with this email already exists. Please sign in.",
        );
        return;
      }

      const newUser = {
        name: authName.trim(),
        email: cleanEmail,
        password: authPassword,
      };

      const updatedUsers = [...registeredUsers, newUser];
      localStorage.setItem(
        "smart_budget_users_db",
        JSON.stringify(updatedUsers),
      );
      localStorage.setItem(
        "smart_budget_current_user",
        JSON.stringify(newUser),
      );

      setCurrentUser(newUser);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      return;
    }

    // 4. LOG IN FLOW
    if (authMode === "login") {
      if (!cleanEmail || !authPassword) {
        setAuthError("Please enter both email and password.");
        return;
      }

      const existingUser = registeredUsers.find((u) => u.email === cleanEmail);

      if (!existingUser) {
        setAuthError("Invalid email or incorrect password!");
        return;
      }

      if (existingUser.password !== authPassword) {
        setAuthError("Invalid email or incorrect password!");
        return;
      }

      localStorage.setItem(
        "smart_budget_current_user",
        JSON.stringify(existingUser),
      );
      setCurrentUser(existingUser);
      setAuthEmail("");
      setAuthPassword("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("smart_budget_current_user");
    setCurrentUser(null);
    setMobileMenuOpen(false);
  };

  const togglePrivacy = () => {
    setHideBalance((prev) => {
      const newValue = !prev;
      localStorage.setItem("hideBalance", String(newValue));
      return newValue;
    });
  };

  const toggleTheme = () => setIsDark(!isDark);

  // --- FINANCIAL CALCULATIONS ---
  const currencySymbols = { USD: "$", EUR: "€", GBP: "£", NGN: "₦", XAF: "FR" };
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
                  "#6366f1",
                  "#06b6d4",
                  "#f59e0b",
                  "#10b981",
                  "#a855f7",
                  "#f97316",
                ]
              : [isDark ? "#334155" : "#cbd5e1"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        hover: { mode: null },
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: isDark ? "#94a3b8" : "#334155",
              font: { family: "sans-serif", size: 11, weight: "600" },
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
      setTransactions([
        { id: Date.now(), text: text.trim(), amount: finalAmount, category },
        ...transactions,
      ]);
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

  const handleDelete = (id) =>
    setTransactions(transactions.filter((item) => item.id !== id));

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all transactions?")) {
      setTransactions([]);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return alert("No transactions to export");

    const headers = [
      "S/N",
      "Description",
      `Amount (${selectedCurrency})`,
      "Category",
    ];
    const rows = transactions.map((t, index) => [
      index + 1,
      `"${t.text.replace(/"/g, '""')}"`,
      (t.amount * rate).toFixed(2),
      `"${t.category}"`,
    ]);

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
      if (sortBy === "lowest") return Math.abs(a.amount) - Math.abs(a.amount);
      return 0;
    });

  // --- UPGRADED HIGH-CONTRAST DYNAMIC THEME SYSTEM ---
  const bgMain = isDark
    ? "bg-[#070b14] text-slate-100"
    : "bg-[#f1f5f9] text-slate-900";
  const bgSidebar = isDark
    ? "bg-[#0a0f1d] border-slate-800/80"
    : "bg-white border-slate-200/90 shadow-sm";
  const borderTone = isDark ? "border-slate-800/80" : "border-slate-200/90";
  const subtleText = isDark ? "text-slate-400" : "text-slate-600";

  const inputBg = isDark
    ? "bg-slate-900/90 border-slate-800 focus:border-cyan-500 text-white placeholder:text-slate-500"
    : "bg-white border-slate-300 focus:border-indigo-600 text-slate-900 placeholder:text-slate-400 shadow-sm";

  const primaryBtn = isDark
    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
    : "bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20";

  // ==========================================
  // VIEW 1: AUTHENTICATION SCREEN
  // ==========================================
  if (!currentUser) {
    return (
      <div
        className={`min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 ${bgMain} relative overflow-x-hidden select-none`}
      >
        <div
          className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${isDark ? "bg-cyan-500/10" : "bg-indigo-500/15"}`}
        ></div>
        <div
          className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none ${isDark ? "bg-blue-600/10" : "bg-blue-500/15"}`}
        ></div>

        <div className="w-full max-w-md space-y-6 relative z-10 my-auto">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <BrandLogo size="lg" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Smart Budget
              </h1>
              <p className={`text-xs ${subtleText} mt-0.5 font-medium`}>
                Next-Gen Financial Intelligence Workspace
              </p>
            </div>
          </div>

          <div
            className={`p-6 sm:p-8 rounded-3xl border ${borderTone} ${isDark ? "bg-[#0a0f1d] shadow-2xl" : "bg-white shadow-2xl shadow-indigo-500/5"} space-y-5`}
          >
            {/* Auth Mode Tabs */}
            <div className={`flex border-b ${borderTone} pb-2`}>
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthMessage("");
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition cursor-pointer ${
                  authMode === "login"
                    ? isDark
                      ? "border-b-2 border-cyan-400 text-cyan-400"
                      : "border-b-2 border-indigo-600 text-indigo-600"
                    : `${subtleText} hover:text-slate-900`
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                  setAuthMessage("");
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold transition cursor-pointer ${
                  authMode === "signup"
                    ? isDark
                      ? "border-b-2 border-cyan-400 text-cyan-400"
                      : "border-b-2 border-indigo-600 text-indigo-600"
                    : `${subtleText} hover:text-slate-900`
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {authError}
              </div>
            )}

            {authMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                {authMessage}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === "signup" && (
                <div className="space-y-1">
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

              {(authMode === "login" ||
                authMode === "signup" ||
                authMode === "forgot") && (
                <div className="space-y-1">
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
              )}

              {/* RESET CODE STEP */}
              {authMode === "reset" && (
                <>
                  <div className="space-y-1">
                    <label className={`text-xs font-semibold ${subtleText}`}>
                      Reset Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        className={`w-full text-xs rounded-xl pl-10 pr-4 py-3 border focus:outline-none ${inputBg}`}
                        placeholder="Enter 6-digit code"
                        value={resetCodeInput}
                        onChange={(e) => setResetCodeInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-semibold ${subtleText}`}>
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full text-xs rounded-xl pl-10 pr-10 py-3 border focus:outline-none ${inputBg}`}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {(authMode === "login" || authMode === "signup") && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold ${subtleText}`}>
                      Password
                    </label>
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("forgot");
                          setAuthError("");
                          setAuthMessage("");
                        }}
                        className={`text-[11px] font-bold hover:underline cursor-pointer ${
                          isDark ? "text-cyan-400" : "text-indigo-600"
                        }`}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`w-full text-xs rounded-xl pl-10 pr-10 py-3 border focus:outline-none ${inputBg}`}
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`w-full text-xs py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-2 ${primaryBtn}`}
              >
                <span>
                  {authMode === "login" && "Enter Workspace"}
                  {authMode === "signup" && "Get Started Now"}
                  {authMode === "forgot" && "Request Reset Code"}
                  {authMode === "reset" && "Update Password & Log In"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {(authMode === "forgot" || authMode === "reset") && (
              <div className="text-center pt-1">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                  className={`text-xs font-bold hover:underline cursor-pointer ${
                    isDark ? "text-cyan-400" : "text-indigo-600"
                  }`}
                >
                  Return to Sign In
                </button>
              </div>
            )}

            <div
              className={`flex items-center justify-center gap-1.5 text-[11px] ${subtleText} pt-1`}
            >
              <ShieldCheck
                className={`w-3.5 h-3.5 ${isDark ? "text-cyan-400" : "text-indigo-600"}`}
              />
              <span>Encrypted local workspace session</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MAIN DASHBOARD WORKSPACE
  // ==========================================
  return (
    <div
      className={`min-h-screen w-full flex flex-col lg:flex-row font-sans ${bgMain}`}
    >
      {/* --- FACEBOOK-STYLE MOBILE HEADER & NAV DRAWER --- */}
      <header
        className={`lg:hidden w-full ${bgSidebar} border-b ${borderTone} sticky top-0 z-50`}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <span className="font-extrabold text-base tracking-tight">
              Smart Budget
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full border ${borderTone} ${
                isDark
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-100"
              } transition cursor-pointer`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-full border ${borderTone} ${
                isDark
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-100"
              } transition cursor-pointer`}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            className={`p-4 border-t ${borderTone} ${isDark ? "bg-[#0d1326]" : "bg-slate-50"} space-y-4 shadow-2xl`}
          >
            <div
              className={`p-3.5 rounded-2xl border ${borderTone} ${isDark ? "bg-[#0a0f1d]" : "bg-white shadow-sm"} flex items-center gap-3`}
            >
              <div
                className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm border ${
                  isDark
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                    : "bg-indigo-50 text-indigo-600 border-indigo-200"
                }`}
              >
                {currentUser?.name
                  ? currentUser.name.charAt(0).toUpperCase()
                  : "U"}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm leading-tight truncate">
                  {currentUser?.name || "Active Workspace"}
                </p>
                <p className={`text-[11px] ${subtleText} truncate mt-0.5`}>
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div
                className={`p-3 rounded-xl flex items-center justify-between border ${borderTone} ${isDark ? "bg-[#0a0f1d]" : "bg-white"}`}
              >
                <span className="text-xs font-semibold">Active Currency</span>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className={`text-xs font-bold rounded-lg px-2 py-1 border ${borderTone} bg-transparent focus:outline-none`}
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
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-500/20 active:scale-[0.99] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </header>

      {/* --- DESKTOP SIDEBAR PANEL --- */}
      <aside
        className={`hidden lg:flex w-64 ${bgSidebar} border-r p-6 flex-col justify-between shrink-0 h-screen sticky top-0`}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div>
              <h1 className="font-extrabold text-base tracking-wide leading-none">
                Smart Budget
              </h1>
              <p className={`text-[10px] ${subtleText} mt-1 font-medium`}>
                Workspace
              </p>
            </div>
          </div>
        </div>

        <div className={`pt-4 border-t ${borderTone} space-y-4`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${subtleText}`}>
              Theme Mode
            </span>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border ${borderTone} transition cursor-pointer flex items-center gap-2 text-xs font-semibold ${
                isDark
                  ? "bg-slate-900 text-slate-200"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN UNIFIED WORKSPACE --- */}
      <main className="flex-1 p-4 lg:p-10 space-y-8 overflow-y-auto max-w-5xl w-full mx-auto">
        {/* TOP HEADER */}
        <header
          className={`flex items-center justify-between gap-4 pb-6 border-b ${borderTone}`}
        >
          <div>
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
              Overview
            </h1>
            <p className={`text-xs ${subtleText} font-medium`}>
              Track, analyze, & manage cash flow effortlessly
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border ${borderTone} ${
                  isDark
                    ? "bg-slate-900"
                    : "bg-white shadow-sm hover:bg-slate-50"
                } transition cursor-pointer`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Actions
                <ChevronDown className="w-3 h-3" />
              </button>

              {showActionsMenu && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-2xl border ${borderTone} ${
                    isDark
                      ? "bg-[#0a0f1d] shadow-2xl"
                      : "bg-white shadow-xl shadow-indigo-500/10"
                  } py-1 z-50`}
                >
                  <button
                    onClick={() => {
                      handleExportCSV();
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition ${
                      isDark
                        ? "hover:bg-slate-800 text-slate-200"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Download
                      className={`w-3.5 h-3.5 ${isDark ? "text-cyan-400" : "text-indigo-600"}`}
                    />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      handleClearAll();
                      setShowActionsMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold transition ${
                      isDark
                        ? "hover:bg-slate-800 text-rose-400"
                        : "hover:bg-slate-50 text-rose-600"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Data
                  </button>
                </div>
              )}
            </div>

            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className={`hidden sm:block text-xs font-bold rounded-xl px-3 py-2 border ${borderTone} ${
                isDark
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-800 shadow-sm"
              } focus:outline-none cursor-pointer`}
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

        {/* HERO BALANCE ROW */}
        <section className={`pb-6 border-b ${borderTone} space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${subtleText}`}
              >
                Total Net Balance
              </span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-3xl lg:text-4xl font-black tracking-tight">
                  {hideBalance
                    ? "••••••••"
                    : `${symbol}${displayBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </h2>
                <button
                  onClick={togglePrivacy}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isDark
                      ? "text-slate-400 hover:text-cyan-400"
                      : "text-slate-500 hover:text-indigo-600"
                  }`}
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${borderTone} ${
                isDark
                  ? "bg-slate-900 text-slate-200"
                  : "bg-white text-slate-800 shadow-sm hover:bg-slate-50"
              } transition cursor-pointer text-xs font-bold`}
            >
              <Activity
                className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-indigo-600"}`}
              />
              <span>{showPulseDetails ? "Hide Pulse" : "Financial Pulse"}</span>
            </button>
          </div>

          {showPulseDetails && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div
                className={`p-4 rounded-2xl border ${borderTone} ${isDark ? "bg-slate-900/40" : "bg-white shadow-sm"}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-1">
                  <TrendingUp className="w-4 h-4" /> Total Income
                </div>
                <p className="text-xl font-black">
                  {symbol}
                  {displayIncome.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border ${borderTone} ${isDark ? "bg-slate-900/40" : "bg-white shadow-sm"}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-500 mb-1">
                  <TrendingDown className="w-4 h-4" /> Total Expenses
                </div>
                <p className="text-xl font-black">
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

        {/* TRANSACTION ENTRY FORM */}
        <section className={`pb-8 border-b ${borderTone} space-y-4`}>
          <div className="flex items-center justify-between">
            <h3
              className={`text-xs font-bold tracking-wider uppercase ${subtleText}`}
            >
              {editingId ? "Edit Entry" : "New Entry"}
            </h3>
            <div
              className={`flex gap-1 p-1 rounded-xl border ${borderTone} ${isDark ? "bg-slate-900" : "bg-slate-200/60"}`}
            >
              <button
                type="button"
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentType === "expense"
                    ? "bg-rose-500 text-white shadow-sm"
                    : `${subtleText} hover:text-slate-900`
                }`}
                onClick={() => setCurrentType("expense")}
              >
                Expense
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  currentType === "income"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : `${subtleText} hover:text-slate-900`
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
                className={`w-full text-xs font-extrabold py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${primaryBtn}`}
              >
                <Plus className="w-4 h-4" />
                {editingId ? "Update Transaction" : "Save Transaction"}
              </button>
            </div>
          </form>
        </section>

        {/* ACTIVITY STREAM */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3
              className={`text-xs font-bold tracking-wider uppercase ${subtleText}`}
            >
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
              <li
                className={`py-8 text-center text-xs font-semibold ${subtleText}`}
              >
                No transactions found
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
                      <p className="text-sm font-bold">{item.text}</p>
                      <p className={`text-xs font-medium ${subtleText}`}>
                        {item.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`text-sm font-extrabold ${isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
                      >
                        {isExpense ? "-" : "+"}
                        {symbol}
                        {itemConvertedAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className={`p-1.5 rounded-lg ${subtleText} hover:text-indigo-600 dark:hover:text-cyan-400 transition cursor-pointer`}
                        >
                          <i className="bi bi-pencil text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className={`p-1.5 rounded-lg ${subtleText} hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer`}
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

      {/* --- RIGHT TELEMETRY SIDEBAR --- */}
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
              <PieChart
                className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-indigo-600"}`}
              />
              <h3
                className={`text-xs font-bold uppercase tracking-wider ${subtleText} group-hover:text-slate-900 dark:group-hover:text-slate-200 transition`}
              >
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
            <div className="h-44 relative mt-4">
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
              <Target
                className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}
              />
              <h3
                className={`text-xs font-bold uppercase tracking-wider ${subtleText} group-hover:text-slate-900 dark:group-hover:text-slate-200 transition`}
              >
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
            <div className="space-y-4 mt-4">
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
                      <span className="font-bold">{catName}</span>
                      <span className={`font-semibold ${subtleText}`}>
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
                      className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-200"}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? "bg-rose-500"
                            : percentage > 75
                              ? "bg-amber-500"
                              : isDark
                                ? "bg-cyan-400"
                                : "bg-indigo-600"
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
