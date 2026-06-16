import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Zap,
  TrendingUp,
  BarChart2,
  List,
  Home,
  X,
  Car,
  Droplets,
  Sparkles,
  Brush,
  Shield,
  MoreHorizontal,
  Check,
  Calendar,
  Trash2,
  Banknote,
  Users,
  ChevronRight,
} from "lucide-react";

// ── API Config (замените на реальные значения) ───────────────────────────────

// Инициализация переменных из окружения Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN ?? "";
const CHAT_ID = import.meta.env.VITE_CHAT_ID ?? "";

// Создание клиента для прямого общения с базой данных
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const api = {
  // Получение всех записей напрямую из Supabase
  getEntries: async () => {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Ошибка Supabase при чтении:", error.message);
      throw error;
    }
    return data;
  },

  // Добавление записи напрямую в Supabase + отправка в Telegram
  addEntry: async (entry: Omit<Entry, "id">) => {
    const id = Date.now().toString();
    const newEntry = { ...entry, id };

    // Запись в облачную базу данных
    const { error } = await supabase
      .from("entries")
      .insert([newEntry]);

    if (error) {
      console.error("Ошибка Supabase при записи:", error.message);
      throw error;
    }

    // Отправка уведомления в Telegram прямо из браузера
    if (BOT_TOKEN && CHAT_ID) {
      const workLabels = {
        headlights: "Мойка фар",
        body:       "Мойка кузова",
        detailing:  "Детейлинг",
        polishing:  "Полировка",
        interior:   "Химчистка",
        other:      "Другое",
      };

      const text = `⚡ <b>Новая запись</b>\n\n` +
                   `🚗 <b>${newEntry.carPlate}</b> — ${workLabels[newEntry.workType] ?? newEntry.workType}\n` +
                   `💰 <b>${newEntry.amount.toLocaleString("ru-RU")} ₽</b>  ·  ${newEntry.serviceCount} услуг\n` +
                   `📅 ${newEntry.date}` +
                   (newEntry.notes ? `\n📝 ${newEntry.notes}` : "");

      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
        });
      } catch (err: any) {
        console.error("Ошибка отправки Telegram уведомления:", err.message);
      }
    }

    return newEntry;
  },

  // Удаление записи напрямую из Supabase
  deleteEntry: async (id: string) => {
    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Ошибка Supabase при удалении:", error.message);
      throw error;
    }
    return { ok: true };
  }
};
// ── Types ────────────────────────────────────────────────────────────────────

type WorkType =
  | "headlights"
  | "body"
  | "detailing"
  | "polishing"
  | "interior"
  | "other";

type Tab = "home" | "history" | "stats";

interface Entry {
  id: string;
  date: string;
  amount: number;
  carPlate: string;
  workType: WorkType;
  serviceCount: number;
  notes: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPES: Record<
  WorkType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
    bg: string;
  }
> = {
  headlights: { label: "Мойка фар", icon: Droplets, color: "#2AABEE", bg: "#E8F7FF" },
  body: { label: "Мойка кузова", icon: Car, color: "#00B09B", bg: "#E0F7F4" },
  detailing: { label: "Детейлинг", icon: Sparkles, color: "#7B61FF", bg: "#EEF0FF" },
  polishing: { label: "Полировка", icon: Brush, color: "#FF9500", bg: "#FFF5E6" },
  interior: { label: "Химчистка", icon: Shield, color: "#FF6B6B", bg: "#FFF0F0" },
  other: { label: "Другое", icon: MoreHorizontal, color: "#8E8E93", bg: "#F2F2F7" },
};

const INITIAL_ENTRIES: Entry[] = []; // заменяется данными с сервера

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today.toISOString().split("T")[0]) return "Сегодня";
  if (dateStr === yesterday.toISOString().split("T")[0]) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// ── Entry Card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  index,
  onDelete,
}: {
  entry: Entry;
  index: number;
  onDelete?: (id: string) => void;
}) {
  const wt = WORK_TYPES[entry.workType];
  const Icon = wt.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="bg-card rounded-2xl p-3.5 border border-border flex items-center gap-3 shadow-sm"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: wt.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: wt.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-bold text-sm tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A2E" }}
          >
            {entry.carPlate}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: wt.bg, color: wt.color }}
          >
            {wt.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {entry.serviceCount} {entry.serviceCount === 1 ? "услуга" : "услуги"}
          </span>
          {entry.notes && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {entry.notes}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="font-bold text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A2E" }}
        >
          {formatAmount(entry.amount)}
        </span>
        {onDelete && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(entry.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#FFF0F0" }}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: "#FF6B6B" }} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({
  entries,
  onAddClick,
  onTabChange,
}: {
  entries: Entry[];
  onAddClick: () => void;
  onTabChange: (tab: Tab) => void;
}) {
  const today = getToday();
  const todayEntries = entries.filter((e) => e.date === today);
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0);
  const todayServices = todayEntries.reduce((sum, e) => sum + e.serviceCount, 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayEntries = entries.filter((e) => e.date === dateStr);
    return {
      day: d.toLocaleDateString("ru-RU", { weekday: "short" }),
      total: dayEntries.reduce((sum, e) => sum + e.amount, 0),
    };
  });

  const weekTotal = last7Days.reduce((sum, d) => sum + d.total, 0);
  const recentEntries = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  const bestDay = [...last7Days].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-4 pb-28">
      {/* Hero block */}
      <div
        className="mx-4 mt-4 rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 60%, #1a7bbf 100%)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
          style={{ background: "white", transform: "translate(30%, -30%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-28 h-28 rounded-full opacity-10"
          style={{ background: "white", transform: "translate(-30%, 30%)" }}
        />
        <p className="text-white/70 text-sm mb-1 relative z-10">
          Сегодня · {formatDate(today) === "Сегодня" ? new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : formatDate(today)}
        </p>
        <p
          className="text-white text-4xl font-bold relative z-10"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {formatAmount(todayTotal)}
        </p>
        <div className="flex items-center gap-4 mt-4 relative z-10">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white text-sm">
              <span className="font-semibold">{todayServices}</span> услуг
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white text-sm">
              <span className="font-semibold">{todayEntries.length}</span> записей
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="bg-card rounded-2xl p-4 border border-border"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#E8F7FF] flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <p
            className="text-xl font-bold"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A2E" }}
          >
            {formatAmount(weekTotal)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">За 7 дней</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-4 border border-border"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#EEF0FF] flex items-center justify-center mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#7B61FF" }} />
          </div>
          <p
            className="text-xl font-bold"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A2E" }}
          >
            {formatAmount(bestDay?.total ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Лучший день</p>
        </motion.div>
      </div>

      {/* Week chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="mx-4 bg-card rounded-2xl p-4 border border-border"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#1A1A2E" }}>
          Выручка за 7 дней
        </h3>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={last7Days} barSize={28} barCategoryGap="30%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#8E8E93" }}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(42,171,238,0.07)" }}
              formatter={(v: number) => [formatAmount(v), "Выручка"]}
              contentStyle={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            />
            <Bar dataKey="total" fill="#2AABEE" radius={[7, 7, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent entries */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>
            Последние записи
          </h3>
          <button
            onClick={() => onTabChange("history")}
            className="flex items-center gap-0.5 text-xs font-medium"
            style={{ color: "#2AABEE" }}
          >
            Все <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {recentEntries.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border border-border text-center">
            <p className="text-muted-foreground text-sm">Ещё нет записей</p>
            <p className="text-xs text-muted-foreground mt-1">Нажмите + чтобы добавить</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry, i) => (
              <EntryCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Add Entry Sheet ───────────────────────────────────────────────────────────

function AddEntrySheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (e: Omit<Entry, "id">) => void;
}) {
  const [amount, setAmount] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [workType, setWorkType] = useState<WorkType>("headlights");
  const [serviceCount, setServiceCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(getToday());
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (!amount || !carPlate) return;
    onAdd({
      date,
      amount: parseFloat(amount.replace(",", ".")),
      carPlate: carPlate.toUpperCase().trim(),
      workType,
      serviceCount,
      notes,
    });
    setSuccess(true);
    setTimeout(() => onClose(), 900);
  };

  const canSubmit = amount.trim() !== "" && carPlate.trim() !== "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="relative mt-auto bg-background rounded-t-3xl pb-8 max-h-[94vh] overflow-y-auto"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1" />

        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A2E" }}
          >
            Новая запись
          </h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        <div className="px-5 pt-2 pb-2">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "#00B09B" }}
                >
                  <Check className="w-8 h-8 text-white" />
                </motion.div>
                <p
                  className="font-bold text-lg"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Запись добавлена!
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" className="space-y-4">
                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Дата
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-foreground focus:outline-none focus:ring-2"
                      style={{
                        background: "#F2F2F7",
                        border: "none",
                        "--tw-ring-color": "rgba(42,171,238,0.3)",
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Car plate */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Номер авто
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="А 123 БВ 777"
                      value={carPlate}
                      onChange={(e) => setCarPlate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 uppercase"
                      style={{
                        background: "#F2F2F7",
                        border: "none",
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.05em",
                        "--tw-ring-color": "rgba(42,171,238,0.3)",
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Work type */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Тип услуги
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      Object.entries(WORK_TYPES) as [
                        WorkType,
                        (typeof WORK_TYPES)[WorkType]
                      ][]
                    ).map(([key, wt]) => {
                      const Icon = wt.icon;
                      const selected = workType === key;
                      return (
                        <motion.button
                          key={key}
                          onClick={() => setWorkType(key)}
                          whileTap={{ scale: 0.95 }}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                          style={{
                            background: selected ? wt.bg : "#F2F2F7",
                            border: `2px solid ${selected ? wt.color : "transparent"}`,
                          }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: selected ? wt.color : "#8E8E93" }}
                          />
                          <span
                            className="text-[10px] font-semibold text-center leading-tight"
                            style={{ color: selected ? wt.color : "#8E8E93" }}
                          >
                            {wt.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Сумма (₽)
                  </label>
                  <div className="relative">
                    <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="number"
                      placeholder="1 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2"
                      style={{
                        background: "#F2F2F7",
                        border: "none",
                        fontFamily: "'DM Sans', sans-serif",
                        "--tw-ring-color": "rgba(42,171,238,0.3)",
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Service count */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Количество услуг
                  </label>
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setServiceCount(Math.max(1, serviceCount - 1))}
                      className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl font-bold text-foreground"
                    >
                      −
                    </motion.button>
                    <span
                      className="text-2xl font-bold w-8 text-center"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: "#1A1A2E" }}
                    >
                      {serviceCount}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setServiceCount(serviceCount + 1)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                      style={{ background: "#2AABEE" }}
                    >
                      +
                    </motion.button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Заметка <span className="normal-case font-normal">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VIP клиент, сложная работа..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2"
                    style={{
                      background: "#F2F2F7",
                      border: "none",
                      "--tw-ring-color": "rgba(42,171,238,0.3)",
                    } as React.CSSProperties}
                  />
                </div>

                {/* Submit */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full py-4 rounded-2xl text-white font-bold text-base mt-2 transition-opacity disabled:opacity-40"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    background: canSubmit
                      ? "linear-gradient(135deg, #2AABEE, #229ED9)"
                      : "#8E8E93",
                    boxShadow: canSubmit ? "0 4px 16px rgba(42,171,238,0.35)" : "none",
                  }}
                >
                  Добавить запись
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function History({
  entries,
  onDelete,
}: {
  entries: Entry[];
  onDelete: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const map: Record<string, Entry[]> = {};
    for (const e of sorted) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return Object.entries(map);
  }, [entries]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 gap-3 pb-24">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#E8F7FF" }}
        >
          <List className="w-8 h-8" style={{ color: "#2AABEE" }} />
        </div>
        <p className="font-semibold text-foreground">История пуста</p>
        <p className="text-sm text-muted-foreground">Добавьте первую запись</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 px-4 pt-4">
      {grouped.map(([date, dayEntries], gi) => {
        const dayTotal = dayEntries.reduce((sum, e) => sum + e.amount, 0);
        const dayServices = dayEntries.reduce((sum, e) => sum + e.serviceCount, 0);
        return (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#2AABEE" }}
                />
                <span className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>
                  {formatDate(date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {dayServices} услуг
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "#2AABEE", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {formatAmount(dayTotal)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {dayEntries.map((e, i) => (
                <EntryCard key={e.id} entry={e} index={i} onDelete={onDelete} />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function Stats({ entries }: { entries: Entry[] }) {
  const byWorkType = useMemo(() => {
    const map = {} as Record<
      WorkType,
      { amount: number; count: number; services: number }
    >;
    for (const key of Object.keys(WORK_TYPES) as WorkType[]) {
      map[key] = { amount: 0, count: 0, services: 0 };
    }
    for (const e of entries) {
      map[e.workType].amount += e.amount;
      map[e.workType].count += 1;
      map[e.workType].services += e.serviceCount;
    }
    return (Object.entries(map) as [WorkType, (typeof map)[WorkType]][])
      .map(([key, data]) => ({
        key,
        label: WORK_TYPES[key].label,
        color: WORK_TYPES[key].color,
        bg: WORK_TYPES[key].bg,
        icon: WORK_TYPES[key].icon,
        ...data,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const pieData = byWorkType.map((d) => ({
    name: d.label,
    value: d.amount,
    color: d.color,
  }));

  const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalServices = entries.reduce((sum, e) => sum + e.serviceCount, 0);
  const totalEntries = entries.length;

  return (
    <div className="space-y-4 pb-28 pt-4">
      {/* Summary row */}
      <div className="px-4 grid grid-cols-3 gap-2">
        {[
          { label: "Всего", value: formatAmount(totalAmount), bg: "#E8F7FF", color: "#2AABEE" },
          { label: "Услуг", value: totalServices.toString(), bg: "#EEF0FF", color: "#7B61FF" },
          { label: "Записей", value: totalEntries.toString(), bg: "#E0F7F4", color: "#00B09B" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-2xl p-3 border border-border text-center"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
          >
            <p
              className="text-sm font-bold"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A1A2E",
                fontSize: totalAmount > 99999 && s.label === "Всего" ? "11px" : undefined,
              }}
            >
              {s.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Donut chart */}
      {pieData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mx-4 bg-card rounded-2xl p-4 border border-border"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#1A1A2E" }}>
            По типу услуги
          </h3>
          <div className="flex items-center gap-2">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatAmount(v)]}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 min-w-0">
              {byWorkType.map((d) => {
                const pct = totalAmount > 0 ? Math.round((d.amount / totalAmount) * 100) : 0;
                return (
                  <div key={d.key} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: d.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground truncate">
                          {d.label}
                        </span>
                        <span
                          className="text-[11px] font-semibold ml-1"
                          style={{ color: d.color }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full mt-0.5 overflow-hidden"
                        style={{ background: d.bg }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{ background: d.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Table by work type */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mx-4 bg-card rounded-2xl border border-border overflow-hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
      >
        <div
          className="grid grid-cols-4 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <span className="col-span-2">Услуга</span>
          <span className="text-right">Записей</span>
          <span className="text-right">Итого</span>
        </div>
        {byWorkType.map((d, i) => {
          const Icon = d.icon;
          return (
            <div
              key={d.key}
              className="grid grid-cols-4 px-4 py-3 items-center"
              style={{
                borderBottom:
                  i < byWorkType.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
              }}
            >
              <div className="col-span-2 flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: d.bg }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#1A1A2E" }}>
                  {d.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-right">{d.count}</span>
              <span
                className="text-xs font-semibold text-right"
                style={{ color: "#1A1A2E", fontFamily: "'DM Sans', sans-serif" }}
              >
                {formatAmount(d.amount)}
              </span>
            </div>
          );
        })}
      </motion.div>

      {/* Bar chart */}
      {byWorkType.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mx-4 bg-card rounded-2xl p-4 border border-border"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#1A1A2E" }}>
            Сравнение по выручке
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={byWorkType} barSize={28}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#8E8E93" }}
                interval={0}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "rgba(42,171,238,0.06)" }}
                formatter={(v: number) => [formatAmount(v), "Выручка"]}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  fontSize: 11,
                }}
              />
              <Bar dataKey="amount" radius={[7, 7, 0, 0]}>
                {byWorkType.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}

// ── Splash Screen ─────────────────────────────────────────────────────────────

function SplashScreen({ onDone }: { onDone: () => void }) {
  // Phase: 0=parts fly in, 1=assembled pulse, 2=smoke reveal, 3=done
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1700);
    const t3 = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a7bbf 0%, #2AABEE 50%, #229ED9 100%)" }}
    >
      {/* Background dots */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 60 + i * 40,
            height: 60 + i * 40,
            border: "1px solid rgba(255,255,255,0.08)",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}

      {/* Assembly scene */}
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Wheel — flies in from left */}
        <motion.div
          className="absolute"
          style={{ left: 10, top: "50%", y: "-50%" }}
          initial={{ x: -220, opacity: 0, rotate: -180 }}
          animate={
            phase >= 1
              ? { x: 0, opacity: 1, rotate: 0 }
              : { x: -220, opacity: 0, rotate: -180 }
          }
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
        >
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="20" stroke="white" strokeWidth="3" />
            <circle cx="22" cy="22" r="8" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2" />
            <line x1="22" y1="4" x2="22" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
            <line x1="4" y1="22" x2="40" y2="22" stroke="white" strokeWidth="2" strokeOpacity="0.6" />
          </svg>
        </motion.div>

        {/* Motor/gear — flies in from right */}
        <motion.div
          className="absolute"
          style={{ right: 10, top: "50%", y: "-50%" }}
          initial={{ x: 220, opacity: 0, rotate: 180 }}
          animate={
            phase >= 1
              ? { x: 0, opacity: 1, rotate: 0 }
              : { x: 220, opacity: 0, rotate: 180 }
          }
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.08 }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="8" y="12" width="24" height="16" rx="4" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2.5" />
            <rect x="16" y="8" width="8" height="6" rx="2" fill="white" fillOpacity="0.5" />
            <rect x="16" y="26" width="8" height="6" rx="2" fill="white" fillOpacity="0.5" />
            <circle cx="20" cy="20" r="4" fill="white" />
            <line x1="32" y1="16" x2="38" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="24" x2="38" y2="26" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>

        {/* Zap — drops from top */}
        <motion.div
          className="absolute"
          style={{ top: 10, left: "50%", x: "-50%" }}
          initial={{ y: -160, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: -160, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.05 }}
        >
          <div className="w-10 h-10 rounded-2xl bg-white/25 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </motion.div>

        {/* Center body of cart */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-2"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
        >
          {/* Glow pulse on assembly */}
          {phase === 1 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }}
              animate={{ scale: [0.8, 2, 0.8], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <svg width="56" height="38" viewBox="0 0 56 38" fill="none">
            {/* Cart body */}
            <rect x="4" y="8" width="40" height="22" rx="6" fill="white" fillOpacity="0.95" />
            <rect x="10" y="14" width="12" height="10" rx="2" fill="#2AABEE" />
            <rect x="26" y="14" width="12" height="10" rx="2" fill="#229ED9" opacity="0.6" />
            {/* Wheels */}
            <circle cx="12" cy="34" r="4" fill="white" stroke="white" strokeWidth="1" />
            <circle cx="36" cy="34" r="4" fill="white" stroke="white" strokeWidth="1" />
            {/* Handle */}
            <path d="M44 10 Q52 10 52 18 L52 24" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Exhaust (smoke source) */}
            <circle cx="6" cy="20" r="2.5" fill="#1a7bbf" />
          </svg>
          <p
            className="text-white font-bold text-sm tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif", textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
          >
            Электро Тележка
          </p>
        </motion.div>

        {/* Smoke particles from left side of cart */}
        {phase >= 1 &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={`smoke-${i}`}
              className="absolute rounded-full"
              style={{
                left: 16 + i * 6,
                top: "45%",
                width: 10 + i * 4,
                height: 10 + i * 4,
                background: "rgba(255,255,255,0.35)",
                filter: "blur(4px)",
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
              animate={{
                x: -(20 + i * 18),
                y: -(10 + i * 8),
                opacity: [0, 0.7, 0],
                scale: [0.3, 1 + i * 0.3, 1.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.18,
                ease: "easeOut",
              }}
            />
          ))}
      </div>

      {/* White smoke reveal that covers everything */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background:
                "radial-gradient(ellipse at 50% 110%, white 0%, rgba(255,255,255,0.97) 40%, rgba(238,244,250,0.99) 70%, #EEF4FA 100%)",
            }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            {/* Extra smoke puffs rising up */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  bottom: 0,
                  left: `${15 + i * 18}%`,
                  width: 80 + i * 30,
                  height: 80 + i * 30,
                  background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)",
                  filter: "blur(12px)",
                }}
                initial={{ y: 120, opacity: 0, scale: 0.5 }}
                animate={{ y: -80, opacity: [0, 0.9, 0], scale: [0.5, 1.4, 1.8] }}
                transition={{ duration: 0.8, delay: i * 0.07, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: "home", label: "Главная", icon: Home },
  { id: "history", label: "История", icon: List },
  { id: "stats", label: "Статистика", icon: BarChart2 },
];

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [splash, setSplash] = useState(true);
  const [tab, setTab] = useState<Tab>("home");
  const [entries, setEntries] = useState<Entry[]>(INITIAL_ENTRIES);
  const [showAdd, setShowAdd] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Загружаем записи с сервера при старте
  useEffect(() => {
    api.getEntries()
      .then((data: Entry[]) => Array.isArray(data) && setEntries(data))
      .catch(() => setLoadError(true));
  }, []);

  const addEntry = async (data: Omit<Entry, "id">) => {
    try {
      const saved: Entry = await api.addEntry(data);
      setEntries((prev) => [saved, ...prev]);
    } catch {
      // Если сервер недоступен — сохраняем локально
      setEntries((prev) => [{ ...data, id: Date.now().toString() }, ...prev]);
    }
  };

  const deleteEntry = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id)); // оптимистично
    try {
      await api.deleteEntry(id);
    } catch {
      // Сервер недоступен — локальное удаление уже применено
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif", background: "#EEF4FA" }}
    >
      <AnimatePresence>{splash && <SplashScreen onDone={() => setSplash(false)} />}</AnimatePresence>
      <div className="w-full max-w-lg mx-auto relative flex flex-col min-h-screen">
        {/* Баннер: сервер недоступен */}
        <AnimatePresence>
          {loadError && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-50 flex justify-center"
            >
              <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium text-white flex items-center gap-2 max-w-lg w-full"
                style={{ background: "rgba(255,107,107,0.95)", backdropFilter: "blur(8px)" }}>
                <span>⚠️</span>
                <span>Сервер недоступен — данные сохраняются локально</span>
                <button className="ml-auto opacity-70" onClick={() => setLoadError(false)}>✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Header */}
        <header
          className="sticky top-0 z-20 px-5 pt-10 pb-4"
          style={{
            background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="font-bold text-white text-base leading-tight"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Электро Тележка
                </h1>
                <p className="text-white/65 text-xs">Учёт доходов</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAdd(true)}
              className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-white" />
            </motion.button>
          </div>

          {/* Tab pills in header */}
          <div className="flex gap-1 mt-4">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <motion.button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors relative"
                  style={{ color: active ? "#2AABEE" : "rgba(255,255,255,0.7)" }}
                >
                  {active && (
                    <motion.div
                      layoutId="header-tab"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "white" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </motion.button>
              );
            })}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <Dashboard
                  entries={entries}
                  onAddClick={() => setShowAdd(true)}
                  onTabChange={setTab}
                />
              </motion.div>
            )}
            {tab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <History entries={entries} onDelete={deleteEntry} />
              </motion.div>
            )}
            {tab === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.18 }}
              >
                <Stats entries={entries} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Add Entry Sheet */}
        <AnimatePresence>
          {showAdd && (
            <AddEntrySheet
              onClose={() => setShowAdd(false)}
              onAdd={addEntry}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
