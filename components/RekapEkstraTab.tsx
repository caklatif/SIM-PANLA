import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Student } from "../types";
import { checkIsPembinaEkstra } from "../utils/pembinaHelper";
import {
  Trophy,
  Search,
  Printer,
  Download,
  RefreshCw,
  Scan,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  UserCheck,
  Award,
  Layers,
  Lock,
  ShieldCheck,
  Edit3,
  Trash2,
  Plus,
  Loader2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { showAlert, showConfirm } from "../utils/alert";
import { formatDateSignature, formatDateIndo } from "../utils/dateUtils";
import { EKSTRA_LIST as BASE_EKSTRA_LIST } from "../pages/PresensiQR";

export const RekapEkstraTab: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isAdmin, isOperator, academicYear } = useAuth();

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [rekapLogs, setRekapLogs] = useState<any[]>([]);

  // Ekstra list dynamically loaded & unified from settings + logs + master
  const [ekstraList, setEkstraList] = useState<string[]>(BASE_EKSTRA_LIST);
  const [pembinaList, setPembinaList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("simpanla_pembina_ekstra_list");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const isUserAdmin = Boolean(isAdmin || isOperator);
  const pembinaStatus = checkIsPembinaEkstra(profile, pembinaList);
  const isUserPembina = pembinaStatus.isPembina;
  const userAssignedEkstras = pembinaStatus.assignedEkstras;
  const isUserPramuka = pembinaStatus.isPramuka;

  // Filter States
  const [selectedEkstra, setSelectedEkstra] = useState<string>(() => {
    if (!isUserAdmin && isUserPembina && userAssignedEkstras.length > 0) {
      if (isUserPramuka) return "PRAMUKA";
      return userAssignedEkstras[0];
    }
    return BASE_EKSTRA_LIST[0] || "PRAMUKA";
  });
  const [rekapMonth, setRekapMonth] = useState<string>(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${yr}-${mo}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [onlyParticipated, setOnlyParticipated] = useState(true);

  // Settings Kop Surat
  const [settings, setSettings] = useState({
    headmaster: "ARIF SYAIFURROHMAN, S.Pd",
    headmaster_nip: "198106202009041003",
  });

  // Manage Ekstra Attendance Modal State
  const [manageStudentEkstra, setManageStudentEkstra] = useState<{
    nisn: string;
    name: string;
    kelas: string;
  } | null>(null);

  const [editingEkstraLog, setEditingEkstraLog] = useState<{
    id?: string;
    date: string;
    time: string;
    status: "Hadir" | "Terlambat";
    isNew: boolean;
  } | null>(null);

  const [savingAction, setSavingAction] = useState<boolean>(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState<boolean>(false);

  // Load Students and Settings
  useEffect(() => {
    fetchInitialData();
  }, [academicYear]);

  // Enforce lock to assigned extra (e.g. PRAMUKA) for non-admin Pembina
  useEffect(() => {
    if (!isUserAdmin && isUserPembina && userAssignedEkstras.length > 0) {
      if (isUserPramuka && selectedEkstra.toLowerCase() !== "pramuka") {
        setSelectedEkstra("PRAMUKA");
      } else if (!userAssignedEkstras.some((e) => e.toLowerCase() === selectedEkstra.toLowerCase())) {
        setSelectedEkstra(userAssignedEkstras[0]);
      }
    }
  }, [isUserAdmin, isUserPembina, isUserPramuka, userAssignedEkstras, selectedEkstra]);

  // Load Ekstra Logs when filters change
  useEffect(() => {
    if (selectedEkstra) {
      fetchRekapLogs();
    }
  }, [selectedEkstra, rekapMonth, academicYear]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch students
      let query = supabase
        .from("students")
        .select("*")
        .order("kelas", { ascending: true })
        .order("name", { ascending: true });

      if (academicYear) {
        query = query.eq("academic_year", academicYear);
      }

      const { data: stdData } = await query;
      if (stdData) {
        setStudents(stdData);
        const uniqueClasses = Array.from(
          new Set(stdData.map((s: Student) => s.kelas).filter(Boolean)),
        ).sort();
        setClasses(uniqueClasses as string[]);
      }

      // 2. Fetch app settings (headmaster, pembina_ekstra_list)
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("key, value");

      let currentHeadmaster = "ARIF SYAIFURROHMAN, S.Pd";
      let currentHeadmasterNip = "198106202009041003";
      let parsedPembinaList: any[] = [];

      try {
        const localP = localStorage.getItem("simpanla_pembina_ekstra_list");
        if (localP) parsedPembinaList = JSON.parse(localP);
      } catch (e) {}

      if (settingsData && Array.isArray(settingsData)) {
        settingsData.forEach((row) => {
          if (row.key === "headmaster" && row.value) currentHeadmaster = row.value;
          if (row.key === "headmaster_nip" && row.value) currentHeadmasterNip = row.value;
          if (row.key === "pembina_ekstra_list" && row.value) {
            try {
              const parsed =
                typeof row.value === "string" ? JSON.parse(row.value) : row.value;
              if (Array.isArray(parsed)) {
                parsedPembinaList = parsed;
                localStorage.setItem(
                  "simpanla_pembina_ekstra_list",
                  JSON.stringify(parsed)
                );
              }
            } catch (err) {}
          }
        });
      }

      setSettings({
        headmaster: currentHeadmaster,
        headmaster_nip: currentHeadmasterNip,
      });
      setPembinaList(parsedPembinaList);

      // 3. Fetch distinct subjects from qr_presensi_logs for mode='ekstra'
      let logSubjects: string[] = [];
      try {
        const { data: logSubData } = await supabase
          .from("qr_presensi_logs")
          .select("subject")
          .eq("mode", "ekstra");

        if (logSubData) {
          logSubjects = Array.from(
            new Set(logSubData.map((l: any) => l.subject?.trim()).filter(Boolean))
          );
        }
      } catch (err) {
        console.warn("Gagal membaca subject scan log:", err);
      }

      // 4. Merge all ekstra types (PresensiQR BASE + Pembina Ekstra Settings + Actual Scan Logs)
      const mergedSet = new Set<string>();
      BASE_EKSTRA_LIST.forEach((item) => mergedSet.add(item));

      parsedPembinaList.forEach((p: any) => {
        if (Array.isArray(p.ekstraList)) {
          p.ekstraList.forEach((ek: string) => {
            if (ek && ek.trim() && ek.trim() !== "Semua") {
              const trimmed = ek.trim();
              const existing = Array.from(mergedSet).find(
                (item) => item.toLowerCase() === trimmed.toLowerCase()
              );
              if (!existing) {
                mergedSet.add(trimmed);
              }
            }
          });
        }
      });

      logSubjects.forEach((sub) => {
        if (sub && sub.trim()) {
          const trimmed = sub.trim();
          const existing = Array.from(mergedSet).find(
            (item) => item.toLowerCase() === trimmed.toLowerCase()
          );
          if (!existing) {
            mergedSet.add(trimmed);
          }
        }
      });

      const finalEkstraList = Array.from(mergedSet);
      setEkstraList(finalEkstraList);

      // 5. Select default extra for current user
      const pembinaCheck = checkIsPembinaEkstra(profile, parsedPembinaList);
      const isPembina = pembinaCheck.isPembina;
      const assigned = pembinaCheck.assignedEkstras;

      setSelectedEkstra((prev) => {
        if (!isUserAdmin && isPembina && assigned.length > 0) {
          if (pembinaCheck.isPramuka) {
            return "PRAMUKA";
          }
          if (!assigned.some((e: string) => e.toLowerCase() === prev.toLowerCase())) {
            return assigned[0];
          }
          return prev;
        }
        const exists = finalEkstraList.some(
          (e) => e.toLowerCase() === prev.toLowerCase()
        );
        if (!exists) {
          return finalEkstraList[0] || "PRAMUKA";
        }
        const matched = finalEkstraList.find(
          (e) => e.toLowerCase() === prev.toLowerCase()
        );
        return matched || prev;
      });
    } catch (err) {
      console.error("Error loading initial ekstra data:", err);
    }
  };

  const fetchRekapLogs = async () => {
    if (!selectedEkstra) return;
    setLoading(true);
    try {
      let query = supabase
        .from("qr_presensi_logs")
        .select("*")
        .eq("mode", "ekstra")
        .ilike("subject", selectedEkstra);

      if (rekapMonth !== "all") {
        const [yrStr, moStr] = rekapMonth.split("-");
        const yr = parseInt(yrStr, 10);
        const mo = parseInt(moStr, 10);

        const startDate = new Date(
          Date.UTC(yr, mo - 1, 1, 0, 0, 0)
        ).toISOString();
        const endDate = new Date(Date.UTC(yr, mo, 1, 0, 0, 0)).toISOString();
        query = query.gte("scanned_at", startDate).lt("scanned_at", endDate);
      }

      const { data, error } = await query.order("scanned_at", {
        ascending: true,
      });

      if (error) {
        console.warn("Supabase query error:", error);
      }

      let logs = data || [];

      // Check localStorage for offline/cached scans
      try {
        const localScans = localStorage.getItem("simpanla_qr_scan_history");
        if (localScans) {
          const parsed = JSON.parse(localScans);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (
                item.mode === "ekstra" &&
                item.subject?.toLowerCase() === selectedEkstra.toLowerCase() &&
                (rekapMonth === "all" || item.timestamp?.startsWith(rekapMonth))
              ) {
                const alreadyExists = logs.some(
                  (l: any) =>
                    l.nisn === item.nisn &&
                    l.scanned_at?.substring(0, 16) ===
                      item.timestamp?.substring(0, 16)
                );
                if (!alreadyExists) {
                  logs.push({
                    id: item.id,
                    nisn: item.nisn,
                    student_name: item.studentName,
                    kelas: item.kelas,
                    mode: "ekstra",
                    subject: item.subject,
                    status: item.status,
                    scanned_at: item.timestamp,
                  });
                }
              }
            });
          }
        }
      } catch (e) {
        // ignore
      }

      setRekapLogs(logs);
    } catch (err) {
      console.error("Failed to fetch rekap logs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract date key YYYY-MM-DD
  const getDateKey = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr?.substring(0, 10) || "";
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${yr}-${mo}-${day}`;
    } catch (e) {
      return dateStr?.substring(0, 10) || "";
    }
  };

  // Get all logs of this student for the currently selected ekstra with duplicate identification
  const getStudentEkstraLogs = (nisn: string, name: string) => {
    const rawList = rekapLogs
      .filter((l) => {
        if (l.nisn && nisn && l.nisn.trim() === nisn.trim()) return true;
        if (
          l.student_name &&
          name &&
          l.student_name.trim().toLowerCase() === name.trim().toLowerCase()
        )
          return true;
        return false;
      })
      .sort(
        (a, b) =>
          new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
      );

    // Group by date key to identify latest scan vs earlier duplicates
    const dateMap = new Map<string, any[]>();
    rawList.forEach((log) => {
      const dKey = getDateKey(log.scanned_at);
      if (!dateMap.has(dKey)) dateMap.set(dKey, []);
      dateMap.get(dKey)!.push(log);
    });

    const latestIdSet = new Set<string>();
    dateMap.forEach((group) => {
      // sort ascending: the last one is the latest scan
      const sorted = [...group].sort(
        (a, b) =>
          new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
      );
      const latest = sorted[sorted.length - 1];
      if (latest && latest.id) {
        latestIdSet.add(latest.id);
      }
    });

    return rawList.map((log) => ({
      ...log,
      isLatestForDay: latestIdSet.has(log.id),
      isDuplicate: !latestIdSet.has(log.id),
      dayKey: getDateKey(log.scanned_at),
      sameDayCount: dateMap.get(getDateKey(log.scanned_at))?.length || 1,
    }));
  };

  // Delete all duplicate scans on the same date for a single student
  const handleCleanStudentDuplicates = async (nisn: string, name: string) => {
    const logsWithMeta = getStudentEkstraLogs(nisn, name);
    const duplicates = logsWithMeta.filter((l) => l.isDuplicate);
    if (duplicates.length === 0) {
      showAlert("Tidak ada data scan ganda untuk siswa ini.", "Info");
      return;
    }

    const ok = await showConfirm(
      `Ditemukan ${duplicates.length} data scan ganda untuk ${name}. Hapus data duplikat dan pertahankan hanya scan terakhir untuk setiap tanggal pertemuan?`,
      "Bersihkan Scan Ganda?"
    );
    if (!ok) return;

    setSavingAction(true);
    try {
      const dupIds = duplicates.map((d) => d.id).filter(Boolean);
      if (dupIds.length > 0) {
        await supabase.from("qr_presensi_logs").delete().in("id", dupIds);
        try {
          const localScans = localStorage.getItem("simpanla_qr_scan_history");
          if (localScans) {
            const parsed = JSON.parse(localScans);
            const filtered = parsed.filter((item: any) => !dupIds.includes(item.id));
            localStorage.setItem("simpanla_qr_scan_history", JSON.stringify(filtered));
          }
        } catch (e) {}
      }

      setRekapLogs((prev) => prev.filter((l) => !dupIds.includes(l.id)));
      showAlert(`Berhasil membersihkan ${dupIds.length} data scan ganda! Data presensi kini hanya mencatat scan terakhir.`, "Berhasil");
    } catch (err: any) {
      showAlert(`Gagal membersihkan duplikat: ${err.message || err}`, "Gagal");
    } finally {
      setSavingAction(false);
    }
  };

  // Find all duplicates across all students in current selected ekstra
  const getAllEkstraDuplicates = () => {
    const map = new Map<string, any[]>();
    rekapLogs.forEach((log) => {
      const stdKey = (log.nisn || log.student_name || "").trim();
      if (!stdKey) return;
      const dKey = getDateKey(log.scanned_at);
      const compositeKey = `${stdKey}___${dKey}`;
      if (!map.has(compositeKey)) map.set(compositeKey, []);
      map.get(compositeKey)!.push(log);
    });

    const duplicates: any[] = [];
    map.forEach((group) => {
      if (group.length > 1) {
        group.sort(
          (a, b) =>
            new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
        );
        for (let i = 0; i < group.length - 1; i++) {
          duplicates.push(group[i]);
        }
      }
    });
    return duplicates;
  };

  // Clean all duplicate scans for the entire active Ekstra
  const handleCleanAllEkstraDuplicates = async () => {
    const duplicates = getAllEkstraDuplicates();
    if (duplicates.length === 0) {
      showAlert(`Semua data presensi ekstra ${selectedEkstra} sudah rapi (tidak ada scan ganda).`, "Sudah Rapi");
      return;
    }

    const ok = await showConfirm(
      `Ditemukan total ${duplicates.length} data scan ganda pada ekstrakurikuler ${selectedEkstra}. Bersihkan sekarang dan pertahankan hanya scan terakhir untuk setiap tanggal?`,
      "Bersihkan Semua Scan Ganda?"
    );
    if (!ok) return;

    setCleaningDuplicates(true);
    try {
      const dupIds = duplicates.map((d) => d.id).filter(Boolean);
      if (dupIds.length > 0) {
        // Delete in batches of 50
        for (let i = 0; i < dupIds.length; i += 50) {
          const batch = dupIds.slice(i, i + 50);
          await supabase.from("qr_presensi_logs").delete().in("id", batch);
        }
        try {
          const localScans = localStorage.getItem("simpanla_qr_scan_history");
          if (localScans) {
            const parsed = JSON.parse(localScans);
            const filtered = parsed.filter((item: any) => !dupIds.includes(item.id));
            localStorage.setItem("simpanla_qr_scan_history", JSON.stringify(filtered));
          }
        } catch (e) {}
      }

      setRekapLogs((prev) => prev.filter((l) => !dupIds.includes(l.id)));
      showAlert(`Berhasil membersihkan ${dupIds.length} catatan scan ganda untuk ${selectedEkstra}!`, "Pembersihan Selesai");
    } catch (err: any) {
      showAlert(`Gagal membersihkan: ${err.message || err}`, "Gagal");
    } finally {
      setCleaningDuplicates(false);
    }
  };

  // Delete an extracurricular scan record (decreases scan count)
  const handleDeleteEkstraLog = async (logId: string, studentName: string) => {
    const ok = await showConfirm(
      `Hapus catatan scan presensi ekstra ${selectedEkstra} untuk ${studentName}? Tindakan ini akan mengurangi total kehadiran siswa.`,
      "Hapus Scan Ekstrakurikuler?"
    );
    if (!ok) return;

    try {
      await supabase.from("qr_presensi_logs").delete().eq("id", logId);
      try {
        const localScans = localStorage.getItem("simpanla_qr_scan_history");
        if (localScans) {
          const parsed = JSON.parse(localScans);
          const filtered = parsed.filter((item: any) => item.id !== logId);
          localStorage.setItem("simpanla_qr_scan_history", JSON.stringify(filtered));
        }
      } catch (e) {}

      setRekapLogs((prev) => prev.filter((l) => l.id !== logId));
      showAlert("Catatan presensi ekstra berhasil dihapus.", "Data Dihapus");
    } catch (err: any) {
      showAlert(`Gagal menghapus: ${err.message || err}`, "Gagal");
    }
  };

  // Save / Add an extracurricular scan record (edits date, time, status, or adds new scan)
  const handleSaveEkstraLog = async () => {
    if (!manageStudentEkstra || !editingEkstraLog) return;
    setSavingAction(true);
    try {
      const isoTimestamp = new Date(
        `${editingEkstraLog.date}T${editingEkstraLog.time}:00+07:00`
      ).toISOString();

      if (!editingEkstraLog.isNew && editingEkstraLog.id) {
        // Update existing record
        const { error } = await supabase
          .from("qr_presensi_logs")
          .update({
            scanned_at: isoTimestamp,
            status: editingEkstraLog.status,
            subject: selectedEkstra,
          })
          .eq("id", editingEkstraLog.id);
        if (error) throw error;

        setRekapLogs((prev) =>
          prev.map((l) =>
            l.id === editingEkstraLog.id
              ? {
                  ...l,
                  scanned_at: isoTimestamp,
                  status: editingEkstraLog.status,
                  subject: selectedEkstra,
                }
              : l
          )
        );
        showAlert("Data presensi ekstra berhasil diperbarui.", "Berhasil");
      } else {
        // Insert new record
        const matchedStd = students.find(
          (s) =>
            s.nisn === manageStudentEkstra.nisn ||
            s.name === manageStudentEkstra.name
        );
        const newId = `qr-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 7)}`;
        const newRecord = {
          id: newId,
          student_id: matchedStd?.id || null,
          student_name: manageStudentEkstra.name,
          nisn: manageStudentEkstra.nisn,
          kelas: manageStudentEkstra.kelas,
          mode: "ekstra",
          subject: selectedEkstra,
          status: editingEkstraLog.status,
          scanned_at: isoTimestamp,
          academic_year: academicYear || "2025/2026",
          notes: "[Presensi Ekstra Manual Admin]",
        };

        const { error } = await supabase
          .from("qr_presensi_logs")
          .insert([newRecord]);
        if (error) throw error;

        setRekapLogs((prev) => [...prev, newRecord]);
        showAlert(
          `Presensi ekstra ${selectedEkstra} berhasil ditambahkan (total scan bertambah).`,
          "Berhasil"
        );
      }

      setEditingEkstraLog(null);
    } catch (err: any) {
      showAlert(`Gagal menyimpan presensi: ${err.message || err}`, "Gagal");
    } finally {
      setSavingAction(false);
    }
  };

  // Process & Aggregate Summary (Daily Deduplication: Sehari cuma sekali diambil scan yang terakhir)
  const getProcessedData = () => {
    // 1. Group all logs by student
    const studentLogsMap = new Map<string, any[]>();
    rekapLogs.forEach((log) => {
      const key = (log.nisn || log.student_name || "").trim();
      if (!key) return;
      if (!studentLogsMap.has(key)) {
        studentLogsMap.set(key, []);
      }
      studentLogsMap.get(key)!.push(log);
    });

    const summaryMap = new Map<
      string,
      {
        nisn: string;
        name: string;
        kelas: string;
        totalHadir: number;
        totalTerlambat: number;
        totalKehadiran: number;
        datesFormattedList: string[];
      }
    >();

    studentLogsMap.forEach((logs, key) => {
      // 2. Group this student's logs by date (YYYY-MM-DD)
      const dateMap = new Map<string, any[]>();
      logs.forEach((log) => {
        const dKey = getDateKey(log.scanned_at);
        if (!dateMap.has(dKey)) {
          dateMap.set(dKey, []);
        }
        dateMap.get(dKey)!.push(log);
      });

      // 3. For each date: sort ascending, pick the last scan (ambil scan yang terakhir)
      let totalHadir = 0;
      let totalTerlambat = 0;
      const datesFormattedList: string[] = [];

      const sortedDateKeys = Array.from(dateMap.keys()).sort();

      sortedDateKeys.forEach((dKey) => {
        const dayLogs = dateMap.get(dKey)!;
        // Sort ascending by timestamp: last element is the latest scan
        dayLogs.sort(
          (a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
        );
        const latestScan = dayLogs[dayLogs.length - 1];

        if (latestScan.status === "Terlambat") {
          totalTerlambat += 1;
        } else {
          totalHadir += 1;
        }

        const d = new Date(latestScan.scanned_at);
        const dateOnly = d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeOnly = d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        datesFormattedList.push(`${dateOnly} (${timeOnly})`);
      });

      const firstLog = logs[0];
      const std = students.find(
        (s) => s.nisn === firstLog.nisn || s.name === firstLog.student_name
      );

      summaryMap.set(key, {
        nisn: firstLog.nisn || std?.nisn || std?.nis || "-",
        name: firstLog.student_name || std?.name || "Siswa",
        kelas: firstLog.kelas || std?.kelas || "-",
        totalHadir,
        totalTerlambat,
        totalKehadiran: totalHadir + totalTerlambat, // Sehari cuma sekali!
        datesFormattedList,
      });
    });

    let resultList = Array.from(summaryMap.values());

    if (!onlyParticipated) {
      students.forEach((std) => {
        const key = (std.nisn || std.name || "").trim();
        if (key && !summaryMap.has(key)) {
          resultList.push({
            nisn: std.nisn || std.nis || "-",
            name: std.name,
            kelas: std.kelas,
            totalHadir: 0,
            totalTerlambat: 0,
            totalKehadiran: 0,
            datesFormattedList: [],
          });
        }
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      resultList = resultList.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.nisn.toLowerCase().includes(q) ||
          item.kelas.toLowerCase().includes(q)
      );
    }

    if (classFilter) {
      resultList = resultList.filter((item) => item.kelas === classFilter);
    }

    resultList.sort((a, b) => {
      if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
      return a.name.localeCompare(b.name);
    });

    return resultList;
  };

  const processedData = getProcessedData();

  // Statistics
  const totalPeserta = processedData.length;
  const totalKehadiranSemua = processedData.reduce(
    (acc, curr) => acc + curr.totalKehadiran,
    0
  );
  const totalTepatWaktu = processedData.reduce(
    (acc, curr) => acc + curr.totalHadir,
    0
  );
  const totalTerlambat = processedData.reduce(
    (acc, curr) => acc + curr.totalTerlambat,
    0
  );

  const getMonthLabel = (val: string) => {
    if (val === "all") return "Semua Bulan (All-Time)";
    const [yr, mo] = val.split("-");
    const names = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${names[parseInt(mo, 10) - 1]} ${yr}`;
  };

  // Find Pembina for currently selected ekstra
  const currentEkstraPembina = pembinaList.find(
    (p: any) =>
      Array.isArray(p.ekstraList) &&
      p.ekstraList.some(
        (e: string) => e.toLowerCase() === selectedEkstra.toLowerCase()
      )
  );
  const activePembinaName =
    currentEkstraPembina?.nama ||
    profile?.full_name ||
    ".......................................";
  const activePembinaNip =
    currentEkstraPembina?.nip ||
    profile?.nip ||
    ".......................................";

  // Export CSV
  const handleExportCSV = () => {
    if (processedData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    let csv =
      "No,NISN,Nama Siswa,Kelas,Total Hadir,Tepat Waktu,Terlambat,Riwayat Tanggal\n";
    processedData.forEach((row, idx) => {
      const dates = `"${row.datesFormattedList.join("; ")}"`;
      csv += `${idx + 1},"${row.nisn}","${row.name}","${row.kelas}",${row.totalKehadiran},${row.totalHadir},${row.totalTerlambat},${dates}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Presensi_${selectedEkstra}_${rekapMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = formatDateSignature(new Date());

  // If user is neither Admin nor Pembina Ekstra, deny access
  if (!isUserAdmin && !isUserPembina) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 border border-slate-200 dark:border-slate-700 text-center space-y-4 max-w-lg mx-auto shadow-sm">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Akses Laporan Terbatas</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Tab Laporan Resmi Presensi Ekstrakurikuler hanya dapat diakses oleh Admin atau Pembina Ekstrakurikuler yang terdaftar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ACTION BAR & TITLE */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 mb-2">
              <Trophy size={14} />
              <span>LAPORAN RESMI EKSTRAKURIKULER</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span>Rekap Presensi {selectedEkstra}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Rekapitulasi absensi scan QR presensi kegiatan ekstrakurikuler UPT SMP Negeri 8 Pasuruan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/qr")}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2"
            >
              <Scan size={15} />
              <span>Buka Kamera Scan QR</span>
            </button>

            <button
              type="button"
              onClick={fetchRekapLogs}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Download Data Presensi Ekstrakurikuler format Excel (CSV)"
            >
              <Download size={14} />
              <span>Download Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Cetak Dokumen Resmi Presensi Ekstrakurikuler (PDF)"
            >
              <Printer size={14} />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            {isUserAdmin ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Pilihan Ekstrakurikuler:
                  </label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck size={10} />
                    <span>Admin ({ekstraList.length})</span>
                  </span>
                </div>
                <select
                  value={selectedEkstra}
                  onChange={(e) => setSelectedEkstra(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer shadow-sm"
                >
                  {ekstraList.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </>
            ) : userAssignedEkstras.length > 1 ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Pilihan Ekstrakurikuler:
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/60">
                    <Lock size={10} /> Pembina
                  </span>
                </div>
                <select
                  value={selectedEkstra}
                  onChange={(e) => setSelectedEkstra(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer shadow-sm"
                >
                  {userAssignedEkstras.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Ekstrakurikuler:
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-300/60 dark:border-amber-700/60">
                    <Lock size={10} /> Terkunci
                  </span>
                </div>
                <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-between shadow-inner">
                  <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                    <Trophy size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{selectedEkstra}</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700/50 shrink-0">
                    Pembina {isUserPramuka ? "Pramuka" : selectedEkstra}
                  </span>
                </div>
              </>
            )}

            {/* Display active pembina info */}
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <UserCheck size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">Pembina:</span>
              <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                {currentEkstraPembina?.nama || (isUserPembina ? profile?.full_name : "Belum ditentukan di Kelola Pembina")}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Periode / Bulan Rekap:
            </label>
            <select
              value={rekapMonth}
              onChange={(e) => setRekapMonth(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
            >
              <option value="all">Semua Bulan (All-Time Total)</option>
              {(() => {
                const now = new Date();
                const opts = [];
                const monthNames = [
                  "Januari",
                  "Februari",
                  "Maret",
                  "April",
                  "Mei",
                  "Juni",
                  "Juli",
                  "Agustus",
                  "September",
                  "Oktober",
                  "November",
                  "Desember",
                ];
                for (let i = 0; i < 12; i++) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const yr = d.getFullYear();
                  const mo = String(d.getMonth() + 1).padStart(2, "0");
                  const val = `${yr}-${mo}`;
                  opts.push(
                    <option key={val} value={val}>
                      {monthNames[d.getMonth()]} {yr}
                    </option>
                  );
                }
                return opts;
              })()}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Filter Kelas:
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
            >
              <option value="">Semua Kelas Siswa</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Cari Nama / NISN:
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="text"
                placeholder="Ketik nama atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* TOGGLE ONLY PARTICIPATED */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="onlyPart"
            checked={onlyParticipated}
            onChange={(e) => setOnlyParticipated(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
          />
          <label
            htmlFor="onlyPart"
            className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Hanya tampilkan peserta yang pernah scan/hadir di {selectedEkstra}
          </label>
        </div>

        {/* BANNER SCAN DUPLIKAT TERDETEKSI */}
        {getAllEkstraDuplicates().length > 0 && isUserAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="flex items-start sm:items-center gap-2.5 text-xs">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold">
                  Terdeteksi {getAllEkstraDuplicates().length} data scan ganda pada tanggal yang sama.
                </span>
                <span className="text-amber-700 dark:text-amber-300 ml-1">
                  Sistem otomatis menghitung 1x sehari dengan mengambil scan terakhir.
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={cleaningDuplicates}
              onClick={handleCleanAllEkstraDuplicates}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {cleaningDuplicates ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              <span>Bersihkan Data Duplikat ({getAllEkstraDuplicates().length})</span>
            </button>
          </div>
        )}

        {/* METRIC STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 text-xs font-bold mb-1">
              <Users size={15} />
              <span>Total Peserta</span>
            </div>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-100">
              {totalPeserta}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
              Siswa terdata
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
              <Trophy size={15} />
              <span>Total Kehadiran</span>
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-100">
              {totalKehadiranSemua}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
              Akumulasi scan
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
              <CheckCircle2 size={15} />
              <span>Tepat Waktu</span>
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {totalTepatWaktu}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Kehadiran tepat waktu
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold mb-1">
              <Clock size={15} />
              <span>Terlambat</span>
            </div>
            <div className="text-2xl font-black text-rose-900 dark:text-rose-100">
              {totalTerlambat}
            </div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
              Presensi terlambat
            </div>
          </div>
        </div>

        {/* TABLE REKAP DATA */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-center">Total Hadir</th>
                <th className="px-4 py-3 text-center">Tepat Waktu</th>
                <th className="px-4 py-3 text-center">Terlambat</th>
                <th className="px-4 py-3">Riwayat Tanggal Scan</th>
                {isUserAdmin && (
                  <th className="px-4 py-3 text-center w-24">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={isUserAdmin ? 9 : 8} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-emerald-600" />
                      <span>Memuat data rekapitulasi ekstrakurikuler {selectedEkstra}...</span>
                    </div>
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td colSpan={isUserAdmin ? 9 : 8} className="px-4 py-12 text-center text-slate-500">
                    <Trophy size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold">Belum ada data presensi {selectedEkstra} pada periode ini.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Coba ubah pilihan ekstrakurikuler, kelas, atau hilangkan centang "Hanya tampilkan peserta yang pernah scan".
                    </p>
                  </td>
                </tr>
              ) : (
                processedData.map((item, index) => (
                  <tr
                    key={`${item.nisn}-${index}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {item.nisn}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                      Kelas {item.kelas}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        onClick={() => {
                          if (isUserAdmin) {
                            setManageStudentEkstra({
                              nisn: item.nisn,
                              name: item.name,
                              kelas: item.kelas,
                            });
                            setEditingEkstraLog(null);
                          }
                        }}
                        className={`inline-block px-2.5 py-1 rounded-full font-black text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 ${
                          isUserAdmin ? "cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all" : ""
                        }`}
                        title={isUserAdmin ? "Klik untuk Kelola / Edit Presensi" : undefined}
                      >
                        {item.totalKehadiran} Kali
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {item.totalHadir}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                      {item.totalTerlambat}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed">
                      {item.datesFormattedList.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.datesFormattedList.map((dt, dIdx) => (
                            <span
                              key={dIdx}
                              className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            >
                              {dt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum Pernah Scan</span>
                      )}
                    </td>

                    {/* Admin Action Column */}
                    {isUserAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setManageStudentEkstra({
                              nisn: item.nisn,
                              name: item.name,
                              kelas: item.kelas,
                            });
                            setEditingEkstraLog(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 shadow-2xs transition-colors"
                          title="Kelola & Edit Riwayat Scan Ekstra Siswa"
                        >
                          <Edit3 size={13} />
                          <span>Kelola</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL MANAGE PRESENSI EKSTRAKURIKULER SISWA */}
      {manageStudentEkstra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Trophy size={18} className="text-emerald-600" />
                  <span>Kelola Presensi Ekstrakurikuler: {selectedEkstra}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{manageStudentEkstra.name}</span> • Kelas {manageStudentEkstra.kelas} • NISN: {manageStudentEkstra.nisn}
                </p>
              </div>
              <button
                onClick={() => {
                  setManageStudentEkstra(null);
                  setEditingEkstraLog(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-form: Add / Edit Ekstra Log */}
            {editingEkstraLog ? (
              <div className="p-4 my-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {editingEkstraLog.isNew ? "+ Tambah Presensi Ekstra (Menambah Jumlah Scan)" : "Edit Data Scan Presensi"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingEkstraLog(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal Form
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Tanggal Presensi
                    </label>
                    <input
                      type="date"
                      value={editingEkstraLog.date}
                      onChange={(e) => setEditingEkstraLog({ ...editingEkstraLog, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Jam Scan (WIB)
                    </label>
                    <input
                      type="time"
                      value={editingEkstraLog.time}
                      onChange={(e) => setEditingEkstraLog({ ...editingEkstraLog, time: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Status Kehadiran
                    </label>
                    <select
                      value={editingEkstraLog.status}
                      onChange={(e) => setEditingEkstraLog({ ...editingEkstraLog, status: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                    >
                      <option value="Hadir">Tepat Waktu (Hadir)</option>
                      <option value="Terlambat">Terlambat</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingEkstraLog(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={savingAction}
                    onClick={handleSaveEkstraLog}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingAction && <Loader2 size={12} className="animate-spin" />}
                    <span>{editingEkstraLog.isNew ? "Simpan Presensi Baru" : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const logsWithMeta = getStudentEkstraLogs(manageStudentEkstra.nisn, manageStudentEkstra.name);
                const duplicateLogs = logsWithMeta.filter((l) => l.isDuplicate);
                const uniqueDaysCount = new Set(logsWithMeta.map((l) => l.dayKey)).size;

                return (
                  <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                    <div>
                      <div className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                        Total Kehadiran: <strong className="text-emerald-600 font-bold text-sm">{uniqueDaysCount} Hari</strong>
                        {logsWithMeta.length !== uniqueDaysCount && (
                          <span className="text-slate-400 text-[11px] ml-1.5">({logsWithMeta.length} total scan)</span>
                        )}
                      </div>
                      {duplicateLogs.length > 0 && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                          ⚠️ Terdeteksi {duplicateLogs.length} scan ganda. Presensi mengambil scan terakhir.
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {duplicateLogs.length > 0 && (
                        <button
                          type="button"
                          disabled={savingAction}
                          onClick={() => handleCleanStudentDuplicates(manageStudentEkstra.nisn, manageStudentEkstra.name)}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Hapus data duplikat dan pertahankan scan terakhir"
                        >
                          <Trash2 size={13} />
                          <span>Bersihkan Duplikat ({duplicateLogs.length})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const todayStr = new Date().toISOString().split("T")[0];
                          setEditingEkstraLog({
                            date: todayStr,
                            time: "15:00",
                            status: "Hadir",
                            isNew: true,
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Tambah Scan Presensi</span>
                      </button>
                    </div>
                  </div>
                );
              })()
            )}

            {/* List of Student's Scans for this Extra */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl my-2">
              {getStudentEkstraLogs(manageStudentEkstra.nisn, manageStudentEkstra.name).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada catatan scan presensi untuk siswa ini pada ekstrakurikuler {selectedEkstra}.
                </div>
              ) : (
                getStudentEkstraLogs(manageStudentEkstra.nisn, manageStudentEkstra.name).map((log, index) => {
                  const d = new Date(log.scanned_at);
                  const dateFormatted = formatDateIndo(d.toISOString().split("T")[0]);
                  const timeFormatted = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div
                      key={log.id || index}
                      className={`p-3 flex items-center justify-between transition-colors ${
                        log.isDuplicate
                          ? "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            log.status === "Terlambat"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {log.status === "Terlambat" ? "T" : "✓"}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center flex-wrap gap-2">
                            <span>{dateFormatted}</span>
                            <span className="font-mono text-[11px] text-slate-500">({timeFormatted} WIB)</span>
                            {log.isLatestForDay ? (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-300/60 dark:border-emerald-800">
                                ✓ Scan Terakhir (Dihitung)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-300/60 dark:border-amber-800">
                                ⚠️ Duplikat Jam {timeFormatted} (Diabaikan)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {log.subject || selectedEkstra}
                            </span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                log.status === "Terlambat" ? "text-amber-600" : "text-emerald-600"
                              }`}
                            >
                              {log.status === "Terlambat" ? "Terlambat" : "Tepat Waktu"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const dateOnly = log.scanned_at.split("T")[0];
                            const timeOnly = d.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            });
                            setEditingEkstraLog({
                              id: log.id,
                              date: dateOnly,
                              time: timeOnly.length === 5 ? timeOnly : "15:00",
                              status: log.status === "Terlambat" ? "Terlambat" : "Hadir",
                              isNew: false,
                            });
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Edit Tanggal / Jam / Status Scan"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEkstraLog(log.id, manageStudentEkstra.name)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Hapus Scan Ini"
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
                  setManageStudentEkstra(null);
                  setEditingEkstraLog(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL REPORT PRINT AREA (VISIBLE ONLY WHEN PRINTING) */}
      <div id="rekap-ekstra-print-container" className="hidden print:block p-8 bg-white text-black font-sans">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #rekap-ekstra-print-container, #rekap-ekstra-print-container * {
              visibility: visible;
            }
            #rekap-ekstra-print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #ffffff !important;
              color: #000000 !important;
            }
          }
        `}</style>

        {/* Kop Surat Resmi */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderBottom: '3px double #000', paddingBottom: '10px', marginBottom: '14px' }}>
          <tbody>
            <tr style={{ border: 'none' }}>
              <td style={{ width: '85px', verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 10px 10px 0' }}>
                <img 
                  src="https://lh3.googleusercontent.com/d/1KtAUvy02qNUB2FzCUoVrNmHtFT0eH2J0" 
                  alt="Logo Sekolah" 
                  style={{ height: '75px', width: 'auto', display: 'block', margin: '0 auto', objectFit: 'contain' }}
                />
              </td>
              <td style={{ verticalAlign: 'middle', textAlign: 'center', border: 'none', padding: '0 85px 10px 0' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b', lineHeight: '1.25' }}>PEMERINTAH KOTA PASURUAN</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b', lineHeight: '1.25', marginTop: '2px' }}>DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
                <div style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000', lineHeight: '1.2', margin: '3px 0' }}>UPT SMP NEGERI 8 PASURUAN</div>
                <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#475569', lineHeight: '1.3' }}>
                  Jl. KH Mansyur No. 162, Sekargadung, Kec. Purworejo, Kota Pasuruan, Jawa Timur 67127 | Telp: (0343) 422108
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Judul Laporan Header */}
        <div className="text-center pb-3 mb-5">
          <h3 className="text-sm font-extrabold uppercase text-slate-900 tracking-wider">
            LAPORAN REKAPITULASI PRESENSI KEGIATAN EKSTRAKURIKULER
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Ekstrakurikuler: <strong className="text-black uppercase">{selectedEkstra}</strong> &nbsp;|&nbsp; Pembina: <strong className="text-black">{activePembinaName}</strong> &nbsp;|&nbsp; Periode: <strong>{getMonthLabel(rekapMonth)}</strong> &nbsp;|&nbsp; T.A: <strong>{academicYear || "2026/2027"}</strong>
          </p>
        </div>

        {/* Data Table for Print */}
        <table className="w-full border-collapse border border-black text-xs mb-8">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-1.5 text-center w-10">No</th>
              <th className="border border-black px-2 py-1.5 text-center w-28">NISN</th>
              <th className="border border-black px-2 py-1.5 text-left">Nama Siswa</th>
              <th className="border border-black px-2 py-1.5 text-center w-16">Kelas</th>
              <th className="border border-black px-2 py-1.5 text-center w-20">Total Hadir</th>
              <th className="border border-black px-2 py-1.5 text-center w-20">Tepat Waktu</th>
              <th className="border border-black px-2 py-1.5 text-center w-20">Terlambat</th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-black px-2 py-1 text-center font-mono">{item.nisn}</td>
                <td className="border border-black px-2 py-1 font-semibold">{item.name}</td>
                <td className="border border-black px-2 py-1 text-center">{item.kelas}</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{item.totalKehadiran}</td>
                <td className="border border-black px-2 py-1 text-center">{item.totalHadir}</td>
                <td className="border border-black px-2 py-1 text-center">{item.totalTerlambat}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 pt-4">
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold">Kepala UPT SMP Negeri 8 Pasuruan</p>
            <div className="h-20"></div>
            <p className="font-bold underline">{settings.headmaster}</p>
            <p>NIP. {settings.headmaster_nip}</p>
          </div>
          <div>
            <p>Pasuruan, {currentDateStr}</p>
            <p className="font-semibold">Pembina Ekstrakurikuler {selectedEkstra}</p>
            <div className="h-20"></div>
            <p className="font-bold underline">{activePembinaName}</p>
            <p>NIP. {activePembinaNip}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
