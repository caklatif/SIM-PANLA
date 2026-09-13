import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Student } from "../types";
import {
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Clock,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Users,
  Edit3,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { showAlert, showConfirm } from "../utils/alert";
import { formatDateIndo, formatDateSignature } from "../utils/dateUtils";

interface RekapSholatMatrixProps {
  initialClass?: string;
  initialMode?: "semua" | "dhuha" | "dzuhur";
  onOpenScan?: () => void;
  showHeader?: boolean;
}

interface StudentPrayerAttendance {
  student: Student;
  // Day of month (1-31) -> Record
  days: Record<number, { status: "Hadir" | "Terlambat"; time?: string; mode?: string }>;
  totalHadir: number;
  totalTerlambat: number;
  totalKehadiran: number;
  persentase: number;
}

export const RekapSholatMatrix: React.FC<RekapSholatMatrixProps> = ({
  initialClass = "",
  initialMode = "semua",
  onOpenScan,
  showHeader = true,
}) => {
  const { academicYear, semester, profile } = useAuth();

  // Filters
  const [selectedMode, setSelectedMode] = useState<"semua" | "dhuha" | "dzuhur">(initialMode);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data
  const [loading, setLoading] = useState<boolean>(false);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [prayerLogs, setPrayerLogs] = useState<any[]>([]);

  // Admin Check
  const isUserAdmin = profile?.role === "admin" || profile?.role === "operator" || profile?.mengajar_mapel === "Kepala Sekolah";

  // Manage / Edit Modal States
  const [manageStudent, setManageStudent] = useState<Student | null>(null);
  const [quickCellModal, setQuickCellModal] = useState<{
    student: Student;
    day: number;
    logId?: string;
    date: string;
    time: string;
    mode: "dhuha" | "dzuhur";
    status: "Hadir" | "Terlambat";
    isNew: boolean;
  } | null>(null);

  // Edit / Add in Manage Modal
  const [editingModalLog, setEditingModalLog] = useState<{
    id?: string;
    student: Student;
    date: string;
    time: string;
    mode: "dhuha" | "dzuhur";
    status: "Hadir" | "Terlambat";
    isNew: boolean;
  } | null>(null);

  const [savingAction, setSavingAction] = useState<boolean>(false);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [schoolSettings, setSchoolSettings] = useState<{
    headmaster?: string;
    headmaster_nip?: string;
    school_name?: string;
  }>({});

  // Calculate days in selected month
  const [yearNum, monthNum] = useMemo(() => {
    const parts = selectedMonth.split("-");
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [selectedMonth]);

  const daysInMonth = useMemo(() => {
    return new Date(yearNum, monthNum, 0).getDate();
  }, [yearNum, monthNum]);

  // Days list (1..daysInMonth)
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Get day of week abbreviation for a given date
  const getDayInfo = (day: number) => {
    const dateObj = new Date(yearNum, monthNum - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0: Sunday, 5: Friday, 6: Saturday
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const isSunday = dayOfWeek === 0;
    const isFriday = dayOfWeek === 5;
    return { name: dayNames[dayOfWeek], isSunday, isFriday };
  };

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("kelas")
          .order("kelas");
        if (!error && data) {
          const unique = Array.from(new Set(data.map((d: any) => d.kelas))).filter(Boolean).sort();
          setClassesList(unique as string[]);
          if (!selectedClass && unique.length > 0) {
            setSelectedClass(unique[0] as string);
          }
        }
      } catch (err) {
        console.warn("Fetch classes error:", err);
      }
    };

    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from("app_settings").select("*");
        if (data) {
          const sObj: any = {};
          data.forEach((item: any) => {
            sObj[item.key] = item.value;
          });
          setSchoolSettings(sObj);
        }
      } catch (e) {}
    };

    fetchClasses();
    fetchSettings();
  }, []);

  // Fetch students and prayer attendance
  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      let stQuery = supabase
        .from("students")
        .select("*")
        .order("name", { ascending: true });

      if (selectedClass) {
        stQuery = stQuery.eq("kelas", selectedClass);
      }
      if (academicYear) {
        stQuery = stQuery.eq("academic_year", academicYear);
      }

      const { data: stData, error: stErr } = await stQuery;
      if (stErr) {
        console.warn("Error fetching students:", stErr);
      }
      const loadedStudents: Student[] = stData || [];
      setStudents(loadedStudents);

      // 2. Fetch logs for this month
      // Start and End ISO strings
      const startIso = `${selectedMonth}-01T00:00:00.000Z`;
      const endDay = String(daysInMonth).padStart(2, "0");
      const endIso = `${selectedMonth}-${endDay}T23:59:59.999Z`;

      let logQuery = supabase
        .from("qr_presensi_logs")
        .select("*")
        .gte("scanned_at", startIso)
        .lte("scanned_at", endIso);

      if (selectedClass) {
        logQuery = logQuery.eq("kelas", selectedClass);
      }

      if (selectedMode === "dhuha") {
        logQuery = logQuery.eq("mode", "dhuha");
      } else if (selectedMode === "dzuhur") {
        logQuery = logQuery.eq("mode", "dzuhur");
      } else {
        logQuery = logQuery.in("mode", ["dhuha", "dzuhur"]);
      }

      const { data: logData, error: logErr } = await logQuery;
      let logs = logData || [];

      // Also check fallback in journal_notes if empty or to ensure complete records
      if (logs.length === 0) {
        try {
          let jnQuery = supabase
            .from("journal_notes")
            .select("*")
            .eq("category", "qr_presensi_log")
            .gte("created_at", startIso)
            .lte("created_at", endIso);

          if (selectedMode === "dhuha" || selectedMode === "dzuhur") {
            jnQuery = jnQuery.eq("follow_up", selectedMode);
          }

          const { data: jnData } = await jnQuery;
          if (jnData && jnData.length > 0) {
            const parsedJn = jnData
              .map((jn: any) => {
                try {
                  const parsed = JSON.parse(jn.note || "{}");
                  return {
                    id: jn.id,
                    student_id: jn.student_id,
                    student_name: jn.student_name,
                    nisn: parsed.nisn,
                    kelas: parsed.kelas,
                    mode: jn.follow_up || parsed.mode,
                    status: parsed.status || "Hadir",
                    scanned_at: jn.created_at || parsed.timestamp,
                  };
                } catch (e) {
                  return null;
                }
              })
              .filter(Boolean);
            logs = [...logs, ...parsedJn];
          }
        } catch (e) {}
      }

      setPrayerLogs(logs);
    } catch (err: any) {
      console.error("fetchMatrixData error:", err);
      showAlert(`Gagal memuat rekap matriks: ${err.message || err}`, "Gagal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [selectedMonth, selectedClass, selectedMode, academicYear]);

  // Handle clicking a day cell (Admin quick edit/add)
  const handleCellClick = (student: Student, day: number) => {
    if (!isUserAdmin) return;
    const existingLog = prayerLogs.find((l) => {
      const d = new Date(l.scanned_at);
      if (d.getDate() !== day) return false;
      if (l.student_id && student.id && l.student_id === student.id) return true;
      if (l.nisn && student.nisn && l.nisn.trim() === student.nisn.trim()) return true;
      if (l.student_name && student.name && l.student_name.trim().toLowerCase() === student.name.trim().toLowerCase()) return true;
      return false;
    });

    const dayStr = String(day).padStart(2, "0");
    const targetDate = `${selectedMonth}-${dayStr}`;

    if (existingLog) {
      const d = new Date(existingLog.scanned_at);
      const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
      setQuickCellModal({
        student,
        day,
        logId: existingLog.id,
        date: existingLog.scanned_at ? existingLog.scanned_at.split("T")[0] : targetDate,
        time: timeStr && timeStr.length === 5 ? timeStr : "07:00",
        mode: (existingLog.mode === "dzuhur" ? "dzuhur" : "dhuha"),
        status: (existingLog.status === "Terlambat" ? "Terlambat" : "Hadir"),
        isNew: false,
      });
    } else {
      setQuickCellModal({
        student,
        day,
        date: targetDate,
        time: selectedMode === "dzuhur" ? "12:00" : "07:00",
        mode: selectedMode === "dzuhur" ? "dzuhur" : "dhuha",
        status: "Hadir",
        isNew: true,
      });
    }
  };

  // Save quick cell modal
  const handleSaveQuickCell = async () => {
    if (!quickCellModal) return;
    setSavingAction(true);
    try {
      const isoTimestamp = new Date(`${quickCellModal.date}T${quickCellModal.time}:00+07:00`).toISOString();

      if (!quickCellModal.isNew && quickCellModal.logId) {
        // Update existing log
        const { error } = await supabase
          .from("qr_presensi_logs")
          .update({
            scanned_at: isoTimestamp,
            mode: quickCellModal.mode,
            status: quickCellModal.status,
          })
          .eq("id", quickCellModal.logId);

        if (error) throw error;
        showAlert(`Presensi sholat tanggal ${quickCellModal.day} untuk ${quickCellModal.student.name} berhasil diperbarui.`, "Berhasil");
      } else {
        // Create new log
        const newId = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { error } = await supabase.from("qr_presensi_logs").insert([
          {
            id: newId,
            student_id: quickCellModal.student.id,
            student_name: quickCellModal.student.name,
            nisn: quickCellModal.student.nisn || quickCellModal.student.nis || "-",
            kelas: quickCellModal.student.kelas || selectedClass,
            mode: quickCellModal.mode,
            status: quickCellModal.status,
            scanned_at: isoTimestamp,
            academic_year: academicYear || "2025/2026",
            notes: "[Edit Admin Rekap Sholat]",
          },
        ]);
        if (error) throw error;
        showAlert(`Presensi sholat tanggal ${quickCellModal.day} untuk ${quickCellModal.student.name} berhasil ditambahkan.`, "Berhasil");
      }

      setQuickCellModal(null);
      await fetchMatrixData();
    } catch (err: any) {
      console.error(err);
      showAlert(`Gagal menyimpan presensi sholat: ${err.message || err}`, "Gagal");
    } finally {
      setSavingAction(false);
    }
  };

  // Delete prayer log
  const handleDeletePrayerLog = async (logId: string, studentName: string, dateLabel?: string) => {
    const ok = await showConfirm(
      `Hapus data presensi sholat ${studentName}${dateLabel ? ` tanggal ${dateLabel}` : ""}? Tindakan ini akan memperbarui total kehadiran siswa.`,
      "Hapus Presensi Sholat?"
    );
    if (!ok) return;

    try {
      await supabase.from("qr_presensi_logs").delete().eq("id", logId);
      await supabase.from("journal_notes").delete().eq("id", logId);
      showAlert(`Presensi sholat berhasil dihapus.`, "Data Dihapus");
      if (quickCellModal) setQuickCellModal(null);
      await fetchMatrixData();
    } catch (err: any) {
      showAlert(`Gagal menghapus presensi sholat: ${err.message || err}`, "Gagal");
    }
  };

  // Get student's prayer logs in this month
  const getStudentLogs = (student: Student) => {
    return prayerLogs.filter((l) => {
      if (l.student_id && student.id && l.student_id === student.id) return true;
      if (l.nisn && student.nisn && l.nisn.trim() === student.nisn.trim()) return true;
      if (l.student_name && student.name && l.student_name.trim().toLowerCase() === student.name.trim().toLowerCase()) return true;
      return false;
    }).sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
  };

  // Open Manage Student
  const handleOpenManageStudent = (student: Student) => {
    setManageStudent(student);
    setEditingModalLog(null);
  };

  // Save or Add in Manage Student Modal
  const handleSaveManageLog = async () => {
    if (!editingModalLog || !manageStudent) return;
    setSavingAction(true);
    try {
      const isoTimestamp = new Date(`${editingModalLog.date}T${editingModalLog.time}:00+07:00`).toISOString();

      if (!editingModalLog.isNew && editingModalLog.id) {
        const { error } = await supabase
          .from("qr_presensi_logs")
          .update({
            scanned_at: isoTimestamp,
            mode: editingModalLog.mode,
            status: editingModalLog.status,
          })
          .eq("id", editingModalLog.id);
        if (error) throw error;
        showAlert(`Presensi sholat berhasil diperbarui.`, "Berhasil");
      } else {
        const newId = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { error } = await supabase.from("qr_presensi_logs").insert([
          {
            id: newId,
            student_id: manageStudent.id,
            student_name: manageStudent.name,
            nisn: manageStudent.nisn || manageStudent.nis || "-",
            kelas: manageStudent.kelas || selectedClass,
            mode: editingModalLog.mode,
            status: editingModalLog.status,
            scanned_at: isoTimestamp,
            academic_year: academicYear || "2025/2026",
            notes: "[Tambah Manual Admin]",
          },
        ]);
        if (error) throw error;
        showAlert(`Presensi sholat berhasil ditambahkan (total scan bertambah).`, "Berhasil");
      }

      setEditingModalLog(null);
      await fetchMatrixData();
    } catch (err: any) {
      showAlert(`Gagal menyimpan: ${err.message || err}`, "Gagal");
    } finally {
      setSavingAction(false);
    }
  };

  // Identify which days had prayer activity
  const activeDaysSet = useMemo(() => {
    const days = new Set<number>();
    prayerLogs.forEach((l) => {
      const dt = new Date(l.scanned_at);
      const d = dt.getDate();
      days.add(d);
    });
    return days;
  }, [prayerLogs]);

  const totalActiveDays = activeDaysSet.size;

  // Build matrix data per student
  const matrixData: StudentPrayerAttendance[] = useMemo(() => {
    // Map logs by key: `${studentId || studentName.toLowerCase()}_${day}`
    const map = new Map<string, { status: "Hadir" | "Terlambat"; time?: string; mode?: string }>();

    prayerLogs.forEach((log) => {
      const dt = new Date(log.scanned_at);
      const day = dt.getDate();
      const time = dt.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const keyStudentId = log.student_id ? `${log.student_id}_${day}` : null;
      const keyStudentNisn = log.nisn ? `${log.nisn.trim()}_${day}` : null;
      const keyStudentName = log.student_name
        ? `${log.student_name.trim().toLowerCase()}_${day}`
        : null;

      const item = {
        status: (log.status === "Terlambat" ? "Terlambat" : "Hadir") as "Hadir" | "Terlambat",
        time,
        mode: log.mode,
      };

      if (keyStudentId) map.set(keyStudentId, item);
      if (keyStudentNisn) map.set(keyStudentNisn, item);
      if (keyStudentName) map.set(keyStudentName, item);
    });

    return students.map((st) => {
      const daysObj: Record<number, { status: "Hadir" | "Terlambat"; time?: string; mode?: string }> = {};
      let hadirCount = 0;
      let terlambatCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        let record =
          (st.id ? map.get(`${st.id}_${d}`) : null) ||
          (st.nisn ? map.get(`${st.nisn.trim()}_${d}`) : null) ||
          (st.nis ? map.get(`${st.nis.trim()}_${d}`) : null) ||
          (st.name ? map.get(`${st.name.trim().toLowerCase()}_${d}`) : null);

        if (record) {
          daysObj[d] = record;
          if (record.status === "Hadir") hadirCount++;
          else if (record.status === "Terlambat") terlambatCount++;
        }
      }

      const totalHadir = hadirCount;
      const totalTerlambat = terlambatCount;
      const totalKehadiran = totalHadir + totalTerlambat;
      const effectiveBaseDays = totalActiveDays > 0 ? totalActiveDays : 1;
      const persentase = Math.min(100, Math.round((totalKehadiran / effectiveBaseDays) * 100));

      return {
        student: st,
        days: daysObj,
        totalHadir,
        totalTerlambat,
        totalKehadiran,
        persentase,
      };
    });
  }, [students, prayerLogs, daysInMonth, totalActiveDays]);

  // Filter matrix data by search
  const filteredMatrixData = useMemo(() => {
    if (!searchQuery.trim()) return matrixData;
    const q = searchQuery.toLowerCase().trim();
    return matrixData.filter(
      (m) =>
        m.student.name.toLowerCase().includes(q) ||
        (m.student.nisn && m.student.nisn.toLowerCase().includes(q)) ||
        (m.student.kelas && m.student.kelas.toLowerCase().includes(q))
    );
  }, [matrixData, searchQuery]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const totalStudents = matrixData.length;
    const totalRecords = prayerLogs.length;
    const avgPercentage =
      totalStudents > 0
        ? Math.round(
            matrixData.reduce((acc, curr) => acc + curr.persentase, 0) / totalStudents
          )
        : 0;

    return {
      totalStudents,
      totalRecords,
      totalActiveDays,
      avgPercentage,
    };
  }, [matrixData, prayerLogs, totalActiveDays]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    if (filteredMatrixData.length === 0) {
      showAlert("Tidak ada data siswa untuk diekspor ke CSV.", "Pemberitahuan");
      return;
    }

    const headers = [
      "No",
      "NISN",
      "Nama Siswa",
      "Kelas",
      ...daysArray.map((d) => `Tgl_${d}`),
      "Total Hadir",
      "Total Terlambat",
      "Total Sholat",
      "Persentase Kehadiran (%)",
    ];

    const rows = filteredMatrixData.map((item, idx) => {
      const dayValues = daysArray.map((d) => {
        const rec = item.days[d];
        if (!rec) return "-";
        return rec.status === "Hadir" ? "H" : "T";
      });

      return [
        idx + 1,
        `'${item.student.nisn || item.student.nis || "-"}`,
        `"${item.student.name.replace(/"/g, '""')}"`,
        item.student.kelas || selectedClass,
        ...dayValues,
        item.totalHadir,
        item.totalTerlambat,
        item.totalKehadiran,
        `${item.persentase}%`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const modeLabel =
      selectedMode === "dhuha"
        ? "Sholat_Dhuha"
        : selectedMode === "dzuhur"
          ? "Sholat_Dzuhur"
          : "Sholat_Dhuha_Dzuhur";
    const classLabel = selectedClass ? `Kelas_${selectedClass}` : "Semua_Kelas";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Matriks_Presensi_${modeLabel}_${classLabel}_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Month Title Formatter (e.g. September 2026)
  const monthTitle = useMemo(() => {
    const dt = new Date(yearNum, monthNum - 1, 1);
    return dt.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, [yearNum, monthNum]);

  return (
    <div className="space-y-6 animate-fade-in" id="rekap-sholat-matrix-container">
      {/* Optional Top Intro Header */}
      {showHeader && (
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 mb-3">
                <Sparkles size={14} className="text-emerald-300" />
                <span>Modul Rekapitulasi Presensi Keagamaan</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Rekap Khusus Sholat</span>
                <span className="text-xs md:text-sm font-semibold px-2.5 py-1 rounded-xl bg-white/10 text-emerald-200 border border-white/10">
                  Matriks Bulanan Tanggal 1–31
                </span>
              </h2>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
                Pantau kehadiran Sholat Dhuha dan Sholat Dzuhur berjamaah siswa per tanggal secara detail
                lengkap dengan kalkulasi persentase dan cetak laporan resmi landscape.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={fetchMatrixData}
                disabled={loading}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
                title="Muat ulang data real-time"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Segarkan</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/40"
              >
                <FileSpreadsheet size={14} />
                <span>Download Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-950/30"
              >
                <Printer size={14} />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Siswa</div>
            <div className="text-xl font-black text-slate-800 dark:text-white">
              {overallStats.totalStudents}{" "}
              <span className="text-xs font-normal text-slate-400">Anak</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Calendar size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Hari Sholat Aktif</div>
            <div className="text-xl font-black text-slate-800 dark:text-white">
              {overallStats.totalActiveDays}{" "}
              <span className="text-xs font-normal text-slate-400">Hari</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Scan Sholat</div>
            <div className="text-xl font-black text-slate-800 dark:text-white">
              {overallStats.totalRecords}{" "}
              <span className="text-xs font-normal text-slate-400">Presensi</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Rata-rata Kehadiran</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {overallStats.avgPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mode Tabs: Semua, Dhuha, Dzuhur */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-2xl border border-slate-200/60 dark:border-slate-600/60 self-start">
            <button
              type="button"
              onClick={() => setSelectedMode("semua")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedMode === "semua"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              <span>Semua Sholat</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode("dhuha")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedMode === "dhuha"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              <Sun size={14} className="text-amber-500" />
              <span>Sholat Dhuha</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode("dzuhur")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedMode === "dzuhur"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              <Moon size={14} className="text-emerald-500" />
              <span>Sholat Dzuhur</span>
            </button>
          </div>

          {/* Filters: Month, Class, Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
              <Calendar size={15} className="text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none"
              />
            </div>

            {/* Class Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
              <Filter size={15} className="text-slate-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="">Semua Kelas</option>
                {classesList.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Tombol Aksi: Download Excel & Cetak / PDF */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Download data matriks sholat format Excel (CSV)"
              >
                <FileSpreadsheet size={14} />
                <span>Download Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                title="Pratinjau Cetak Dokumen Resmi (PDF)"
              >
                <Printer size={14} />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">
              Keterangan Matriks:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center">
                H
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Hadir Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                T
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-400 font-black text-[10px] flex items-center justify-center border border-slate-200 dark:border-slate-600">
                -
              </span>
              <span className="text-slate-400 font-medium">Tidak Ada Catatan / Libur</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-800 dark:text-white">{filteredMatrixData.length}</strong> siswa
            di <strong className="text-slate-800 dark:text-white">{monthTitle}</strong>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE (1–31) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw className="animate-spin text-emerald-600" size={32} />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Memuat data matriks sholat bulan {monthTitle}...
            </p>
          </div>
        ) : filteredMatrixData.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
              <Search size={26} />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white">Tidak Ada Data Siswa</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tidak ditemukan data siswa untuk kelas {selectedClass || "terpilih"} atau filter pencarian "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-700 text-[11px]">
                  {/* Sticky Columns */}
                  <th className="py-3.5 px-3 sticky left-0 z-20 bg-slate-900 text-center w-12 border-r border-slate-700">
                    No
                  </th>
                  <th className="py-3.5 px-4 sticky left-12 z-20 bg-slate-900 min-w-[170px] border-r border-slate-700">
                    Nama Siswa
                  </th>
                  <th className="py-3.5 px-2.5 text-center w-16 border-r border-slate-700">
                    Kelas
                  </th>

                  {/* Day Columns 1..31 */}
                  {daysArray.map((day) => {
                    const info = getDayInfo(day);
                    const isActive = activeDaysSet.has(day);

                    return (
                      <th
                        key={day}
                        className={`py-2 px-1 text-center w-8 border-r border-slate-800 font-mono transition-colors ${
                          info.isSunday
                            ? "bg-rose-950/70 text-rose-300"
                            : isActive
                              ? "bg-emerald-950/80 text-emerald-300"
                              : "bg-slate-900 text-slate-400"
                        }`}
                        title={`Tanggal ${day} (${info.name})`}
                      >
                        <div className="text-[11px] font-black">{day}</div>
                        <div className="text-[9px] font-normal opacity-75">{info.name}</div>
                      </th>
                    );
                  })}

                  {/* Summary Columns */}
                  <th className="py-3.5 px-2.5 text-center bg-emerald-900/80 text-emerald-200 border-l border-r border-emerald-800 w-12" title="Total Hadir (H)">
                    H
                  </th>
                  <th className="py-3.5 px-2.5 text-center bg-amber-900/80 text-amber-200 border-r border-amber-800 w-12" title="Total Terlambat (T)">
                    T
                  </th>
                  <th className="py-3.5 px-2.5 text-center bg-purple-900/80 text-purple-200 border-r border-purple-800 w-14" title="Total Kehadiran Sholat">
                    Total
                  </th>
                  <th className="py-3.5 px-3 text-center bg-slate-950 text-white min-w-[80px]">
                    % Hadir
                  </th>
                  {isUserAdmin && (
                    <th className="py-3.5 px-3 text-center bg-purple-950 text-purple-200 border-l border-purple-900 w-20" title="Kelola Riwayat Scan Siswa">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                {filteredMatrixData.map((row, idx) => (
                  <tr
                    key={row.student.id || idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group"
                  >
                    {/* Sticky No */}
                    <td className="py-2.5 px-3 sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/40 text-center font-bold text-slate-500 border-r border-slate-100 dark:border-slate-700">
                      {idx + 1}
                    </td>

                    {/* Sticky Student Name */}
                    <td className="py-2.5 px-4 sticky left-12 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/40 border-r border-slate-100 dark:border-slate-700">
                      <div className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {row.student.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        NISN: {row.student.nisn || row.student.nis || "-"}
                      </div>
                    </td>

                    {/* Class */}
                    <td className="py-2.5 px-2 text-center font-bold text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700">
                      {row.student.kelas || selectedClass}
                    </td>

                    {/* Day Matrix Cells */}
                    {daysArray.map((day) => {
                      const record = row.days[day];
                      const info = getDayInfo(day);

                      if (!record) {
                        return (
                          <td
                            key={day}
                            onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                            className={`py-2 px-1 text-center font-mono text-[10px] border-r border-slate-100 dark:border-slate-700/40 ${
                              isUserAdmin ? "cursor-pointer hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-colors" : ""
                            } ${
                              info.isSunday ? "bg-rose-50/40 dark:bg-rose-950/20 text-rose-300" : "text-slate-300 dark:text-slate-600"
                            }`}
                            title={isUserAdmin ? `Tanggal ${day}: Belum ada scan. Klik untuk Tambah Presensi.` : undefined}
                          >
                            -
                          </td>
                        );
                      }

                      if (record.status === "Hadir") {
                        return (
                          <td
                            key={day}
                            onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                            className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-emerald-50/60 dark:bg-emerald-950/30 ${
                              isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-purple-500 hover:scale-105 transition-all" : ""
                            }`}
                            title={`Tanggal ${day}: Hadir (${record.time || ""}) - ${record.mode || ""}${isUserAdmin ? " (Klik untuk Edit / Hapus)" : ""}`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white font-black text-[10px] shadow-xs">
                              ✓
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                          className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-amber-50/60 dark:bg-amber-950/30 ${
                            isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-purple-500 hover:scale-105 transition-all" : ""
                          }`}
                          title={`Tanggal ${day}: Terlambat (${record.time || ""}) - ${record.mode || ""}${isUserAdmin ? " (Klik untuk Edit / Hapus)" : ""}`}
                        >
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white font-black text-[10px] shadow-xs">
                            T
                          </span>
                        </td>
                      );
                    })}

                    {/* Totals */}
                    <td className="py-2.5 px-2 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 border-l border-r border-slate-100 dark:border-slate-700">
                      {row.totalHadir}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20 border-r border-slate-100 dark:border-slate-700">
                      {row.totalTerlambat}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20 border-r border-slate-100 dark:border-slate-700">
                      {row.totalKehadiran}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            row.persentase >= 80
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : row.persentase >= 60
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                          }`}
                        >
                          {row.persentase}%
                        </span>
                      </div>
                    </td>

                    {/* Admin Action Column */}
                    {isUserAdmin && (
                      <td className="py-2.5 px-2 text-center border-l border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleOpenManageStudent(row.student)}
                          className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 text-purple-800 dark:text-purple-300 font-bold transition-all text-[11px] inline-flex items-center gap-1 shadow-2xs border border-purple-200 dark:border-purple-800"
                          title="Kelola & Edit Semua Scan Sholat Siswa"
                        >
                          <Edit3 size={12} />
                          <span>Kelola</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT MODAL (OFFICIAL LANDSCAPE REPORT) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 max-w-6xl w-full shadow-2xl space-y-6 my-4">
            {/* Header Action Bar (Hidden when print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Pratinjau Cetak Rekapitulasi Khusus Sholat (Matriks Bulanan)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Printer size={14} />
                  <span>Cetak Dokumen (Landscape)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-4 sm:p-6 bg-white print:p-0 space-y-5 text-slate-900">
              {/* Kop Surat Resmi */}
              <div className="text-center border-b-2 border-black pb-3 space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600">
                  PEMERINTAH KOTA PASURUAN
                </h3>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  DINAS PENDIDIKAN DAN KEBUDAYAAN
                </h4>
                <h2 className="text-lg md:text-xl font-black uppercase text-slate-900 tracking-tight">
                  UPT SMP NEGERI 8 PASURUAN
                </h2>
                <p className="text-[11px] text-slate-500">
                  Jl. Veteran No. 12 Kota Pasuruan, Jawa Timur | Telp: (0343) 424785 | NPSN: 20535400
                </p>
              </div>

              {/* Title of Document */}
              <div className="text-center space-y-1 pt-1">
                <h3 className="text-base font-black underline uppercase text-slate-900 tracking-wide">
                  REKAPITULASI PRESENSI SHOLAT BERJAMAAH (MATRIKS BULANAN)
                </h3>
                <p className="text-xs font-medium text-slate-600">
                  Bulan: <strong className="text-black">{monthTitle}</strong> | Kegiatan:{" "}
                  <strong className="text-black">
                    {selectedMode === "dhuha"
                      ? "Sholat Dhuha"
                      : selectedMode === "dzuhur"
                        ? "Sholat Dzuhur"
                        : "Sholat Dhuha & Dzuhur"}
                  </strong>{" "}
                  | Kelas: <strong className="text-black">{selectedClass || "Semua Kelas"}</strong> | Tahun Pelajaran:{" "}
                  <strong className="text-black">{academicYear || "2025/2026"}</strong>
                </p>
              </div>

              {/* Print Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse border border-black font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold text-center border-b border-black">
                      <th className="py-2 px-1 border border-black w-8">No</th>
                      <th className="py-2 px-2 border border-black min-w-[140px] text-left">Nama Siswa</th>
                      <th className="py-2 px-1 border border-black w-10">Kls</th>
                      {daysArray.map((d) => (
                        <th key={d} className="py-1 px-0.5 border border-black w-5 text-center font-mono">
                          {d}
                        </th>
                      ))}
                      <th className="py-2 px-1 border border-black w-8">H</th>
                      <th className="py-2 px-1 border border-black w-8">T</th>
                      <th className="py-2 px-1 border border-black w-9">Tot</th>
                      <th className="py-2 px-1 border border-black w-10">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrixData.map((row, idx) => (
                      <tr key={row.student.id || idx} className="border-b border-black">
                        <td className="py-1 px-1 border border-black text-center font-bold">{idx + 1}</td>
                        <td className="py-1 px-2 border border-black font-bold text-slate-900 truncate max-w-[160px]">
                          {row.student.name}
                        </td>
                        <td className="py-1 px-1 border border-black text-center">{row.student.kelas || selectedClass}</td>
                        {daysArray.map((d) => {
                          const rec = row.days[d];
                          const txt = !rec ? "" : rec.status === "Hadir" ? "✓" : "T";
                          return (
                            <td
                              key={d}
                              className={`py-0.5 px-0.5 border border-black text-center font-bold ${
                                rec?.status === "Hadir"
                                  ? "text-emerald-700 bg-emerald-50/40"
                                  : rec?.status === "Terlambat"
                                    ? "text-amber-700 bg-amber-50/40"
                                    : ""
                              }`}
                            >
                              {txt}
                            </td>
                          );
                        })}
                        <td className="py-1 px-1 border border-black text-center font-bold">{row.totalHadir}</td>
                        <td className="py-1 px-1 border border-black text-center font-bold">{row.totalTerlambat}</td>
                        <td className="py-1 px-1 border border-black text-center font-black">{row.totalKehadiran}</td>
                        <td className="py-1 px-1 border border-black text-center font-bold">{row.persentase}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-serif">
                <div>
                  <p className="text-slate-600 mb-16">
                    Mengetahui,<br />
                    Kepala UPT SMPN 8 Pasuruan
                  </p>
                  <p className="font-bold underline text-slate-900">
                    {schoolSettings.headmaster || "Drs. H. MUDAYAT"}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    NIP. {schoolSettings.headmaster_nip || "19680512 199412 1 003"}
                  </p>
                </div>

                <div>
                  <p className="text-slate-600 mb-16">
                    Pasuruan, {formatDateSignature(new Date())}<br />
                    Guru PAI / Pembina Keagamaan
                  </p>
                  <p className="font-bold underline text-slate-900">
                    {profile?.full_name || "MOH. SYAIFULLOH, S.Pd.I"}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    NIP. {profile?.nip || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CELL EDIT / ADD MODAL */}
      {quickCellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {quickCellModal.isNew ? "Tambah Presensi Sholat" : "Edit Presensi Sholat"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {quickCellModal.student.name} ({quickCellModal.student.kelas}) • Tanggal {quickCellModal.day}
                </p>
              </div>
              <button
                onClick={() => setQuickCellModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tanggal Presensi
                </label>
                <input
                  type="date"
                  value={quickCellModal.date}
                  onChange={(e) => setQuickCellModal({ ...quickCellModal, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              {/* Jam */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Jam Scan (WIB)
                </label>
                <input
                  type="time"
                  value={quickCellModal.time}
                  onChange={(e) => setQuickCellModal({ ...quickCellModal, time: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              {/* Mode Sholat */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Jenis Sholat
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCellModal({ ...quickCellModal, mode: "dhuha" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                      quickCellModal.mode === "dhuha"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Sholat Dhuha
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCellModal({ ...quickCellModal, mode: "dzuhur" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                      quickCellModal.mode === "dzuhur"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Sholat Dzuhur
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Status Presensi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCellModal({ ...quickCellModal, status: "Hadir" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      quickCellModal.status === "Hadir"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Hadir (Tepat Waktu)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCellModal({ ...quickCellModal, status: "Terlambat" })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                      quickCellModal.status === "Terlambat"
                        ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Clock size={14} />
                    <span>Terlambat</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 gap-2">
              {!quickCellModal.isNew && quickCellModal.logId ? (
                <button
                  type="button"
                  onClick={() =>
                    quickCellModal.logId &&
                    handleDeletePrayerLog(
                      quickCellModal.logId,
                      quickCellModal.student.name,
                      String(quickCellModal.day)
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Hapus Scan</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickCellModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingAction}
                  onClick={handleSaveQuickCell}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {savingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{quickCellModal.isNew ? "Simpan Presensi" : "Perbarui"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE ALL PRAYER SCANS FOR A STUDENT MODAL */}
      {manageStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Edit3 size={18} className="text-purple-600" />
                  <span>Kelola Presensi Sholat Siswa</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{manageStudent.name}</span> • Kelas {manageStudent.kelas || selectedClass} • NISN: {manageStudent.nisn || "-"}
                </p>
              </div>
              <button
                onClick={() => {
                  setManageStudent(null);
                  setEditingModalLog(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-form: Add / Edit Log */}
            {editingModalLog ? (
              <div className="p-4 my-3 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    {editingModalLog.isNew ? "+ Tambah Presensi Sholat (Menambah Jumlah Scan)" : "Edit Data Scan Sholat"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingModalLog(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal Form
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={editingModalLog.date}
                      onChange={(e) => setEditingModalLog({ ...editingModalLog, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Jam (WIB)
                    </label>
                    <input
                      type="time"
                      value={editingModalLog.time}
                      onChange={(e) => setEditingModalLog({ ...editingModalLog, time: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Jenis Sholat
                    </label>
                    <select
                      value={editingModalLog.mode}
                      onChange={(e) => setEditingModalLog({ ...editingModalLog, mode: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    >
                      <option value="dhuha">Dhuha</option>
                      <option value="dzuhur">Dzuhur</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Status
                    </label>
                    <select
                      value={editingModalLog.status}
                      onChange={(e) => setEditingModalLog({ ...editingModalLog, status: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    >
                      <option value="Hadir">Hadir (Tepat Waktu)</option>
                      <option value="Terlambat">Terlambat</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingModalLog(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={savingAction}
                    onClick={handleSaveManageLog}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingAction && <Loader2 size={12} className="animate-spin" />}
                    <span>{editingModalLog.isNew ? "Simpan Presensi Baru" : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Total Scan Bulan Ini: <strong className="text-purple-600">{getStudentLogs(manageStudent).length} Kali</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingModalLog({
                      student: manageStudent,
                      date: `${selectedMonth}-01`,
                      time: selectedMode === "dzuhur" ? "12:00" : "07:00",
                      mode: selectedMode === "dzuhur" ? "dzuhur" : "dhuha",
                      status: "Hadir",
                      isNew: true,
                    })
                  }
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus size={14} />
                  <span>Tambah Presensi (Tambah Scan)</span>
                </button>
              </div>
            )}

            {/* List of Student's Scans */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl my-2">
              {getStudentLogs(manageStudent).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada catatan scan sholat untuk siswa ini pada bulan terpilih.
                </div>
              ) : (
                getStudentLogs(manageStudent).map((log, index) => {
                  const d = new Date(log.scanned_at);
                  const dateFormatted = formatDateIndo(d.toISOString().split("T")[0]);
                  const timeFormatted = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={log.id || index}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            log.status === "Hadir"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {log.status === "Hadir" ? "✓" : "T"}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span>{dateFormatted}</span>
                            <span className="font-mono text-[11px] text-slate-500">({timeFormatted} WIB)</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="capitalize font-semibold text-purple-600 dark:text-purple-400">
                              Sholat {log.mode || "Dhuha"}
                            </span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                log.status === "Hadir" ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {log.status === "Hadir" ? "Tepat Waktu" : "Terlambat"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const dateOnly = log.scanned_at.split("T")[0];
                            const timeOnly = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
                            setEditingModalLog({
                              id: log.id,
                              student: manageStudent,
                              date: dateOnly,
                              time: timeOnly.length === 5 ? timeOnly : "07:00",
                              mode: log.mode === "dzuhur" ? "dzuhur" : "dhuha",
                              status: log.status === "Terlambat" ? "Terlambat" : "Hadir",
                              isNew: false,
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Edit Tanggal / Jam / Status Scan"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrayerLog(log.id, manageStudent.name, dateFormatted)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors"
                          title="Hapus Scan Ini (Mengurangi Total Scan)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setManageStudent(null);
                  setEditingModalLog(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RekapSholatMatrix;
