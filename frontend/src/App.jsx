import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getMongoUsers,
  createMongoUser,
  updateMongoUser,
  deleteMongoUser,
  getSupabaseUsers,
  createSupabaseUser,
  updateSupabaseUser,
  deleteSupabaseUser,
} from "./services/userService";

// Pastel colors for avatars matching the mockup exactly
const AVATAR_PALETTES = [
  { bg: "#fed7d7", text: "#9b2c2c" }, // Pink / Rose
  { bg: "#c6f6d5", text: "#22543d" }, // Mint / Green
  { bg: "#e9d8fd", text: "#553c9a" }, // Lavender / Purple
  { bg: "#feebc8", text: "#9c4221" }, // Peach / Orange
  { bg: "#bee3f8", text: "#2a4365" }, // Sky / Cyan
  { bg: "#e2e8f0", text: "#4a5568" }, // Slate / Indigo
];

function getAvatarStyle(identifier = "") {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

// Format timestamp to matching mockup: "Sep 8, 2026" & "10:24 AM"
function formatDateTime(isoString) {
  if (!isoString) {
    return { date: "Sep 8, 2026", time: "10:24 AM" };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { date: "Sep 8, 2026", time: "10:24 AM" };
  }

  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return { date, time };
}

function App() {
  // Database Tab: 'mongo' or 'supabase'
  const [activeDb, setActiveDb] = useState("mongo");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all', 'user', 'admin'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Form State
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete & More Dialogs
  const [userToDelete, setUserToDelete] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Real-time Current Date & Time for header
  const [currentDateTimeStr, setCurrentDateTimeStr] = useState("");
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const str = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " " + now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentDateTimeStr(str);
    }
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to extract id from MongoDB (_id) or Supabase (id)
  const getUserId = (user) => user._id || user.id;

  // Auto-hide success message
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // =========================
  // LOAD USERS
  // =========================
  const loadUsers = useCallback(async (db = activeDb) => {
    try {
      setLoading(true);
      setError("");

      const result =
        db === "mongo" ? await getMongoUsers() : await getSupabaseUsers();

      const data = result.data ?? result;
      setUsers(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeDb]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // =========================
  // FORM HANDLERS
  // =========================
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setActionLoading(true);
      setError("");

      if (editingId) {
        const updateData = {
          username: form.username,
          email: form.email,
          role: form.role,
        };

        if (form.password) {
          updateData.password = form.password;
        }

        if (activeDb === "mongo") {
          await updateMongoUser(editingId, updateData);
        } else {
          await updateSupabaseUser(editingId, updateData);
        }

        setSuccessMessage(`Updated user "${form.username}" successfully!`);
      } else {
        if (activeDb === "mongo") {
          await createMongoUser(form);
        } else {
          await createSupabaseUser(form);
        }

        setSuccessMessage(`Created user "${form.username}" successfully!`);
      }

      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleEdit(user) {
    setEditingId(getUserId(user));
    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    try {
      setActionLoading(true);
      setError("");

      const id = getUserId(userToDelete);
      if (activeDb === "mongo") {
        await deleteMongoUser(id);
      } else {
        await deleteSupabaseUser(id);
      }

      setSuccessMessage(`Deleted user "${userToDelete.username}"`);
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      username: "",
      email: "",
      password: "",
      role: "user",
    });
  }

  // Filter and search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchesRole =
        roleFilter === "all" ||
        u.role?.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Paginated users
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const isMongo = activeDb === "mongo";

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#2f2a25] font-sans antialiased selection:bg-[#8f3d3d]/20 selection:text-[#8f3d3d]">
      
      {/* TOP HEADER WITH WARM DECORATIVE ACCENT */}
      <header className="relative bg-[#fffaf3] border-b border-[#d8cfc2] overflow-hidden">
        {/* Subtle warm watercolor floral gradient blur in top-right */}
        <div className="absolute -top-12 -right-12 w-80 h-80 rounded-full bg-gradient-to-br from-[#ebd7c5]/60 via-[#f4ded0]/40 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          {/* LOGO & TITLE */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#8f3d3d] text-[#fffaf3] flex items-center justify-center font-bold text-xl shadow-md shrink-0 tracking-tight">
              DB
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#2f2a25] tracking-tight">
                User Management Console
              </h1>
              <p className="text-xs text-[#7a6f66] mt-0.5">
                Manage users across your database. Full-stack CRUD with MongoDB Atlas &amp; Supabase PostgreSQL.
              </p>
            </div>
          </div>

          {/* TOGGLE CAPSULE & USER AVATAR */}
          <div className="flex items-center gap-4 self-end md:self-auto">
            {/* Database Switcher Capsule */}
            <div className="inline-flex items-center bg-[#efe7dc] p-1 rounded-full border border-[#d8cfc2] shadow-inner">
              <button
                onClick={() => {
                  setActiveDb("mongo");
                  resetForm();
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isMongo
                    ? "bg-[#453c35] text-white shadow-sm"
                    : "text-[#5c5248] hover:text-[#2f2a25]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isMongo ? "bg-[#4ade80]" : "bg-[#a89f91]"
                  }`}
                />
                MongoDB
              </button>

              <button
                onClick={() => {
                  setActiveDb("supabase");
                  resetForm();
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                  !isMongo
                    ? "bg-[#453c35] text-white shadow-sm"
                    : "text-[#5c5248] hover:text-[#2f2a25]"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    !isMongo ? "bg-[#4ade80]" : "bg-[#a89f91]"
                  }`}
                />
                Supabase
              </button>
            </div>

            {/* User Profile Avatar */}
            <div className="w-10 h-10 rounded-full bg-[#743131] text-[#fffaf3] flex items-center justify-center font-bold text-xs tracking-wider shadow-sm border border-[#5e2727] cursor-pointer hover:opacity-90 transition">
              IT
            </div>
          </div>

        </div>
      </header>

      {/* SUB-HEADER BREADCRUMB & DATE BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between text-xs text-[#7a6f66]">
        <div className="flex items-center gap-2 font-medium">
          <svg className="w-4 h-4 text-[#8f3d3d]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-[#d8cfc2]">/</span>
          <span className="font-bold text-[#2f2a25]">Users</span>
        </div>

        <div className="font-medium text-[#7a6f66]">
          {currentDateTimeStr || "Mon, Sep 8, 2026 10:24 AM"}
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pb-12">

        {/* FEEDBACK ALERTS */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#fde8e8] border border-[#f8b4b4] text-[#a63d40] text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">⚠️ ข้อผิดพลาด:</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="font-bold text-lg px-2 hover:opacity-75">
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#e6f4ea] border border-[#a8dab5] text-[#2b6a3f] text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">✅ สำเร็จ:</span>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage("")} className="font-bold text-lg px-2 hover:opacity-75">
              ×
            </button>
          </div>
        )}

        {/* 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ==================================================== */}
          {/* LEFT CARD: CREATE / UPDATE USER FORM               */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 bg-[#fffaf3] border border-[#d8cfc2] rounded-3xl p-6 md:p-7 shadow-sm">
            
            {/* FORM HEADER */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#efe7dc] text-[#8f3d3d] flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#2f2a25] tracking-tight">
                  {editingId ? "Update User" : "Create New User"}
                </h2>
                <p className="text-xs text-[#7a6f66] mt-0.5">
                  {editingId
                    ? `Modify user in ${isMongo ? "MongoDB" : "Supabase"}`
                    : "Add a new user to your database"}
                </p>
              </div>
            </div>

            {/* FORM FIELDS */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* USERNAME */}
              <div>
                <label className="block text-xs font-bold text-[#2f2a25] mb-1.5">
                  Username
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[#7a6f66]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#fffaf3] border border-[#d8cfc2] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#2f2a25] focus:outline-none focus:border-[#8f3d3d] focus:ring-1 focus:ring-[#8f3d3d] transition"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-xs font-bold text-[#2f2a25] mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[#7a6f66]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#fffaf3] border border-[#d8cfc2] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#2f2a25] focus:outline-none focus:border-[#8f3d3d] focus:ring-1 focus:ring-[#8f3d3d] transition"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-xs font-bold text-[#2f2a25] mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[#7a6f66]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!editingId}
                    className="w-full bg-[#fffaf3] border border-[#d8cfc2] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#2f2a25] focus:outline-none focus:border-[#8f3d3d] focus:ring-1 focus:ring-[#8f3d3d] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-[#7a6f66] hover:text-[#2f2a25] transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* ROLE */}
              <div>
                <label className="block text-xs font-bold text-[#2f2a25] mb-1.5">
                  Role
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[#7a6f66]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full bg-[#fffaf3] border border-[#d8cfc2] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#2f2a25] appearance-none focus:outline-none focus:border-[#8f3d3d] focus:ring-1 focus:ring-[#8f3d3d] transition cursor-pointer"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <span className="absolute right-3.5 pointer-events-none text-[#7a6f66]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-[#8f3d3d] hover:bg-[#743131] text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] disabled:opacity-60"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {editingId ? "Save Changes" : "Create User"}
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full bg-[#efe7dc] hover:bg-[#e4dacb] text-[#2f2a25] py-2.5 rounded-2xl font-semibold text-xs border border-[#d8cfc2] transition"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* ==================================================== */}
          {/* RIGHT CARD: USER LIST & TABLE                     */}
          {/* ==================================================== */}
          <div className="lg:col-span-8 bg-[#fffaf3] border border-[#d8cfc2] rounded-3xl p-6 md:p-7 shadow-sm">
            
            {/* TOP ACTIONS ROW */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              
              {/* TABLE TITLE & BADGES */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#efe7dc] text-[#8f3d3d] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-extrabold text-[#2f2a25] tracking-tight">
                      {isMongo ? "MongoDB Users" : "Supabase Users"}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#efe7dc] text-[#7a6f66] font-semibold border border-[#d8cfc2]">
                      {filteredUsers.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-[#7a6f66] mt-0.5 font-mono">
                    Endpoint: {isMongo ? "/api/v2/users" : "/api/v2/users/pg"}
                  </p>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="flex items-center gap-2 w-full sm:w-auto relative">
                {/* Search input */}
                <div className="relative flex items-center flex-1 sm:flex-initial">
                  <span className="absolute left-3 text-[#7a6f66]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-56 bg-[#fffaf3] border border-[#d8cfc2] rounded-xl pl-9 pr-3 py-2 text-xs text-[#2f2a25] placeholder-[#a89e93] focus:outline-none focus:border-[#8f3d3d] transition"
                  />
                </div>

                {/* Filter button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className={`w-9 h-9 rounded-xl border border-[#d8cfc2] flex items-center justify-center transition ${
                      roleFilter !== "all"
                        ? "bg-[#efe7dc] text-[#8f3d3d] font-bold border-[#8f3d3d]"
                        : "bg-[#fffaf3] hover:bg-[#efe7dc] text-[#7a6f66]"
                    }`}
                    title="Filter by Role"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>

                  {/* Filter Popover */}
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-36 bg-[#fffaf3] border border-[#d8cfc2] rounded-xl shadow-lg p-1.5 z-30 text-xs font-medium space-y-1">
                      <button
                        onClick={() => { setRoleFilter("all"); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition ${roleFilter === "all" ? "bg-[#efe7dc] text-[#8f3d3d] font-bold" : "text-[#7a6f66] hover:bg-[#efe7dc]"}`}
                      >
                        All Roles
                      </button>
                      <button
                        onClick={() => { setRoleFilter("user"); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition ${roleFilter === "user" ? "bg-[#efe7dc] text-[#8f3d3d] font-bold" : "text-[#7a6f66] hover:bg-[#efe7dc]"}`}
                      >
                        User only
                      </button>
                      <button
                        onClick={() => { setRoleFilter("admin"); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition ${roleFilter === "admin" ? "bg-[#efe7dc] text-[#8f3d3d] font-bold" : "text-[#7a6f66] hover:bg-[#efe7dc]"}`}
                      >
                        Admin only
                      </button>
                    </div>
                  )}
                </div>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={() => loadUsers()}
                  disabled={loading}
                  className="w-9 h-9 rounded-xl bg-[#8f3d3d] hover:bg-[#743131] text-white flex items-center justify-center transition shadow-sm disabled:opacity-60"
                  title="Reload Users"
                >
                  <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

            </div>

            {/* USERS TABLE */}
            <div className="overflow-x-auto min-h-90">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#efe7dc]/50 text-[11px] font-extrabold uppercase tracking-wider text-[#7a6f66]">
                    <th className="py-3 px-3.5 first:rounded-l-xl">#</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Created At</th>
                    <th className="py-3 px-3.5 text-right last:rounded-r-xl">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#efe7dc]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-[#7a6f66]">
                        <div className="inline-block w-8 h-8 border-3 border-[#8f3d3d] border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-xs font-semibold">Loading users from {isMongo ? "MongoDB" : "Supabase"}...</p>
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-[#7a6f66]">
                        <div className="w-12 h-12 rounded-full bg-[#efe7dc] text-[#7a6f66] flex items-center justify-center mx-auto mb-3 text-xl">
                          👤
                        </div>
                        <p className="font-bold text-sm text-[#2f2a25]">No users found</p>
                        <p className="text-xs text-[#7a6f66] mt-1">
                          {searchQuery || roleFilter !== "all"
                            ? "Try changing your search keywords or filter"
                            : `No user data available in ${isMongo ? "MongoDB" : "Supabase"}. Create one on the left!`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, index) => {
                      const id = getUserId(user);
                      const isBeingEdited = editingId === id;
                      const avatarLetter = (user.username || "U")[0].toUpperCase();
                      const avatarStyle = getAvatarStyle(user.username || id);
                      const dt = formatDateTime(user.createdAt || user.created_at);
                      const rowNum = (currentPage - 1) * pageSize + index + 1;

                      return (
                        <tr
                          key={id}
                          className={`group transition-colors ${
                            isBeingEdited
                              ? "bg-[#8f3d3d]/10"
                              : "hover:bg-[#efe7dc]/40"
                          }`}
                        >
                          {/* INDEX */}
                          <td className="py-4 px-3.5 text-xs text-[#7a6f66] font-semibold">
                            {rowNum}
                          </td>

                          {/* USER (AVATAR + NAME + EMAIL) */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                style={{
                                  backgroundColor: avatarStyle.bg,
                                  color: avatarStyle.text,
                                }}
                                className="w-10 h-10 rounded-full font-black text-sm flex items-center justify-center shrink-0 shadow-xs"
                              >
                                {avatarLetter}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-[#2f2a25] flex items-center gap-2">
                                  {user.username}
                                  {isBeingEdited && (
                                    <span className="text-[10px] bg-[#8f3d3d] text-white px-1.5 py-0.5 rounded font-bold">
                                      Editing
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#7a6f66]">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* ROLE */}
                          <td className="py-4 px-4">
                            <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#efe7dc] text-[#52453c] border border-[#d8cfc2]">
                              {user.role || "user"}
                            </span>
                          </td>

                          {/* CREATED AT */}
                          <td className="py-4 px-4">
                            <div className="text-xs font-bold text-[#2f2a25]">
                              {dt.date}
                            </div>
                            <div className="text-[11px] text-[#7a6f66]">
                              {dt.time}
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5 relative">
                              {/* EDIT BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleEdit(user)}
                                className="w-8 h-8 rounded-lg bg-[#efe7dc] hover:bg-[#e4dacb] text-[#8f3d3d] border border-[#d8cfc2] flex items-center justify-center transition"
                                title="Edit user"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>

                              {/* DELETE BUTTON */}
                              <button
                                type="button"
                                onClick={() => setUserToDelete(user)}
                                className="w-8 h-8 rounded-lg bg-[#fde8e8] hover:bg-[#fcd0d0] text-[#a63d40] border border-[#f8b4b4] flex items-center justify-center transition"
                                title="Delete user"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>

                              {/* MORE OPTIONS BUTTON */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveMenuId(activeMenuId === id ? null : id)
                                  }
                                  className="w-8 h-8 rounded-lg bg-[#efe7dc]/60 hover:bg-[#efe7dc] text-[#7a6f66] border border-[#d8cfc2] flex items-center justify-center transition"
                                  title="More options"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                                  </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {activeMenuId === id && (
                                  <div className="absolute right-0 mt-1 w-40 bg-[#fffaf3] border border-[#d8cfc2] rounded-xl shadow-xl p-1.5 z-40 text-xs font-medium space-y-1 text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(id);
                                        setSuccessMessage("Copied User ID!");
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#efe7dc] text-[#2f2a25] flex items-center gap-2"
                                    >
                                      📋 Copy ID
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(user.email);
                                        setSuccessMessage("Copied User Email!");
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#efe7dc] text-[#2f2a25] flex items-center gap-2"
                                    >
                                      ✉️ Copy Email
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleEdit(user);
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#efe7dc] text-[#8f3d3d] flex items-center gap-2"
                                    >
                                      ✏️ Edit Record
                                    </button>
                                  </div>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER WITH PAGINATION */}
            <div className="mt-6 pt-4 border-t border-[#efe7dc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7a6f66]">
              <div>
                Showing {paginatedUsers.length} of {filteredUsers.length} users
              </div>

              {/* PAGINATION CONTROLS */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-lg border border-[#d8cfc2] bg-[#fffaf3] hover:bg-[#efe7dc] text-[#7a6f66] flex items-center justify-center transition disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                      currentPage === pageNum
                        ? "bg-[#8f3d3d] text-white shadow-sm"
                        : "border border-[#d8cfc2] bg-[#fffaf3] hover:bg-[#efe7dc] text-[#2f2a25]"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 rounded-lg border border-[#d8cfc2] bg-[#fffaf3] hover:bg-[#efe7dc] text-[#7a6f66] flex items-center justify-center transition disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ==================================================== */}
      {/* DELETE CONFIRMATION MODAL                            */}
      {/* ==================================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#fffaf3] border border-[#d8cfc2] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#a63d40]">
              <div className="w-10 h-10 rounded-full bg-[#fde8e8] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#a63d40]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#2f2a25]">Confirm User Deletion</h3>
            </div>

            <p className="text-sm text-[#7a6f66] leading-relaxed">
              Are you sure you want to delete user{" "}
              <span className="font-bold text-[#2f2a25]">"{userToDelete.username}"</span>{" "}
              (<span className="font-mono text-xs">{userToDelete.email}</span>) from{" "}
              <span className="font-semibold text-[#8f3d3d]">
                {isMongo ? "MongoDB" : "Supabase"}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#efe7dc] hover:bg-[#e4dacb] text-[#2f2a25] border border-[#d8cfc2] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#a63d40] hover:bg-[#8f3134] text-white shadow-sm transition flex items-center gap-2"
              >
                {actionLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;