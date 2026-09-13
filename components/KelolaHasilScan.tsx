import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { showAlert, showConfirm } from "../utils/alert";
import {
  Database,
  RefreshCw,
  PlusCircle,
  UserMinus,
  Download,
  Printer,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Search,
  X,
  CheckCircle,
} from "lucide-react";
import { PresensiMode, QRScanRecord, EKSTRA_LIST } from "../pages/PresensiQR";

interface KelolaHasilScanProps {
  onCountChange?: (count: number) => void;
}

export const KelolaHasilScan: React.FC<KelolaHasilScanProps> = ({
  onCountChange,
}) => {
  const { profile, isAdmin, isOperator, academicYear, semester } = useAuth();
  const isAdminOrOperator = isAdmin || isOperator;

  // Students list from DB or cache
  const [students, setStudents] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("simpanla_students_cache");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [classes, setClasses] = useState<string[]>([
    "7A", "7B", "7C", "7D", "7E", "7F", "7G", "7H",
    "8A", "8B", "8C", "8D", "8E", "8F", "8G", "8H",
    "9A", "9B", "9C", "9D", "9E", "9F", "9G", "9H",
  ]);

  // Database logs state
  const [databaseLogs, setDatabaseLogs] = useState<QRScanRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  // Filters State
  const [logDateMode, setLogDateMode] = useState<"today" | "date" | "month" | "all">("today");
  const [logSelectedDate, setLogSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA");
  });
  const [logSelectedMonth, setLogSelectedMonth] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA").substring(0, 7);
  });
  const [historySearch, setHistorySearch] = useState<string>("");
  const [logModeFilter, setLogModeFilter] = useState<string>("");
  const [logEkstraFilter, setLogEkstraFilter] = useState<string>("");
  const [historyClassFilter, setHistoryClassFilter] = useState<string>("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("");

  // Modals State
  const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);
  const [manualAddStudentSearch, setManualAddStudentSearch] = useState<string>("");
  const [selectedStudentForManual, setSelectedStudentForManual] = useState<any | null>(null);
  const [manualAddDate, setManualAddDate] = useState<string>(() => new Date().toLocaleDateString("en-CA"));
  const [manualAddTime, setManualAddTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [manualAddMode, setManualAddMode] = useState<PresensiMode>("harian");
  const [manualAddEkstra, setManualAddEkstra] = useState<string>(EKSTRA_LIST[0]);
  const [manualAddStatus, setManualAddStatus] = useState<"Hadir" | "Terlambat">("Hadir");
  const [manualAddNotes, setManualAddNotes] = useState<string>("");
  const [savingManual, setSavingManual] = useState<boolean>(false);

  // Edit record modal
  const [editingRecord, setEditingRecord] = useState<QRScanRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Unscanned Modal
  const [showUnscannedModal, setShowUnscannedModal] = useState<boolean>(false);
  const [unscannedClassFilter, setUnscannedClassFilter] = useState<string>("");

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const isDateToday = (dStr?: string) => {
    if (!dStr) return false;
    const itemDate = new Date(dStr).toLocaleDateString("en-CA");
    const today = new Date().toLocaleDateString("en-CA");
    return itemDate === today;
  };

  // Fetch Students & Classes from Supabase
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, name, nisn, nis, kelas")
          .order("name", { ascending: true });
        if (!error && data && data.length > 0) {
          setStudents(data);
          try {
            localStorage.setItem("simpanla_students_cache", JSON.stringify(data));
          } catch (e) {}

          const uniqueClasses = Array.from(new Set(data.map((s) => s.kelas).filter(Boolean))).sort();
          if (uniqueClasses.length > 0) {
            setClasses(uniqueClasses as string[]);
          }
        }
      } catch (err) {
        console.warn("Could not fetch students:", err);
      }
    };
    loadStudents();
  }, []);

  // Fetch Database Logs
  const fetchDatabaseLogs = async (showLoading = true) => {
    if (showLoading) setLoadingLogs(true);
    try {
      const combinedRecords: QRScanRecord[] = [];

      let queryLogs = supabase
        .from("qr_presensi_logs")
        .select("id, student_id, student_name, nisn, kelas, mode, status, subject, scanned_at, notes, academic_year");

      if (logDateMode === "today") {
        const today = new Date();
        const startOfLocalToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        queryLogs = queryLogs.gte("scanned_at", startOfLocalToday.toISOString());
      } else if (logDateMode === "date") {
        const [yr, mo, da] = logSelectedDate.split("-").map(Number);
        const startOfLocalDay = new Date(yr, mo - 1, da, 0, 0, 0);
        const endOfLocalDay = new Date(yr, mo - 1, da, 23, 59, 59, 999);
        queryLogs = queryLogs
          .gte("scanned_at", startOfLocalDay.toISOString())
          .lte("scanned_at", endOfLocalDay.toISOString());
      } else if (logDateMode === "month") {
        const [yr, mo] = logSelectedMonth.split("-").map(Number);
        const startMonth = new Date(yr, mo - 1, 1, 0, 0, 0);
        const endMonth = new Date(yr, mo, 0, 23, 59, 59, 999);
        queryLogs = queryLogs
          .gte("scanned_at", startMonth.toISOString())
          .lte("scanned_at", endMonth.toISOString());
      } else {
        queryLogs = queryLogs.limit(1000);
      }

      queryLogs = queryLogs.order("scanned_at", { ascending: false });

      const { data, error } = await queryLogs;
      if (!error && data && data.length > 0) {
        data.forEach((item: any) => {
          const itemTime = item.scanned_at || item.created_at;
          let matchesDate = true;
          if (logDateMode === "today") {
            matchesDate = isDateToday(itemTime);
          } else if (logDateMode === "date") {
            const localDateStr = new Date(itemTime).toLocaleDateString("en-CA");
            matchesDate = localDateStr === logSelectedDate;
          } else if (logDateMode === "month") {
            const localMonthStr = new Date(itemTime).toLocaleDateString("en-CA").substring(0, 7);
            matchesDate = localMonthStr === logSelectedMonth;
          }

          if (matchesDate) {
            combinedRecords.push({
              id: item.id || `${item.student_id}-${itemTime}`,
              nisn: item.nisn || "-",
              studentName: item.student_name || "-",
              kelas: item.kelas || "-",
              timestamp: itemTime,
              mode: item.mode || "harian",
              status: item.status || "Hadir",
              subject: item.subject || undefined,
              notes: item.notes || undefined,
            });
          }
        });
      }

      // Also merge any local temporary items
      try {
        const localHistoryRaw = localStorage.getItem("simpanla_qr_scan_history");
        if (localHistoryRaw) {
          const localItems: QRScanRecord[] = JSON.parse(localHistoryRaw);
          localItems.forEach((p) => {
            let matchesDate = true;
            if (logDateMode === "today") {
              matchesDate = isDateToday(p.timestamp);
            } else if (logDateMode === "date") {
              matchesDate = new Date(p.timestamp).toLocaleDateString("en-CA") === logSelectedDate;
            } else if (logDateMode === "month") {
              matchesDate = new Date(p.timestamp).toLocaleDateString("en-CA").substring(0, 7) === logSelectedMonth;
            }
            if (matchesDate && !combinedRecords.some((r) => r.id === p.id)) {
              combinedRecords.push(p);
            }
          });
        }
      } catch (e) {}

      // Deduplicate keeping earliest scan
      const map = new Map<string, QRScanRecord>();
      combinedRecords.forEach((r) => {
        const datePart = new Date(r.timestamp).toLocaleDateString("en-CA");
        const key = `${r.nisn.trim()}_${r.mode}_${r.subject || ""}_${datePart}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          if (new Date(r.timestamp).getTime() < new Date(existing.timestamp).getTime()) {
            map.set(key, r);
          }
        } else {
          map.set(key, r);
        }
      });

      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setDatabaseLogs(sorted);
      if (onCountChange) {
        onCountChange(sorted.length);
      }
    } catch (err) {
      console.warn("Failed to fetch presensi logs:", err);
    } finally {
      if (showLoading) setLoadingLogs(false);
    }
  };

  // Realtime Broadcast & DB Sync
  useEffect(() => {
    fetchDatabaseLogs(true);

    const channel = supabase
      .channel("simpanla_qr_presensi_live_room", {
        config: { broadcast: { self: true } },
      })
      .on("broadcast", { event: "NEW_SCAN" }, ({ payload }) => {
        if (!payload) return;
        setIsRealtimeActive(true);
        setDatabaseLogs((prev) => {
          const payloadDate = new Date(payload.timestamp).toLocaleDateString("en-CA");
          const key = `${payload.nisn.trim()}_${payload.mode}_${payload.subject || ""}_${payloadDate}`;
          const exists = prev.some((item) => {
            const itemDate = new Date(item.timestamp).toLocaleDateString("en-CA");
            return item.id === payload.id || `${item.nisn.trim()}_${item.mode}_${item.subject || ""}_${itemDate}` === key;
          });
          let updated;
          if (exists) {
            updated = prev.map((item) => (item.id === payload.id ? payload : item));
          } else {
            updated = [payload, ...prev];
          }
          if (onCountChange) onCountChange(updated.length);
          return updated;
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [logDateMode, logSelectedDate, logSelectedMonth]);

  // Mode label helper
  const getModeLabel = (m: PresensiMode, subj?: string) => {
    switch (m) {
      case "harian":
        return "Scan Masuk (Gerbang)";
      case "dhuha":
        return "Sholat Dhuha";
      case "dzuhur":
        return "Sholat Dzuhur";
      case "ekstra":
        return subj ? `Ekstra: ${subj}` : "Ekstrakurikuler";
      default:
        return m;
    }
  };

  // Filtered dataset
  const filteredDatabaseLogs = useMemo(() => {
    return databaseLogs.filter((item) => {
      // 1. Search Query (Nama Siswa atau NISN)
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchName = item.studentName.toLowerCase().includes(q);
        const matchNisn = item.nisn.toLowerCase().includes(q);
        if (!matchName && !matchNisn) return false;
      }

      // 2. Mode Filter
      if (logModeFilter && item.mode !== logModeFilter) {
        return false;
      }

      // 3. Ekstra Sub-Filter
      if (logModeFilter === "ekstra" && logEkstraFilter && item.subject !== logEkstraFilter) {
        return false;
      }

      // 4. Class Filter
      if (historyClassFilter && item.kelas !== historyClassFilter) {
        return false;
      }

      // 5. Status Filter
      if (logStatusFilter && item.status !== logStatusFilter) {
        return false;
      }

      return true;
    });
  }, [databaseLogs, historySearch, logModeFilter, logEkstraFilter, historyClassFilter, logStatusFilter]);

  const uniqueStudentsCount = useMemo(() => {
    return new Set(filteredDatabaseLogs.map((i) => i.nisn)).size;
  }, [filteredDatabaseLogs]);

  // Unscanned Students Calculation
  const unscannedStudents = useMemo(() => {
    const scannedNisns = new Set(
      databaseLogs
        .filter((l) => (logModeFilter ? l.mode === logModeFilter : true))
        .map((l) => l.nisn.trim())
    );

    return students.filter((s) => {
      if (unscannedClassFilter && s.kelas !== unscannedClassFilter) return false;
      const sNisn = (s.nisn || s.nis || "").trim();
      return !scannedNisns.has(sNisn);
    });
  }, [students, databaseLogs, unscannedClassFilter, logModeFilter]);

  // Search matched students for Manual Attendance
  const searchMatchedStudents = useMemo(() => {
    if (!manualAddStudentSearch.trim()) return [];
    const q = manualAddStudentSearch.toLowerCase().trim();
    return students
      .filter((s) => (s.name || "").toLowerCase().includes(q) || (s.nisn || s.nis || "").toLowerCase().includes(q))
      .slice(0, 10);
  }, [students, manualAddStudentSearch]);

  // Toggle Status (Hadir <-> Terlambat)
  const handleToggleStatus = async (item: QRScanRecord) => {
    const newStatus: "Hadir" | "Terlambat" = item.status === "Hadir" ? "Terlambat" : "Hadir";
    try {
      setDatabaseLogs((prev) => prev.map((l) => (l.id === item.id ? { ...l, status: newStatus } : l)));
      await supabase.from("qr_presensi_logs").update({ status: newStatus }).eq("id", item.id);
      showAlert(`Status ${item.studentName} diubah menjadi ${newStatus}`, "Status Diperbarui");
    } catch (e) {
      console.warn("Failed to toggle status:", e);
    }
  };

  // Delete Record
  const handleDeleteHistory = async (id: string) => {
    const confirmed = await showConfirm(
      "Catatan presensi ini akan dihapus permanen dari database server. Lanjutkan?",
      "Hapus Catatan Presensi?"
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("qr_presensi_logs").delete().eq("id", id);
      if (!error) {
        setDatabaseLogs((prev) => {
          const updated = prev.filter((r) => r.id !== id);
          if (onCountChange) onCountChange(updated.length);
          return updated;
        });
        showAlert("Catatan presensi berhasil dihapus dari database", "Data Dihapus");
      }
    } catch (e) {
      console.warn("Failed to delete log:", e);
    }
  };

  // Reset Hari Ini (Admin only)
  const handleClearHistory = async () => {
    const confirmed = await showConfirm(
      "Tindakan ini akan mengosongkan seluruh catatan presensi hari ini dari server. Lanjutkan?",
      "Reset Presensi Hari Ini?"
    );
    if (!confirmed) return;

    try {
      const today = new Date();
      const startOfLocalToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      await supabase.from("qr_presensi_logs").delete().gte("scanned_at", startOfLocalToday.toISOString());
      localStorage.removeItem("simpanla_qr_scan_history");
      setDatabaseLogs([]);
      if (onCountChange) onCountChange(0);
      showAlert("Seluruh data presensi hari ini telah di-reset.", "Reset Berhasil");
    } catch (e) {
      console.warn("Failed to clear today logs:", e);
    }
  };

  // Save Manual Attendance
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForManual) {
      showAlert("Silakan cari dan pilih siswa terlebih dahulu.", "Pilih Siswa");
      return;
    }

    setSavingManual(true);
    try {
      const timestampIso = new Date(`${manualAddDate}T${manualAddTime}:00`).toISOString();
      const newRecord: QRScanRecord = {
        id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        nisn: selectedStudentForManual.nisn || selectedStudentForManual.nis || "-",
        studentName: selectedStudentForManual.name,
        kelas: selectedStudentForManual.kelas,
        timestamp: timestampIso,
        mode: manualAddMode,
        status: manualAddStatus,
        subject: manualAddMode === "ekstra" ? manualAddEkstra : undefined,
        notes: manualAddNotes.trim() ? `[Manual] ${manualAddNotes.trim()}` : "[Presensi Manual]",
      };

      await supabase.from("qr_presensi_logs").insert([
        {
          id: newRecord.id,
          student_id: selectedStudentForManual.id,
          student_name: newRecord.studentName,
          nisn: newRecord.nisn,
          kelas: newRecord.kelas,
          mode: newRecord.mode,
          status: newRecord.status,
          subject: newRecord.subject || null,
          scanned_at: newRecord.timestamp,
          notes: newRecord.notes,
          academic_year: academicYear || "2025/2026",
        },
      ]);

      setDatabaseLogs((prev) => {
        const updated = [newRecord, ...prev];
        if (onCountChange) onCountChange(updated.length);
        return updated;
      });

      setShowManualAddModal(false);
      setSelectedStudentForManual(null);
      setManualAddStudentSearch("");
      setManualAddNotes("");
      showAlert(`Presensi manual atas nama ${newRecord.studentName} berhasil disimpan.`, "Presensi Ditambahkan");
    } catch (err: any) {
      showAlert(err.message || "Terjadi kesalahan saat menyimpan presensi manual.", "Gagal Menyimpan");
    } finally {
      setSavingManual(false);
    }
  };

  // Save Edit Record
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      await supabase
        .from("qr_presensi_logs")
        .update({
          status: editingRecord.status,
          mode: editingRecord.mode,
          subject: editingRecord.subject || null,
          notes: editingRecord.notes || null,
        })
        .eq("id", editingRecord.id);

      setDatabaseLogs((prev) => prev.map((item) => (item.id === editingRecord.id ? editingRecord : item)));
      setEditingRecord(null);
      showAlert("Perubahan data presensi berhasil disimpan.", "Berhasil Diperbarui");
    } catch (err: any) {
      showAlert(err.message || "Terjadi kesalahan.", "Gagal Memperbarui");
    } finally {
      setSavingEdit(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredDatabaseLogs.length === 0) {
      showAlert("Tidak ada data presensi yang sesuai untuk diekspor.", "Data Kosong");
      return;
    }

    const headers = ["No", "Tanggal", "Jam", "NISN", "Nama Siswa", "Kelas", "Kegiatan", "Status", "Catatan"];
    const rows = filteredDatabaseLogs.map((item, idx) => {
      const d = new Date(item.timestamp);
      const dateStr = d.toLocaleDateString("id-ID");
      const timeStr = d.toLocaleTimeString("id-ID");
      const act = getModeLabel(item.mode, item.subject);
      return [
        idx + 1,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${item.nisn}"`,
        `"${item.studentName.replace(/"/g, '""')}"`,
        `"${item.kelas}"`,
        `"${act}"`,
        `"${item.status}"`,
        `"${(item.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Scan_Presensi_${logDateMode}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Unscanned to CSV
  const exportUnscannedToCSV = () => {
    if (unscannedStudents.length === 0) {
      showAlert("Semua siswa sudah melakukan presensi.", "Data Kosong");
      return;
    }

    const headers = ["No", "Nama Siswa", "NISN", "Kelas"];
    const rows = unscannedStudents.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.nisn || s.nis || "-"}"`,
      `"${s.kelas}"`,
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Siswa_Belum_Scan_${unscannedClassFilter || "Semua_Kelas"}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
        {/* Header & Live Sync Status */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="text-purple-600" size={22} />
                <span>Kelola Hasil Scan Presensi</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Realtime Database Sync Aktif</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Semua data scan presensi tersimpan otomatis di database server dan disinkronkan secara realtime antar semua akun guru, admin, dan perangkat pemindai.
            </p>
          </div>

          {/* Top Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedStudentForManual(null);
                setManualAddStudentSearch("");
                setShowManualAddModal(true);
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <PlusCircle size={15} />
              <span>+ Presensi Manual</span>
            </button>

            <button
              type="button"
              onClick={() => fetchDatabaseLogs(true)}
              disabled={loadingLogs}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 shadow-xs disabled:opacity-60"
              title="Muat ulang sinkronisasi data dari database server"
            >
              <RefreshCw size={14} className={loadingLogs ? "animate-spin text-purple-600" : ""} />
              <span>{loadingLogs ? "Menyinkronkan..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUnscannedModal(true)}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Lihat daftar siswa yang belum melakukan presensi"
            >
              <UserMinus size={14} />
              <span>Rekap Belum Scan</span>
            </button>

            <button
              type="button"
              onClick={exportToCSV}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Unduh data hasil scan yang terfilter dalam format Excel CSV"
            >
              <Download size={14} />
              <span>Download Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Cetak format laporan resmi presensi (PDF)"
            >
              <Printer size={14} />
              <span>Cetak / PDF</span>
            </button>

            {isAdmin && logDateMode === "today" && databaseLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200 dark:border-rose-800 active:scale-95"
              >
                <Trash2 size={14} />
                <span>Reset Hari Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50">
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold mb-1">
              <span>Total Scan Terfilter</span>
              <Clock size={16} className="text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-100">
              {filteredDatabaseLogs.length}
            </div>
            <div className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-0.5">
              Dari total {databaseLogs.length} data
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
              <span>Hadir Tepat Waktu</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {filteredDatabaseLogs.filter((i) => i.status === "Hadir").length}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
              {filteredDatabaseLogs.length > 0
                ? `${Math.round((filteredDatabaseLogs.filter((i) => i.status === "Hadir").length / filteredDatabaseLogs.length) * 100)}% dari total scan`
                : "0%"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold mb-1">
              <span>Terlambat</span>
              <AlertCircle size={16} className="text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-900 dark:text-rose-100">
              {filteredDatabaseLogs.filter((i) => i.status === "Terlambat").length}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400 mt-0.5">
              {filteredDatabaseLogs.length > 0
                ? `${Math.round((filteredDatabaseLogs.filter((i) => i.status === "Terlambat").length / filteredDatabaseLogs.length) * 100)}% dari total scan`
                : "0%"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold mb-1">
              <span>Siswa Unik</span>
              <Users size={16} className="text-slate-600 dark:text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {uniqueStudentsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Jumlah siswa berbeda</div>
          </div>
        </div>

        {/* Time Period Filter Switcher Tabs */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogDateMode("today")}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  logDateMode === "today"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setLogDateMode("date")}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  logDateMode === "date"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Pilih Tanggal
              </button>
              <button
                type="button"
                onClick={() => setLogDateMode("month")}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  logDateMode === "month"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Pilih Bulan
              </button>
              <button
                type="button"
                onClick={() => setLogDateMode("all")}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  logDateMode === "all"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Semua Data Database
              </button>
            </div>

            {/* Date or Month Picker Inputs */}
            {logDateMode === "date" && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Calendar size={15} className="text-purple-600" />
                <input
                  type="date"
                  value={logSelectedDate}
                  onChange={(e) => setLogSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            )}

            {logDateMode === "month" && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Calendar size={15} className="text-purple-600" />
                <input
                  type="month"
                  value={logSelectedMonth}
                  onChange={(e) => setLogSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Multi-Criteria Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama Siswa atau NISN..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Mode Filter */}
            <div>
              <select
                value={logModeFilter}
                onChange={(e) => {
                  setLogModeFilter(e.target.value);
                  if (e.target.value !== "ekstra") setLogEkstraFilter("");
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Semua Kegiatan</option>
                <option value="harian">Scan Masuk (Gerbang)</option>
                <option value="dhuha">Sholat Dhuha</option>
                <option value="dzuhur">Sholat Dzuhur</option>
                <option value="ekstra">Ekstrakurikuler</option>
              </select>
            </div>

            {/* Ekstra Sub Filter (if ekstra selected) OR Class Filter */}
            {logModeFilter === "ekstra" ? (
              <div>
                <select
                  value={logEkstraFilter}
                  onChange={(e) => setLogEkstraFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Semua Cabang Ekstra</option>
                  {EKSTRA_LIST.map((ek) => (
                    <option key={ek} value={ek}>
                      {ek}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <select
                  value={historyClassFilter}
                  onChange={(e) => setHistoryClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 text-center w-12">No</th>
                <th className="px-4 py-3">Waktu & Tanggal</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Kegiatan Presensi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loadingLogs && filteredDatabaseLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 italic">
                    <RefreshCw size={22} className="animate-spin text-purple-600 mx-auto mb-2" />
                    <span>Menyinkronkan data presensi dari database server...</span>
                  </td>
                </tr>
              ) : filteredDatabaseLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Clock size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                      Tidak ada data presensi yang sesuai filter
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {historySearch || historyClassFilter || logModeFilter || logStatusFilter
                        ? "Coba ubah atau bersihkan kriteria filter di atas."
                        : "Belum ada catatan presensi yang terekam pada periode ini."}
                    </p>
                    {(historySearch || historyClassFilter || logModeFilter || logStatusFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearch("");
                          setHistoryClassFilter("");
                          setLogModeFilter("");
                          setLogEkstraFilter("");
                          setLogStatusFilter("");
                        }}
                        className="mt-3 px-3 py-1.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold hover:bg-purple-200 inline-flex items-center gap-1"
                      >
                        <X size={12} />
                        <span>Reset Semua Filter</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDatabaseLogs.map((item, index) => {
                  const dateObj = new Date(item.timestamp);
                  const dateStr = dateObj.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const timeStr = dateObj.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-400 text-center">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{timeStr}</div>
                        <div className="text-[10px] text-slate-400">{dateStr}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                        {item.nisn}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                        {item.studentName}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-bold">
                          {item.kelas}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            item.mode === "harian"
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : item.mode === "dhuha"
                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              : item.mode === "dzuhur"
                              ? "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
                              : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {getModeLabel(item.mode, item.subject)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          title="Klik untuk mengubah status (Hadir <-> Terlambat)"
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                            item.status === "Terlambat"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {item.status}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] max-w-[150px] truncate">
                        {item.notes || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingRecord(item)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 rounded-lg transition-colors"
                            title="Edit Status / Catatan"
                          >
                            <Edit3 size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHistory(item.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="Hapus dari Database"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: TAMBAH PRESENSI MANUAL (TOP SCREEN POSITION) */}
      {showManualAddModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12 md:pt-14 overflow-y-auto bg-slate-950/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowManualAddModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5 my-auto sm:my-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center font-bold">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Input Presensi Manual
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tambahkan presensi siswa langsung ke database server
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance} className="space-y-4 text-xs">
              {/* Search & Select Student */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Pilih Siswa <span className="text-rose-500">*</span>
                </label>

                {selectedStudentForManual ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {selectedStudentForManual.name}
                      </div>
                      <div className="text-purple-700 dark:text-purple-300 text-xs font-bold mt-0.5">
                        Kelas {selectedStudentForManual.kelas} • NISN: {selectedStudentForManual.nisn || selectedStudentForManual.nis || "-"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForManual(null)}
                      className="px-2.5 py-1 bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg text-[11px] font-bold hover:bg-purple-300"
                    >
                      Ganti Siswa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik nama siswa atau NISN..."
                        value={manualAddStudentSearch}
                        onChange={(e) => setManualAddStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {manualAddStudentSearch.trim() && (
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {searchMatchedStudents.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 italic text-xs">
                            Tidak ada siswa yang cocok dengan "{manualAddStudentSearch}"
                          </div>
                        ) : (
                          searchMatchedStudents.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudentForManual(st);
                                setManualAddStudentSearch("");
                              }}
                              className="w-full text-left p-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between text-xs transition-colors"
                            >
                              <div>
                                <div className="font-extrabold text-slate-800 dark:text-slate-100">
                                  {st.name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Kelas {st.kelas} • NISN: {st.nisn || st.nis || "-"}
                                </div>
                              </div>
                              <span className="text-purple-600 font-bold text-[11px]">+ Pilih</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Tanggal</label>
                  <input
                    type="date"
                    value={manualAddDate}
                    onChange={(e) => setManualAddDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Waktu</label>
                  <input
                    type="time"
                    value={manualAddTime}
                    onChange={(e) => setManualAddTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Kegiatan Presensi */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Kegiatan Presensi</label>
                <select
                  value={manualAddMode}
                  onChange={(e) => setManualAddMode(e.target.value as PresensiMode)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                >
                  <option value="harian">Scan Masuk Gerbang (Presensi Harian)</option>
                  <option value="dhuha">Sholat Dhuha</option>
                  <option value="dzuhur">Sholat Dzuhur</option>
                  <option value="ekstra">Ekstrakurikuler</option>
                </select>
              </div>

              {manualAddMode === "ekstra" && (
                <div className="space-y-1 animate-fade-in">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Cabang Ekstrakurikuler</label>
                  <select
                    value={manualAddEkstra}
                    onChange={(e) => setManualAddEkstra(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  >
                    {EKSTRA_LIST.map((ek) => (
                      <option key={ek} value={ek}>
                        {ek}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Kehadiran */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Status Kehadiran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualAddStatus("Hadir")}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                      manualAddStatus === "Hadir"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    ✓ Hadir (Tepat Waktu)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualAddStatus("Terlambat")}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                      manualAddStatus === "Terlambat"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    ⚠ Terlambat
                  </button>
                </div>
              </div>

              {/* Catatan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Catatan / Keterangan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Izin terlambat dari orang tua, Kartu tertinggal, dll."
                  value={manualAddNotes}
                  onChange={(e) => setManualAddNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual || !selectedStudentForManual}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                >
                  {savingManual ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Simpan ke Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT RECORD (TOP SCREEN POSITION) */}
      {editingRecord && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12 md:pt-14 overflow-y-auto bg-slate-950/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setEditingRecord(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5 my-auto sm:my-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center font-bold">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Edit Data Presensi</h3>
                  <p className="text-[11px] text-slate-500">Perbarui status dan detail catatan presensi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-black text-slate-900 dark:text-white text-sm">
                  {editingRecord.studentName}
                </div>
                <div className="text-purple-700 dark:text-purple-300 text-xs font-bold mt-0.5">
                  Kelas {editingRecord.kelas} • NISN: {editingRecord.nisn}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Waktu: {new Date(editingRecord.timestamp).toLocaleString("id-ID")}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Status Kehadiran</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecord((prev) => (prev ? { ...prev, status: "Hadir" } : null))}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                      editingRecord.status === "Hadir"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    ✓ Hadir
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingRecord((prev) => (prev ? { ...prev, status: "Terlambat" } : null))}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition-all border ${
                      editingRecord.status === "Terlambat"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    ⚠ Terlambat
                  </button>
                </div>
              </div>

              {/* Kegiatan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Kegiatan</label>
                <select
                  value={editingRecord.mode}
                  onChange={(e) =>
                    setEditingRecord((prev) => (prev ? { ...prev, mode: e.target.value as PresensiMode } : null))
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                >
                  <option value="harian">Scan Masuk Gerbang (Presensi Harian)</option>
                  <option value="dhuha">Sholat Dhuha</option>
                  <option value="dzuhur">Sholat Dzuhur</option>
                  <option value="ekstra">Ekstrakurikuler</option>
                </select>
              </div>

              {editingRecord.mode === "ekstra" && (
                <div className="space-y-1 animate-fade-in">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Cabang Ekstra</label>
                  <select
                    value={editingRecord.subject || EKSTRA_LIST[0]}
                    onChange={(e) =>
                      setEditingRecord((prev) => (prev ? { ...prev, subject: e.target.value } : null))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  >
                    {EKSTRA_LIST.map((ek) => (
                      <option key={ek} value={ek}>
                        {ek}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Catatan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={editingRecord.notes || ""}
                  onChange={(e) => setEditingRecord((prev) => (prev ? { ...prev, notes: e.target.value } : null))}
                  placeholder="Keterangan..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REKAP SISWA BELUM SCAN (TOP SCREEN POSITION) */}
      {showUnscannedModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 pt-12 md:pt-14 overflow-y-auto animate-fade-in"
          onClick={() => setShowUnscannedModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh] my-auto sm:my-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <UserMinus size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-900 dark:text-amber-300">
                    Rekap Siswa Belum Scan
                  </h3>
                  <p className="text-xs font-bold text-amber-700/70 dark:text-amber-500/70">
                    Daftar siswa yang belum melakukan presensi{" "}
                    {logDateMode === "today" ? "hari ini" : "pada tanggal / periode yang dipilih"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUnscannedModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Total:{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-black text-lg">
                    {unscannedStudents.length}
                  </span>{" "}
                  Siswa Belum Scan
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={unscannedClassFilter}
                    onChange={(e) => setUnscannedClassFilter(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] border-y border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5 text-center w-12 border-r border-slate-200 dark:border-slate-700">
                        No
                      </th>
                      <th className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-700">Nama Siswa</th>
                      <th className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-700">NISN</th>
                      <th className="px-4 py-2.5 text-center">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {unscannedStudents.length > 0 ? (
                      unscannedStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-2 text-center font-bold text-slate-400 border-r border-slate-100 dark:border-slate-800">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                            {student.name}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-500 border-r border-slate-100 dark:border-slate-800">
                            {student.nisn || student.nis || "-"}
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-slate-600 dark:text-slate-400">
                            {student.kelas}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic">
                          Semua siswa {unscannedClassFilter ? `di Kelas ${unscannedClassFilter}` : ""} sudah melakukan presensi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 rounded-b-3xl flex justify-end gap-2">
              <button
                onClick={exportUnscannedToCSV}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-2 shadow-sm"
              >
                <Download size={14} />
                <span>Unduh CSV</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white transition-all flex items-center gap-2 shadow-sm"
              >
                <Printer size={14} />
                <span>Cetak (Print)</span>
              </button>
              <button
                onClick={() => setShowUnscannedModal(false)}
                className="px-5 py-2 rounded-xl font-bold text-xs bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CETAK LAPORAN RESMI (TOP SCREEN POSITION) */}
      {isPrintModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-10 md:pt-12 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto"
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div
            className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 my-2 sm:my-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Pratinjau Cetak Laporan Presensi Resmi
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} />
                  <span>Cetak Sekarang (Print / PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="printable-area p-6 space-y-6 border border-slate-200 rounded-2xl bg-white">
              {/* Official Kop Surat Header */}
              <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  PEMERINTAH KOTA PASURUAN
                </h4>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </h4>
                <h2 className="text-lg font-black uppercase text-slate-900">
                  UPT SMP NEGERI 8 PASURUAN
                </h2>
                <p className="text-[10px] text-slate-500">
                  Jl. KH Mansyur No. 162, Sekargadung, Kec. Purworejo, Kota Pasuruan, Jawa Timur 67127 | Telp: (0343) 422108 | Web: smpn8pasuruan.sch.id
                </p>
              </div>

              {/* Report Title & Metadata */}
              <div className="space-y-2">
                <h3 className="text-center text-sm font-black uppercase tracking-wide text-slate-900 underline decoration-slate-400">
                  LAPORAN REKAPITULASI SCAN PRESENSI DIGITAL SISWA
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <div>
                      <strong>Periode:</strong>{" "}
                      {logDateMode === "today"
                        ? "Hari Ini"
                        : logDateMode === "date"
                        ? logSelectedDate
                        : logDateMode === "month"
                        ? logSelectedMonth
                        : "Semua Periode Database"}
                    </div>
                    <div>
                      <strong>Jenis Presensi:</strong>{" "}
                      {logModeFilter ? getModeLabel(logModeFilter as PresensiMode, logEkstraFilter) : "Semua Kegiatan"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>
                      <strong>Total Siswa Tercatat:</strong> {filteredDatabaseLogs.length} Orang
                    </div>
                    <div>
                      <strong>Hadir:</strong> {filteredDatabaseLogs.filter((i) => i.status === "Hadir").length} |{" "}
                      <strong>Terlambat:</strong> {filteredDatabaseLogs.filter((i) => i.status === "Terlambat").length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of Records */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-slate-300">Waktu & Tanggal</th>
                      <th className="p-2 border-r border-slate-300">NISN</th>
                      <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                      <th className="p-2 border-r border-slate-300 text-center">Kelas</th>
                      <th className="p-2 border-r border-slate-300">Kegiatan</th>
                      <th className="p-2 border-r border-slate-300 text-center">Status</th>
                      <th className="p-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDatabaseLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                          Tidak ada data presensi pada kriteria ini.
                        </td>
                      </tr>
                    ) : (
                      filteredDatabaseLogs.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-2 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-mono text-[11px]">
                            {new Date(item.timestamp).toLocaleString("id-ID")}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-purple-800">
                            {item.nisn}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold">{item.studentName}</td>
                          <td className="p-2 border-r border-slate-200 text-center font-bold">{item.kelas}</td>
                          <td className="p-2 border-r border-slate-200 text-[11px]">
                            {getModeLabel(item.mode, item.subject)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            <span
                              className={`font-bold ${
                                item.status === "Terlambat" ? "text-rose-700" : "text-emerald-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-2 text-[11px] text-slate-600">{item.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Official Signatures Footer */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
                <div>
                  <p className="text-slate-500 mb-16">
                    Mengetahui,<br />
                    Guru Piket / Pembina Kegiatan
                  </p>
                  <p className="font-black text-slate-900 underline">( _____________________________ )</p>
                  <p className="text-[10px] text-slate-500">NIP. .....................................................</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-16">
                    Pasuruan,{" "}
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}<br />
                    Kepala UPT SMPN 8 Pasuruan
                  </p>
                  <p className="font-black text-slate-900 underline">( _____________________________ )</p>
                  <p className="text-[10px] text-slate-500">NIP. .....................................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
