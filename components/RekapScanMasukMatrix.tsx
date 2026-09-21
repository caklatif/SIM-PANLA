import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Student } from "../types";
import {
  Calendar,
  Filter,
  Printer,
  Search,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Check,
  X,
  FileSpreadsheet,
  Users,
  Edit3,
  Trash2,
  Plus,
  Loader2,
  LogIn,
  ShieldCheck,
  CalendarOff,
  AlertCircle,
} from "lucide-react";
import { showAlert, showConfirm } from "../utils/alert";
import { formatDateSignature } from "../utils/dateUtils";

interface RekapScanMasukMatrixProps {
  initialClass?: string;
  onOpenScan?: () => void;
  showHeader?: boolean;
}

interface StudentScanAttendance {
  student: Student;
  // Day of month (1-31) -> Record
  days: Record<
    number,
    {
      status: "Hadir" | "Terlambat" | "Sakit" | "Ijin" | "Dispen" | "Alpa";
      time?: string;
      notes?: string;
      id?: string;
      source?: "scan" | "jurnal" | "wali_kelas";
    }
  >;
  totalHadir: number;
  totalTerlambat: number;
  totalSakit: number;
  totalIjin: number;
  totalDispen: number;
  totalAlpa: number;
  totalKehadiran: number;
  persentase: number;
}

export const RekapScanMasukMatrix: React.FC<RekapScanMasukMatrixProps> = ({
  initialClass = "",
  onOpenScan,
  showHeader = true,
}) => {
  const { academicYear, profile } = useAuth();

  // Filters
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    "semua" | "hadir" | "terlambat" | "sakit" | "ijin" | "dispen"
  >("semua");
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
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [journalAttendanceLogs, setJournalAttendanceLogs] = useState<any[]>([]);
  const [nonEffectiveDays, setNonEffectiveDays] = useState<{ date: string; reason: string; hours?: string }[]>([]);

  // Admin Check
  const isUserAdmin =
    profile?.role === "admin" ||
    profile?.role === "operator" ||
    profile?.mengajar_mapel === "Kepala Sekolah";

  // Manage / Edit Modal States
  const [manageStudent, setManageStudent] = useState<Student | null>(null);
  const [quickCellModal, setQuickCellModal] = useState<{
    student: Student;
    day: number;
    logId?: string;
    date: string;
    time: string;
    status: "Hadir" | "Terlambat";
    isNew: boolean;
  } | null>(null);

  // Edit / Add in Manage Modal
  const [editingModalLog, setEditingModalLog] = useState<{
    id?: string;
    student: Student;
    date: string;
    time: string;
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
    school_address?: string;
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

  // Check if date is a holiday / non-effective day
  const getHolidayInfo = (day: number) => {
    const dayStr = String(day).padStart(2, "0");
    const isoDate = `${selectedMonth}-${dayStr}`;
    const found = nonEffectiveDays.find((h) => h.date?.trim() === isoDate);
    return found ? { isHoliday: true, reason: found.reason || "Hari Non-Efektif" } : { isHoliday: false, reason: "" };
  };

  // Get day of week abbreviation for a given date
  const getDayInfo = (day: number) => {
    const dateObj = new Date(yearNum, monthNum - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0: Sunday, 5: Friday, 6: Saturday
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const isSunday = dayOfWeek === 0;
    const isFriday = dayOfWeek === 5;
    const holidayInfo = getHolidayInfo(day);
    return { name: dayNames[dayOfWeek], isSunday, isFriday, ...holidayInfo };
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
            if (item.key === "non_effective_days") {
              try {
                const parsed = JSON.parse(item.value);
                if (Array.isArray(parsed)) setNonEffectiveDays(parsed);
              } catch (e) {}
            }
          });
          setSchoolSettings(sObj);
        }
      } catch (e) {}
    };

    fetchClasses();
    fetchSettings();
  }, []);

  // Fetch students and scan masuk attendance
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
      // Start and End ISO strings (with WIB timezone consideration)
      const startIso = `${selectedMonth}-01T00:00:00.000Z`;
      const endDay = String(daysInMonth).padStart(2, "0");
      const endIso = `${selectedMonth}-${endDay}T23:59:59.999Z`;

      let logQuery = supabase
        .from("qr_presensi_logs")
        .select("*")
        .eq("mode", "harian")
        .gte("scanned_at", startIso)
        .lte("scanned_at", endIso);

      if (selectedClass) {
        logQuery = logQuery.eq("kelas", selectedClass);
      }

      const { data: logData, error: logErr } = await logQuery;
      let logs = logData || [];

      // Also merge any local temporary / offline scan items
      try {
        const localHistoryRaw = localStorage.getItem("simpanla_qr_scan_history");
        if (localHistoryRaw) {
          const localItems = JSON.parse(localHistoryRaw);
          if (Array.isArray(localItems)) {
            localItems.forEach((p: any) => {
              if (p.mode === "harian" || !p.mode) {
                const itemTime = p.timestamp || p.scanned_at;
                if (itemTime && itemTime.startsWith(selectedMonth)) {
                  if (!selectedClass || p.kelas === selectedClass) {
                    if (!logs.some((l: any) => l.id === p.id)) {
                      logs.push({
                        id: p.id,
                        student_id: p.studentId || p.student_id,
                        student_name: p.studentName || p.student_name,
                        nisn: p.nisn,
                        kelas: p.kelas,
                        mode: "harian",
                        status: p.status || "Hadir",
                        scanned_at: itemTime,
                      });
                    }
                  }
                }
              }
            });
          }
        }
      } catch (e) {}

      // Fallback in journal_notes if needed
      if (logs.length === 0) {
        try {
          const { data: jnData } = await supabase
            .from("journal_notes")
            .select("*")
            .eq("category", "qr_presensi_log")
            .gte("created_at", startIso)
            .lte("created_at", endIso);

          if (jnData && jnData.length > 0) {
            const parsedJn = jnData
              .map((jn: any) => {
                try {
                  const parsed = JSON.parse(jn.note || "{}");
                  if (jn.follow_up === "harian" || parsed.mode === "harian") {
                    return {
                      id: jn.id,
                      student_id: jn.student_id,
                      student_name: jn.student_name,
                      nisn: parsed.nisn,
                      kelas: parsed.kelas,
                      mode: "harian",
                      status: parsed.status || "Hadir",
                      scanned_at: jn.created_at || parsed.timestamp,
                    };
                  }
                  return null;
                } catch (e) {
                  return null;
                }
              })
              .filter(Boolean);
            logs = [...logs, ...parsedJn];
          }
        } catch (e) {}
      }

      setScanLogs(logs);

      // 3. Fetch journal and homeroom attendance (Sakit, Ijin, Dispen, Alpa) for this month
      let combinedJournalLogs: any[] = [];
      const studentIds = loadedStudents.map((s) => s.id).filter(Boolean);

      if (studentIds.length > 0) {
        try {
          const startDateStr = `${selectedMonth}-01`;
          const endDateStr = `${selectedMonth}-${endDay}`;

          // Fetch attendance_logs (from Teacher KBM journals)
          let tLogQuery = supabase
            .from("attendance_logs")
            .select("id, student_id, student_name, status, created_at, subject, teacher_name")
            .in("student_id", studentIds)
            .gte("created_at", startIso)
            .lte("created_at", endIso);

          // Fetch homeroom_attendance (from Wali Kelas)
          let hLogQuery = supabase
            .from("homeroom_attendance")
            .select("id, student_id, status, date")
            .in("student_id", studentIds)
            .gte("date", startDateStr)
            .lte("date", endDateStr);

          const [{ data: tLogs, error: tErr }, { data: hLogs, error: hErr }] = await Promise.all([
            tLogQuery,
            hLogQuery,
          ]);

          if (tErr) console.warn("Notice: attendance_logs query:", tErr.message);
          if (hErr) console.warn("Notice: homeroom_attendance query:", hErr.message);

          if (tLogs && tLogs.length > 0) {
            tLogs.forEach((tl: any) => {
              combinedJournalLogs.push({
                id: tl.id,
                student_id: tl.student_id,
                student_name: tl.student_name,
                status: tl.status,
                date: tl.created_at ? tl.created_at.split("T")[0] : "",
                time: tl.created_at,
                source: "jurnal",
                notes: tl.subject ? `Jurnal: ${tl.subject} (${tl.teacher_name || "Guru"})` : "Jurnal Guru",
              });
            });
          }

          if (hLogs && hLogs.length > 0) {
            hLogs.forEach((hl: any) => {
              combinedJournalLogs.push({
                id: hl.id,
                student_id: hl.student_id,
                status: hl.status,
                date: hl.date,
                time: hl.date ? `${hl.date}T07:00:00.000Z` : "",
                source: "wali_kelas",
                notes: "Presensi Wali Kelas",
              });
            });
          }
        } catch (jErr) {
          console.warn("Error fetching journal/homeroom attendance logs:", jErr);
        }
      }

      setJournalAttendanceLogs(combinedJournalLogs);
    } catch (err: any) {
      console.error("fetchMatrixData error:", err);
      showAlert(`Gagal memuat rekap matriks scan masuk: ${err.message || err}`, "Gagal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [selectedMonth, selectedClass, academicYear]);

  // Handle clicking a day cell (Admin quick edit/add)
  const handleCellClick = (student: Student, day: number) => {
    if (!isUserAdmin) return;
    const existingLog = scanLogs.find((l) => {
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
        time: timeStr && timeStr.length === 5 ? timeStr : "06:45",
        status: existingLog.status === "Terlambat" ? "Terlambat" : "Hadir",
        isNew: false,
      });
    } else {
      setQuickCellModal({
        student,
        day,
        date: targetDate,
        time: "06:45",
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
        // Update existing
        const { error } = await supabase
          .from("qr_presensi_logs")
          .update({
            scanned_at: isoTimestamp,
            status: quickCellModal.status,
            mode: "harian",
          })
          .eq("id", quickCellModal.logId);

        if (error) throw error;
        showAlert(`Presensi scan masuk siswa ${quickCellModal.student.name} berhasil diperbarui.`, "Berhasil");
      } else {
        // Insert new
        const newId = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { error } = await supabase.from("qr_presensi_logs").insert([
          {
            id: newId,
            student_id: quickCellModal.student.id,
            student_name: quickCellModal.student.name,
            nisn: quickCellModal.student.nisn || quickCellModal.student.nis || "-",
            kelas: quickCellModal.student.kelas || selectedClass,
            mode: "harian",
            status: quickCellModal.status,
            scanned_at: isoTimestamp,
            academic_year: academicYear || "2025/2026",
            notes: "[Tambah Matriks Scan Masuk]",
          },
        ]);
        if (error) throw error;
        showAlert(`Presensi scan masuk siswa ${quickCellModal.student.name} berhasil ditambahkan.`, "Berhasil");
      }

      setQuickCellModal(null);
      await fetchMatrixData();
    } catch (err: any) {
      showAlert(`Gagal menyimpan presensi scan masuk: ${err.message || err}`, "Gagal");
    } finally {
      setSavingAction(false);
    }
  };

  // Delete scan log
  const handleDeleteScanLog = async (logId: string, studentName: string, dateLabel: string) => {
    const confirmed = await showConfirm(
      `Hapus data scan masuk siswa ${studentName} pada tanggal ${dateLabel}? Total scan akan berkurang.`,
      "Hapus Scan Masuk"
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("qr_presensi_logs").delete().eq("id", logId);
      if (error) throw error;

      showAlert(`Presensi scan masuk berhasil dihapus.`, "Data Dihapus");
      if (quickCellModal) setQuickCellModal(null);
      await fetchMatrixData();
    } catch (err: any) {
      showAlert(`Gagal menghapus presensi scan masuk: ${err.message || err}`, "Gagal");
    }
  };

  // Get student's scan logs in this month
  const getStudentLogs = (student: Student) => {
    return scanLogs
      .filter((l) => {
        if (l.student_id && student.id && l.student_id === student.id) return true;
        if (l.nisn && student.nisn && l.nisn.trim() === student.nisn.trim()) return true;
        if (l.student_name && student.name && l.student_name.trim().toLowerCase() === student.name.trim().toLowerCase()) return true;
        return false;
      })
      .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
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
            mode: "harian",
            status: editingModalLog.status,
          })
          .eq("id", editingModalLog.id);
        if (error) throw error;
        showAlert(`Presensi scan masuk berhasil diperbarui.`, "Berhasil");
      } else {
        const newId = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const { error } = await supabase.from("qr_presensi_logs").insert([
          {
            id: newId,
            student_id: manageStudent.id,
            student_name: manageStudent.name,
            nisn: manageStudent.nisn || manageStudent.nis || "-",
            kelas: manageStudent.kelas || selectedClass,
            mode: "harian",
            status: editingModalLog.status,
            scanned_at: isoTimestamp,
            academic_year: academicYear || "2025/2026",
            notes: "[Tambah Manual Admin]",
          },
        ]);
        if (error) throw error;
        showAlert(`Presensi scan masuk berhasil ditambahkan.`, "Berhasil");
      }

      setEditingModalLog(null);
      await fetchMatrixData();
    } catch (err: any) {
      showAlert(`Gagal menyimpan: ${err.message || err}`, "Gagal");
    } finally {
      setSavingAction(false);
    }
  };

  // Identify which days had scan masuk activity
  const activeDaysSet = useMemo(() => {
    const days = new Set<number>();
    scanLogs.forEach((l) => {
      const dt = new Date(l.scanned_at);
      const d = dt.getDate();
      days.add(d);
    });
    return days;
  }, [scanLogs]);

  const totalActiveDays = activeDaysSet.size;

  // Build matrix data per student
  const matrixData: StudentScanAttendance[] = useMemo(() => {
    // Map to hold entries by `${studentId/nisn/name}_${day}`
    const map = new Map<
      string,
      {
        status: "Hadir" | "Terlambat" | "Sakit" | "Ijin" | "Dispen" | "Alpa";
        time?: string;
        notes?: string;
        id?: string;
        source?: "scan" | "jurnal" | "wali_kelas";
      }
    >();

    // 1. First populate journal & homeroom attendance (S, I, D, A)
    journalAttendanceLogs.forEach((jLog) => {
      let day: number | null = null;
      if (jLog.date) {
        const parts = jLog.date.split("-");
        if (parts.length === 3) {
          day = parseInt(parts[2], 10);
        }
      } else if (jLog.time) {
        const dt = new Date(jLog.time);
        if (!isNaN(dt.getTime())) {
          day = dt.getDate();
        }
      }
      if (!day || isNaN(day) || day < 1 || day > daysInMonth) return;

      // Normalize status code to display label
      let mappedStatus: "Sakit" | "Ijin" | "Dispen" | "Alpa" | null = null;
      const sUpper = (jLog.status || "").trim().toUpperCase();
      if (sUpper === "S" || sUpper === "SAKIT") mappedStatus = "Sakit";
      else if (sUpper === "I" || sUpper === "IJIN" || sUpper === "IZIN") mappedStatus = "Ijin";
      else if (sUpper === "D" || sUpper === "DISPEN" || sUpper === "DISPENSASI") mappedStatus = "Dispen";
      else if (sUpper === "A" || sUpper === "ALPA" || sUpper === "ALPHA" || sUpper === "TANPA KETERANGAN")
        mappedStatus = "Alpa";

      if (!mappedStatus) return;

      const item = {
        status: mappedStatus,
        time: jLog.time,
        notes: jLog.notes,
        id: jLog.id,
        source: jLog.source as "jurnal" | "wali_kelas",
      };

      if (jLog.student_id) map.set(`${jLog.student_id}_${day}`, item);
      if (jLog.student_name) map.set(`${jLog.student_name.trim().toLowerCase()}_${day}`, item);
    });

    // 2. Then populate scan masuk logs (Takes priority for actual presence)
    scanLogs.forEach((log) => {
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
        notes: log.notes,
        id: log.id,
        source: "scan" as const,
      };

      if (keyStudentId) map.set(keyStudentId, item);
      if (keyStudentNisn) map.set(keyStudentNisn, item);
      if (keyStudentName) map.set(keyStudentName, item);
    });

    return students.map((st) => {
      const daysObj: Record<
        number,
        {
          status: "Hadir" | "Terlambat" | "Sakit" | "Ijin" | "Dispen" | "Alpa";
          time?: string;
          notes?: string;
          id?: string;
          source?: "scan" | "jurnal" | "wali_kelas";
        }
      > = {};

      let hadirCount = 0;
      let terlambatCount = 0;
      let sakitCount = 0;
      let ijinCount = 0;
      let dispenCount = 0;
      let alpaCount = 0;

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
          else if (record.status === "Sakit") sakitCount++;
          else if (record.status === "Ijin") ijinCount++;
          else if (record.status === "Dispen") dispenCount++;
          else if (record.status === "Alpa") alpaCount++;
        }
      }

      const totalHadir = hadirCount;
      const totalTerlambat = terlambatCount;
      const totalSakit = sakitCount;
      const totalIjin = ijinCount;
      const totalDispen = dispenCount;
      const totalAlpa = alpaCount;
      const totalKehadiran = totalHadir + totalTerlambat;
      const effectiveBaseDays = totalActiveDays > 0 ? totalActiveDays : 1;
      const persentase = Math.min(100, Math.round((totalKehadiran / effectiveBaseDays) * 100));

      return {
        student: st,
        days: daysObj,
        totalHadir,
        totalTerlambat,
        totalSakit,
        totalIjin,
        totalDispen,
        totalAlpa,
        totalKehadiran,
        persentase,
      };
    });
  }, [students, scanLogs, journalAttendanceLogs, daysInMonth, totalActiveDays]);

  // Filter matrix data by search and status pill
  const filteredMatrixData = useMemo(() => {
    let result = matrixData;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.student.name.toLowerCase().includes(q) ||
          (m.student.nisn && m.student.nisn.toLowerCase().includes(q)) ||
          (m.student.kelas && m.student.kelas.toLowerCase().includes(q))
      );
    }

    if (selectedStatusFilter === "hadir") {
      result = result.filter((m) => m.totalHadir > 0);
    } else if (selectedStatusFilter === "terlambat") {
      result = result.filter((m) => m.totalTerlambat > 0);
    } else if (selectedStatusFilter === "sakit") {
      result = result.filter((m) => m.totalSakit > 0);
    } else if (selectedStatusFilter === "ijin") {
      result = result.filter((m) => m.totalIjin > 0);
    } else if (selectedStatusFilter === "dispen") {
      result = result.filter((m) => m.totalDispen > 0);
    }

    return result;
  }, [matrixData, searchQuery, selectedStatusFilter]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const totalStudents = matrixData.length;
    const totalRecords = scanLogs.length;
    const avgPercentage =
      totalStudents > 0
        ? Math.round(
            matrixData.reduce((acc, curr) => acc + curr.persentase, 0) / totalStudents
          )
        : 0;

    const totalSakit = matrixData.reduce((acc, curr) => acc + curr.totalSakit, 0);
    const totalIjin = matrixData.reduce((acc, curr) => acc + curr.totalIjin, 0);
    const totalDispen = matrixData.reduce((acc, curr) => acc + curr.totalDispen, 0);

    return {
      totalStudents,
      totalRecords,
      totalActiveDays,
      avgPercentage,
      totalSakit,
      totalIjin,
      totalDispen,
    };
  }, [matrixData, scanLogs, totalActiveDays]);

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
      "Total Hadir (H)",
      "Total Terlambat (T)",
      "Total Sakit (S)",
      "Total Ijin (I)",
      "Total Dispen (D)",
      "Total Scan Masuk",
      "Persentase Kehadiran (%)",
    ];

    const rows = filteredMatrixData.map((item, idx) => {
      const dayValues = daysArray.map((d) => {
        const rec = item.days[d];
        if (!rec) return "-";
        if (rec.status === "Hadir") return "H";
        if (rec.status === "Terlambat") return "T";
        if (rec.status === "Sakit") return "S";
        if (rec.status === "Ijin") return "I";
        if (rec.status === "Dispen") return "D";
        if (rec.status === "Alpa") return "A";
        return "-";
      });

      return [
        idx + 1,
        `'${item.student.nisn || item.student.nis || "-"}`,
        `"${item.student.name.replace(/"/g, '""')}"`,
        item.student.kelas || selectedClass,
        ...dayValues,
        item.totalHadir,
        item.totalTerlambat,
        item.totalSakit,
        item.totalIjin,
        item.totalDispen,
        item.totalKehadiran,
        `${item.persentase}%`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const classLabel = selectedClass ? `Kelas_${selectedClass}` : "Semua_Kelas";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Matriks_Scan_Masuk_${classLabel}_${selectedMonth}.csv`
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

  // Status styling & code metadata helper for colored preview & print output
  const getPrintStatusInfo = (status?: string) => {
    switch (status) {
      case "Hadir":
        return {
          code: "✓",
          className: "status-cell-hadir",
          color: "#15803d", // emerald-700
          bg: "#dcfce7",    // emerald-100
          label: "Hadir Tepat Waktu",
        };
      case "Terlambat":
        return {
          code: "T",
          className: "status-cell-terlambat",
          color: "#b45309", // amber-700
          bg: "#fef3c7",    // amber-100
          label: "Terlambat",
        };
      case "Sakit":
        return {
          code: "S",
          className: "status-cell-sakit",
          color: "#1d4ed8", // blue-700
          bg: "#dbeafe",    // blue-100
          label: "Sakit",
        };
      case "Ijin":
        return {
          code: "I",
          className: "status-cell-ijin",
          color: "#7e22ce", // purple-700
          bg: "#f3e8ff",    // purple-100
          label: "Izin",
        };
      case "Dispen":
        return {
          code: "D",
          className: "status-cell-dispen",
          color: "#0f766e", // teal-700
          bg: "#ccfbf1",    // teal-100
          label: "Dispensasi",
        };
      case "Alpa":
      case "Alpha":
      default:
        return {
          code: "A",
          className: "status-cell-alpa",
          color: "#be123c", // rose-700
          bg: "#ffe4e6",    // rose-100
          label: "Alpa / Tanpa Keterangan",
        };
    }
  };

  // Clean Print Execution with dedicated isolated iframe engine
  const handlePrintExecution = () => {
    const reportElem = document.getElementById("printable-matrix-scan-doc");
    if (!reportElem) {
      window.print();
      return;
    }

    // Clean up previous frame if any
    const existing = document.getElementById("scan-matrix-print-frame");
    if (existing) {
      existing.remove();
    }

    // Create an off-screen iframe (CRITICAL: do NOT use visibility:hidden or width:0/height:0,
    // as Chromium will calculate a 0-sized viewport and skip painting, resulting in a blank print preview)
    const printFrame = document.createElement("iframe");
    printFrame.id = "scan-matrix-print-frame";
    printFrame.style.position = "fixed";
    printFrame.style.left = "-9999px";
    printFrame.style.top = "0";
    printFrame.style.width = "1024px";
    printFrame.style.height = "768px";
    printFrame.style.border = "none";
    printFrame.style.opacity = "0";
    printFrame.style.pointerEvents = "none";
    printFrame.style.zIndex = "-9999";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!frameDoc || !printFrame.contentWindow) {
      window.print();
      return;
    }

    // Clone element and resolve image src from the currently rendered DOM
    const clone = reportElem.cloneNode(true) as HTMLElement;
    const liveImg = reportElem.querySelector("img");
    const cloneImg = clone.querySelector("img");
    if (liveImg && cloneImg) {
      cloneImg.src = liveImg.currentSrc || liveImg.src;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <base href="${window.location.origin}/">
        <title>Rekapitulasi Presensi Scan Masuk - UPT SMP Negeri 8 Pasuruan</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 8.5px;
            line-height: 1.25;
            width: 100% !important;
          }
          body, body * {
            visibility: visible !important;
          }

          /* KOP SURAT TABLE */
          table.kop-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: none !important;
            border-bottom: 3px double #000000 !important;
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
          }
          table.kop-table td, table.kop-table th, table.kop-table tr {
            border: none !important;
            background: transparent !important;
          }
          img {
            max-height: 70px !important;
            width: auto !important;
            object-fit: contain !important;
            display: block !important;
          }

          /* MATRIX TABLE */
          table.matrix-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8px !important;
            margin-top: 4px !important;
            page-break-inside: auto !important;
          }
          table.matrix-table th, table.matrix-table td {
            border: 1px solid #000000 !important;
            padding: 2.5px 1.5px !important;
            vertical-align: middle !important;
          }
          table.matrix-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            text-align: center !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          /* CRITICAL COLOR RULES FOR STATUS PRINTING */
          .status-cell-hadir, td.status-cell-hadir {
            color: #15803d !important; /* emerald-700 */
            background-color: #dcfce7 !important; /* emerald-100 */
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .status-cell-terlambat, td.status-cell-terlambat {
            color: #b45309 !important; /* amber-700 */
            background-color: #fef3c7 !important; /* amber-100 */
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .status-cell-sakit, td.status-cell-sakit {
            color: #1d4ed8 !important; /* blue-700 */
            background-color: #dbeafe !important; /* blue-100 */
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .status-cell-ijin, td.status-cell-ijin {
            color: #7e22ce !important; /* purple-700 */
            background-color: #f3e8ff !important; /* purple-100 */
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .status-cell-dispen, td.status-cell-dispen {
            color: #0f766e !important; /* teal-700 */
            background-color: #ccfbf1 !important; /* teal-100 */
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .status-cell-alpa, td.status-cell-alpa {
            color: #be123c !important; /* rose-700 */
            background-color: #ffe4e6 !important; /* rose-100 */
            font-weight: 900 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* FOOTNOTE & BADGES */
          .flex { display: flex !important; }
          .inline-flex { display: inline-flex !important; }
          .items-center { align-items: center !important; }
          .flex-wrap { flex-wrap: wrap !important; }
          .gap-1 { gap: 4px !important; }
          .gap-2 { gap: 8px !important; }
          .gap-3 { gap: 12px !important; }
          .gap-3\\.5 { gap: 14px !important; }
          .gap-4 { gap: 16px !important; }
          .gap-8 { gap: 32px !important; }
          .border-t { border-top: 1px solid #cbd5e1 !important; }
          .pt-2 { padding-top: 8px !important; }
          .pt-6 { padding-top: 24px !important; }
          .mb-14 { margin-bottom: 52px !important; }
          .rounded { border-radius: 4px !important; }
          .px-1 { padding-left: 4px !important; padding-right: 4px !important; }
          .py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important; }
          .font-serif { font-family: "Times New Roman", Times, Georgia, serif !important; }

          /* SIGNATURES */
          .signature-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            margin-top: 20px !important;
            text-align: center !important;
            font-size: 10px !important;
            page-break-inside: avoid !important;
          }

          /* UTILITY HELPERS */
          .text-center { text-align: center !important; }
          .text-left { text-align: left !important; }
          .text-right { text-align: right !important; }
          .font-bold { font-weight: bold !important; }
          .font-extrabold { font-weight: 800 !important; }
          .font-black { font-weight: 900 !important; }
          .font-semibold { font-weight: 600 !important; }
          .uppercase { text-transform: uppercase !important; }
          .underline { text-decoration: underline !important; }
          .italic { font-style: italic !important; }
          .no-print, .print\\:hidden { display: none !important; }
        </style>
      </head>
      <body>
        <div id="printable-matrix-scan-doc">
          ${clone.innerHTML}
        </div>
      </body>
      </html>
    `);
    frameDoc.close();

    const doPrint = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (err) {
          console.error("Iframe print error:", err);
          window.print();
        }
      }, 300);
    };

    const frameImg = frameDoc.querySelector("img");
    if (frameImg && !frameImg.complete) {
      frameImg.onload = () => doPrint();
      frameImg.onerror = () => doPrint();
      setTimeout(doPrint, 800);
    } else {
      doPrint();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="rekap-scan-masuk-matrix-container">
      {/* Optional Top Intro Header */}
      {showHeader && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/10 blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30 mb-3">
                <Sparkles size={14} className="text-blue-300" />
                <span>Modul Rekapitulasi Presensi Masuk Gerbang</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <LogIn className="text-blue-400" size={28} />
                <span>Matrik Scan Masuk</span>
                <span className="text-xs md:text-sm font-semibold px-2.5 py-1 rounded-xl bg-white/10 text-blue-200 border border-white/10">
                  Matriks Bulanan Tanggal 1–31
                </span>
              </h2>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl">
                Pantau riwayat presensi scan masuk siswa per tanggal 1–31 dalam satu kelas secara detail,
                lengkap dengan status tepat waktu, keterlambatan, kalkulasi persentase, dan cetak laporan resmi landscape.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                id="btn-refresh-scan-matrix"
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
                id="btn-export-scan-matrix-excel"
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/40"
              >
                <FileSpreadsheet size={14} />
                <span>Download Excel</span>
              </button>
              <button
                type="button"
                id="btn-print-scan-matrix-pdf"
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
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
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
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Calendar size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Hari Masuk Aktif</div>
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
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Scan Masuk</div>
            <div className="text-xl font-black text-slate-800 dark:text-white">
              {overallStats.totalRecords}{" "}
              <span className="text-xs font-normal text-slate-400">Presensi</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
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
          {/* Status Tabs: Semua, Hadir, Terlambat, Sakit, Ijin, Dispen */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-2xl border border-slate-200/60 dark:border-slate-600/60 self-start flex-wrap">
            <button
              type="button"
              id="filter-status-all"
              onClick={() => setSelectedStatusFilter("semua")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === "semua"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Semua</span>
            </button>
            <button
              type="button"
              id="filter-status-hadir"
              onClick={() => setSelectedStatusFilter("hadir")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === "hadir"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Hadir (H)</span>
            </button>
            <button
              type="button"
              id="filter-status-terlambat"
              onClick={() => setSelectedStatusFilter("terlambat")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === "terlambat"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
              }`}
            >
              <Clock size={13} className="text-amber-500" />
              <span>Terlambat (T)</span>
            </button>
            <button
              type="button"
              id="filter-status-sakit"
              onClick={() => setSelectedStatusFilter("sakit")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === "sakit"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">
                S
              </span>
              <span>Sakit ({overallStats.totalSakit})</span>
            </button>
            <button
              type="button"
              id="filter-status-ijin"
              onClick={() => setSelectedStatusFilter("ijin")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === "ijin"
                  ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center text-[10px] font-black">
                I
              </span>
              <span>Ijin ({overallStats.totalIjin})</span>
            </button>
            <button
              type="button"
              id="filter-status-dispen"
              onClick={() => setSelectedStatusFilter("dispen")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === "dispen"
                  ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300 flex items-center justify-center text-[10px] font-black">
                D
              </span>
              <span>Dispen ({overallStats.totalDispen})</span>
            </button>
          </div>

          {/* Filters: Month, Class, Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
              <Calendar size={15} className="text-slate-400" />
              <input
                type="month"
                id="input-scan-matrix-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
              />
            </div>

            {/* Class Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
              <Filter size={15} className="text-slate-400" />
              <select
                id="select-scan-matrix-class"
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
                id="input-scan-matrix-search"
                placeholder="Cari siswa / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                title="Download data matriks scan masuk format Excel (CSV)"
              >
                <FileSpreadsheet size={14} />
                <span>Download Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs"
                title="Pratinjau Cetak Dokumen Resmi (PDF)"
              >
                <Printer size={14} />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend Information Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">
              Keterangan Matriks:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center">
                H
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Hadir (Scan)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                T
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Terlambat (Scan)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-blue-500 text-white font-black text-[10px] flex items-center justify-center">
                S
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Sakit (Jurnal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-purple-500 text-white font-black text-[10px] flex items-center justify-center">
                I
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Ijin (Jurnal)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-teal-500 text-white font-black text-[10px] flex items-center justify-center">
                D
              </span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Dispen (Jurnal)</span>
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
            <RefreshCw className="animate-spin text-blue-600" size={32} />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Memuat data matriks scan masuk bulan {monthTitle}...
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
                          info.isHoliday
                            ? "bg-amber-950/70 text-amber-300"
                            : info.isSunday
                              ? "bg-rose-950/70 text-rose-300"
                              : isActive
                                ? "bg-blue-950/80 text-blue-300"
                                : "bg-slate-900 text-slate-400"
                        }`}
                        title={
                          info.isHoliday
                            ? `Tanggal ${day}: ${info.reason}`
                            : `Tanggal ${day} (${info.name})`
                        }
                      >
                        <div className="text-[11px] font-black">{day}</div>
                        <div className="text-[9px] font-normal opacity-75">{info.name}</div>
                      </th>
                    );
                  })}

                  {/* Summary Columns */}
                  <th className="py-3.5 px-2 text-center bg-emerald-900/80 text-emerald-200 border-l border-r border-emerald-800 w-10" title="Total Hadir Tepat Waktu (H)">
                    H
                  </th>
                  <th className="py-3.5 px-2 text-center bg-amber-900/80 text-amber-200 border-r border-amber-800 w-10" title="Total Terlambat (T)">
                    T
                  </th>
                  <th className="py-3.5 px-2 text-center bg-blue-900/80 text-blue-200 border-r border-blue-800 w-10" title="Total Sakit (S)">
                    S
                  </th>
                  <th className="py-3.5 px-2 text-center bg-purple-900/80 text-purple-200 border-r border-purple-800 w-10" title="Total Ijin (I)">
                    I
                  </th>
                  <th className="py-3.5 px-2 text-center bg-teal-900/80 text-teal-200 border-r border-teal-800 w-10" title="Total Dispensasi (D)">
                    D
                  </th>
                  <th className="py-3.5 px-2.5 text-center bg-indigo-900/80 text-indigo-200 border-r border-indigo-800 w-12" title="Total Scan Masuk (H + T)">
                    Scan
                  </th>
                  <th className="py-3.5 px-3 text-center bg-slate-950 text-white min-w-[70px]">
                    % Hadir
                  </th>
                  {isUserAdmin && (
                    <th className="py-3.5 px-3 text-center bg-blue-950 text-blue-200 border-l border-blue-900 w-20" title="Kelola Riwayat Scan Siswa">
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
                              isUserAdmin ? "cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors" : ""
                            } ${
                              info.isHoliday
                                ? "bg-amber-50/40 dark:bg-amber-950/20 text-amber-400"
                                : info.isSunday
                                  ? "bg-rose-50/40 dark:bg-rose-950/20 text-rose-300"
                                  : "text-slate-300 dark:text-slate-600"
                            }`}
                            title={
                              info.isHoliday
                                ? `Tanggal ${day}: ${info.reason}`
                                : isUserAdmin
                                  ? `Tanggal ${day}: Belum ada scan masuk. Klik untuk Tambah Presensi.`
                                  : undefined
                            }
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
                              isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all" : ""
                            }`}
                            title={`Tanggal ${day}: Hadir (${record.time || "Tepat Waktu"})${isUserAdmin ? " (Klik untuk Edit / Hapus)" : ""}`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white font-black text-[10px] shadow-xs">
                              ✓
                            </span>
                          </td>
                        );
                      }

                      if (record.status === "Terlambat") {
                        return (
                          <td
                            key={day}
                            onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                            className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-amber-50/60 dark:bg-amber-950/30 ${
                              isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all" : ""
                            }`}
                            title={`Tanggal ${day}: Terlambat (${record.time || ""})${isUserAdmin ? " (Klik untuk Edit / Hapus)" : ""}`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500 text-white font-black text-[10px] shadow-xs">
                              T
                            </span>
                          </td>
                        );
                      }

                      if (record.status === "Sakit") {
                        return (
                          <td
                            key={day}
                            onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                            className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-blue-50/60 dark:bg-blue-950/30 ${
                              isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all" : ""
                            }`}
                            title={`Tanggal ${day}: Sakit (S) [${record.notes || "Data Jurnal"}]`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white font-black text-[10px] shadow-xs">
                              S
                            </span>
                          </td>
                        );
                      }

                      if (record.status === "Ijin") {
                        return (
                          <td
                            key={day}
                            onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                            className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-purple-50/60 dark:bg-purple-950/30 ${
                              isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all" : ""
                            }`}
                            title={`Tanggal ${day}: Ijin (I) [${record.notes || "Data Jurnal"}]`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-600 text-white font-black text-[10px] shadow-xs">
                              I
                            </span>
                          </td>
                        );
                      }

                      if (record.status === "Dispen") {
                        return (
                          <td
                            key={day}
                            onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                            className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-teal-50/60 dark:bg-teal-950/30 ${
                              isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all" : ""
                            }`}
                            title={`Tanggal ${day}: Dispensasi (D) [${record.notes || "Data Jurnal"}]`}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-teal-600 text-white font-black text-[10px] shadow-xs">
                              D
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => isUserAdmin && handleCellClick(row.student, day)}
                          className={`py-1 px-1 text-center border-r border-slate-100 dark:border-slate-700/40 bg-rose-50/60 dark:bg-rose-950/30 ${
                            isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all" : ""
                          }`}
                          title={`Tanggal ${day}: Alpa (A) [${record.notes || "Data Jurnal"}]`}
                        >
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-600 text-white font-black text-[10px] shadow-xs">
                            A
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
                    <td className="py-2.5 px-2 text-center font-black text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/20 border-r border-slate-100 dark:border-slate-700">
                      {row.totalSakit}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20 border-r border-slate-100 dark:border-slate-700">
                      {row.totalIjin}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-teal-600 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-950/20 border-r border-slate-100 dark:border-slate-700">
                      {row.totalDispen}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 border-r border-slate-100 dark:border-slate-700">
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
                          className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-800 dark:text-blue-300 font-bold transition-all text-[11px] inline-flex items-center gap-1 shadow-2xs border border-blue-200 dark:border-blue-800"
                          title="Kelola & Edit Semua Scan Masuk Siswa"
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
        <div className="print-modal-overlay fixed inset-0 z-[99999] flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-fade-in print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:overflow-visible print:block">
          <div className="print-modal-container bg-white text-slate-900 rounded-3xl p-6 md:p-8 max-w-6xl w-full shadow-2xl space-y-6 my-4 print:shadow-none print:rounded-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-4">
            {/* Header Action Bar (Hidden when print) */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Pratinjau Cetak Rekapitulasi Presensi Scan Masuk (Matriks Bulanan)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format cetak otomatis disesuaikan dengan kertas A4 Landscape dan Kop Resmi Sekolah.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-trigger-browser-print"
                  onClick={handlePrintExecution}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Dokumen (Landscape)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tips Cetak Berwarna Banner */}
            <div className="no-print bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-900 print:hidden shadow-xs">
              <AlertCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="font-bold text-[13px] text-emerald-950">
                  Panduan Cetak Dokumen Agar Warna &amp; Logo Muncul Sempurna:
                </p>
                <p className="text-emerald-800 text-xs leading-relaxed">
                  Pada jendela cetak printer (Print Preview browser), pastikan pengaturan <strong>Warna / Color</strong> diatur ke <strong>"Berwarna (Color)"</strong> (bukan Black and White) dan centang opsi <strong>"Grafik latar belakang (Background graphics)"</strong> pada menu Setelan Lainnya / More settings.
                </p>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-matrix-scan-doc" className="p-4 sm:p-6 bg-white print:p-0 space-y-4 text-slate-900">
              {/* Kop Surat Resmi */}
              <table
                className="kop-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                  borderBottom: "3px double #000000",
                  paddingBottom: "8px",
                  marginBottom: "12px",
                }}
              >
                <tbody>
                  <tr style={{ border: "none" }}>
                    <td
                      style={{
                        width: "80px",
                        verticalAlign: "middle",
                        textAlign: "center",
                        border: "none",
                        padding: "0 10px 8px 0",
                      }}
                    >
                      <img
                        src="/raw_logo.png"
                        alt="Logo Sekolah"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0";
                        }}
                        style={{
                          height: "72px",
                          width: "auto",
                          display: "block",
                          margin: "0 auto",
                          objectFit: "contain",
                        }}
                      />
                    </td>
                    <td
                      style={{
                        verticalAlign: "middle",
                        textAlign: "center",
                        border: "none",
                        padding: "0 80px 8px 0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "#1e293b",
                          lineHeight: "1.2",
                        }}
                      >
                        PEMERINTAH KOTA PASURUAN
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "#1e293b",
                          lineHeight: "1.2",
                          marginTop: "2px",
                        }}
                      >
                        DINAS PENDIDIKAN DAN KEBUDAYAAN
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "#000000",
                          lineHeight: "1.2",
                          margin: "3px 0",
                        }}
                      >
                        UPT SMP NEGERI 8 PASURUAN
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontStyle: "italic",
                          color: "#475569",
                          lineHeight: "1.3",
                        }}
                      >
                        {schoolSettings.school_address ||
                          "Jl. Veteran No. 12 Kota Pasuruan, Jawa Timur | Telp: (0343) 424785 | NPSN: 20535400"}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Title of Document */}
              <div style={{ textAlign: "center", margin: "0 0 10px 0" }}>
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "#000000",
                    textDecoration: "underline",
                    margin: "0 0 3px 0",
                  }}
                >
                  REKAPITULASI PRESENSI SCAN MASUK GERBANG (MATRIKS BULANAN)
                </h3>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#334155" }}>
                  Bulan: <strong style={{ color: "#000" }}>{monthTitle}</strong> &nbsp;|&nbsp; Kelas:{" "}
                  <strong style={{ color: "#000" }}>{selectedClass || "Semua Kelas"}</strong> &nbsp;|&nbsp; Tahun Pelajaran:{" "}
                  <strong style={{ color: "#000" }}>{academicYear || "2025/2026"}</strong>
                </div>
              </div>

              {/* Print Matrix Table */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="matrix-table w-full text-left text-[9px] border-collapse border border-black font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold text-center border-b border-black">
                      <th className="py-1 px-1 border border-black w-6">No</th>
                      <th className="py-1 px-2 border border-black min-w-[130px] text-left">Nama Siswa</th>
                      <th className="py-1 px-1 border border-black w-7">Kls</th>
                      {daysArray.map((d) => (
                        <th key={d} className="py-0.5 px-0.5 border border-black w-4 text-center font-mono">
                          {d}
                        </th>
                      ))}
                      <th className="py-0.5 px-1 border border-black w-6" title="Hadir">H</th>
                      <th className="py-0.5 px-1 border border-black w-6" title="Terlambat">T</th>
                      <th className="py-0.5 px-1 border border-black w-6" title="Sakit">S</th>
                      <th className="py-0.5 px-1 border border-black w-6" title="Ijin">I</th>
                      <th className="py-0.5 px-1 border border-black w-6" title="Dispen">D</th>
                      <th className="py-0.5 px-1 border border-black w-7" title="Total Kehadiran">Tot</th>
                      <th className="py-0.5 px-1 border border-black w-8">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrixData.map((row, idx) => (
                      <tr key={row.student.id || idx} className="border-b border-black">
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{idx + 1}</td>
                        <td className="py-0.5 px-2 border border-black font-bold text-slate-900 truncate max-w-[140px]">
                          {row.student.name}
                        </td>
                        <td className="py-0.5 px-1 border border-black text-center">{row.student.kelas || selectedClass}</td>
                        {daysArray.map((d) => {
                          const rec = row.days[d];
                          if (!rec) {
                            return (
                              <td key={d} className="py-0.5 px-0.5 border border-black text-center text-slate-400 font-mono text-[8px]">
                                -
                              </td>
                            );
                          }
                          const st = getPrintStatusInfo(rec.status);

                          return (
                            <td
                              key={d}
                              className={`py-0.5 px-0.5 border border-black text-center font-extrabold ${st.className}`}
                              style={{
                                color: st.color,
                                backgroundColor: st.bg,
                                WebkitPrintColorAdjust: "exact",
                                printColorAdjust: "exact",
                              }}
                            >
                              <span
                                style={{
                                  color: st.color,
                                  fontWeight: 800,
                                  WebkitPrintColorAdjust: "exact",
                                  printColorAdjust: "exact",
                                }}
                              >
                                {st.code}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{row.totalHadir}</td>
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{row.totalTerlambat}</td>
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{row.totalSakit}</td>
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{row.totalIjin}</td>
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{row.totalDispen}</td>
                        <td className="py-0.5 px-1 border border-black text-center font-black">{row.totalKehadiran}</td>
                        <td className="py-0.5 px-1 border border-black text-center font-bold">{row.persentase}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Print Legend Footnote with Colored Badges */}
              <div className="flex items-center gap-3.5 text-[8.5px] text-slate-800 font-sans border-t border-slate-300 pt-2 flex-wrap">
                <span className="font-bold text-black">Keterangan:</span>
                <span className="inline-flex items-center gap-1">
                  <strong
                    className="status-cell-hadir px-1 py-0.2 rounded font-black border border-emerald-400"
                    style={{ color: "#15803d", backgroundColor: "#dcfce7", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                  >
                    ✓
                  </strong>
                  <span>= Hadir Tepat Waktu</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <strong
                    className="status-cell-terlambat px-1 py-0.2 rounded font-black border border-amber-400"
                    style={{ color: "#b45309", backgroundColor: "#fef3c7", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                  >
                    T
                  </strong>
                  <span>= Terlambat</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <strong
                    className="status-cell-sakit px-1 py-0.2 rounded font-black border border-blue-400"
                    style={{ color: "#1d4ed8", backgroundColor: "#dbeafe", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                  >
                    S
                  </strong>
                  <span>= Sakit (KBM)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <strong
                    className="status-cell-ijin px-1 py-0.2 rounded font-black border border-purple-400"
                    style={{ color: "#7e22ce", backgroundColor: "#f3e8ff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                  >
                    I
                  </strong>
                  <span>= Izin (KBM)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <strong
                    className="status-cell-dispen px-1 py-0.2 rounded font-black border border-teal-400"
                    style={{ color: "#0f766e", backgroundColor: "#ccfbf1", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                  >
                    D
                  </strong>
                  <span>= Dispensasi</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <strong
                    className="status-cell-alpa px-1 py-0.2 rounded font-black border border-rose-400"
                    style={{ color: "#be123c", backgroundColor: "#ffe4e6", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                  >
                    A
                  </strong>
                  <span>= Alpa / Tanpa Keterangan</span>
                </span>
              </div>

              {/* Signatures */}
              <div className="signature-grid grid grid-cols-2 gap-8 pt-6 text-center text-xs font-serif">
                <div className="signature-box">
                  <p className="text-slate-700 mb-14">
                    Mengetahui,<br />
                    Kepala UPT SMPN 8 Pasuruan
                  </p>
                  <p className="font-bold underline text-black text-[11px]">
                    {schoolSettings.headmaster || "Drs. H. MUDAYAT"}
                  </p>
                  <p className="text-[10px] text-slate-700">
                    NIP. {schoolSettings.headmaster_nip || "19680512 199412 1 003"}
                  </p>
                </div>

                <div className="signature-box">
                  <p className="text-slate-700 mb-14">
                    Pasuruan, {formatDateSignature(new Date())}<br />
                    {selectedClass ? `Wali Kelas ${selectedClass}` : "Guru Piket / Petugas Presensi"}
                  </p>
                  <p className="font-bold underline text-black text-[11px]">
                    {profile?.full_name || "MOH. SYAIFULLOH, S.Pd.I"}
                  </p>
                  <p className="text-[10px] text-slate-700">
                    NIP. {profile?.nip || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PRINT CSS OVERRIDES FOR STANDARD CTRL+P AS WELL */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 6mm 8mm 6mm 8mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
              }
              body * {
                visibility: hidden !important;
              }
              .print-modal-overlay,
              .print-modal-container {
                position: static !important;
                display: block !important;
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                backdrop-filter: none !important;
                box-shadow: none !important;
                border: none !important;
              }
              #printable-matrix-scan-doc,
              #printable-matrix-scan-doc * {
                visibility: visible !important;
              }
              #printable-matrix-scan-doc {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                display: block !important;
                overflow: visible !important;
                height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .no-print, .print\\:hidden {
                display: none !important;
              }
              table.kop-table, table.kop-table td, table.kop-table th, table.kop-table tr {
                border: none !important;
                background: transparent !important;
              }
              table.kop-table {
                border-bottom: 3px double #000000 !important;
              }
              table.matrix-table {
                page-break-inside: auto !important;
                font-size: 8.5px !important;
              }
              table.matrix-table th, table.matrix-table td {
                border: 1px solid #000000 !important;
                padding: 2px 1px !important;
              }
              table.matrix-table th {
                background-color: #f1f5f9 !important;
              }

              /* Color preservation on direct print */
              .status-cell-hadir, td.status-cell-hadir {
                color: #15803d !important;
                background-color: #dcfce7 !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .status-cell-terlambat, td.status-cell-terlambat {
                color: #b45309 !important;
                background-color: #fef3c7 !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .status-cell-sakit, td.status-cell-sakit {
                color: #1d4ed8 !important;
                background-color: #dbeafe !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .status-cell-ijin, td.status-cell-ijin {
                color: #7e22ce !important;
                background-color: #f3e8ff !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .status-cell-dispen, td.status-cell-dispen {
                color: #0f766e !important;
                background-color: #ccfbf1 !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .status-cell-alpa, td.status-cell-alpa {
                color: #be123c !important;
                background-color: #ffe4e6 !important;
                font-weight: 900 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* QUICK CELL EDIT / ADD MODAL */}
      {quickCellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {quickCellModal.isNew ? "Tambah Scan Masuk" : "Edit Scan Masuk"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {quickCellModal.student.name} ({quickCellModal.student.kelas || selectedClass}) • Tanggal {quickCellModal.day}
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
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
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Status Presensi Masuk
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
                    handleDeleteScanLog(
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {savingAction ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{quickCellModal.isNew ? "Simpan Presensi" : "Perbarui"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE ALL SCANS FOR A STUDENT MODAL */}
      {manageStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600" />
                  <span>Kelola Presensi Scan Masuk Siswa</span>
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
              <div className="p-4 my-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    {editingModalLog.isNew ? "+ Tambah Scan Masuk (Menambah Jumlah Scan)" : "Edit Data Scan Masuk"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingModalLog(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal Form
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingAction && <Loader2 size={12} className="animate-spin" />}
                    <span>{editingModalLog.isNew ? "Simpan Presensi Baru" : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-3 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Total Scan Bulan Ini: <strong className="text-blue-600">{getStudentLogs(manageStudent).length} Kali</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingModalLog({
                      student: manageStudent,
                      date: `${selectedMonth}-01`,
                      time: "06:45",
                      status: "Hadir",
                      isNew: true,
                    })
                  }
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
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
                  Belum ada rekaman scan masuk untuk siswa ini pada bulan {monthTitle}.
                </div>
              ) : (
                getStudentLogs(manageStudent).map((log) => {
                  const d = new Date(log.scanned_at);
                  const dateFormatted = d.toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const timeFormatted = d.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <div
                      key={log.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                            log.status === "Hadir"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                          }`}
                        >
                          {log.status === "Hadir" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {dateFormatted} • {timeFormatted} WIB
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              Scan Masuk (Gerbang)
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
                              time: timeOnly.length === 5 ? timeOnly : "06:45",
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
                          onClick={() => handleDeleteScanLog(log.id, manageStudent.name, dateFormatted)}
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

export default RekapScanMasukMatrix;
