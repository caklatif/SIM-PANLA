import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Student } from "../types";
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
} from "lucide-react";
import { formatDateSignature } from "../utils/dateUtils";

const EKSTRA_LIST = [
  "Pramuka",
  "PMR",
  "Paskibra",
  "Futsal",
  "Basket",
  "Seni Tari",
  "Paduan Suara",
  "Robotik",
  "KIR (Karya Ilmiah Remaja)",
  "English Club",
];

export const RekapEkstraTab: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isAdmin, academicYear } = useAuth();

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [rekapLogs, setRekapLogs] = useState<any[]>([]);

  // Filter States
  const [selectedEkstra, setSelectedEkstra] = useState<string>("Pramuka");
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
    headmaster: "Rudi Hartono, S.Pd, M.Pd",
    headmaster_nip: "197205101998021004",
  });

  // Load Students and Settings
  useEffect(() => {
    fetchInitialData();
  }, [academicYear]);

  // Load Ekstra Logs when filters change
  useEffect(() => {
    if (selectedEkstra) {
      fetchRekapLogs();
    }
  }, [selectedEkstra, rekapMonth, academicYear]);

  const fetchInitialData = async () => {
    try {
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

      // Fetch headmaster setting
      const { data: setRes } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "kop_surat")
        .maybeSingle();

      if (setRes?.value) {
        try {
          const val =
            typeof setRes.value === "string"
              ? JSON.parse(setRes.value)
              : setRes.value;
          setSettings({
            headmaster: val.headmaster || "Rudi Hartono, S.Pd, M.Pd",
            headmaster_nip: val.headmaster_nip || "197205101998021004",
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error("Error loading initial ekstra data:", err);
    }
  };

  const fetchRekapLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("qr_presensi_logs")
        .select("*")
        .eq("mode", "ekstra")
        .eq("subject", selectedEkstra);

      if (rekapMonth !== "all") {
        const [yrStr, moStr] = rekapMonth.split("-");
        const yr = parseInt(yrStr, 10);
        const mo = parseInt(moStr, 10);

        const startDate = new Date(Date.UTC(yr, mo - 1, 1, 0, 0, 0)).toISOString();
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
                item.subject === selectedEkstra &&
                (rekapMonth === "all" || item.timestamp?.startsWith(rekapMonth))
              ) {
                const alreadyExists = logs.some(
                  (l: any) =>
                    l.nisn === item.nisn &&
                    l.scanned_at?.substring(0, 16) === item.timestamp?.substring(0, 16),
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

  // Process & Aggregate Summary
  const getProcessedData = () => {
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

    rekapLogs.forEach((log) => {
      const key = (log.nisn || log.student_name || "").trim();
      if (!key) return;

      if (!summaryMap.has(key)) {
        const std = students.find(
          (s) => s.nisn === log.nisn || s.name === log.student_name,
        );
        summaryMap.set(key, {
          nisn: log.nisn || std?.nisn || std?.nis || "-",
          name: log.student_name || std?.name || "Siswa",
          kelas: log.kelas || std?.kelas || "-",
          totalHadir: 0,
          totalTerlambat: 0,
          totalKehadiran: 0,
          datesFormattedList: [],
        });
      }

      const item = summaryMap.get(key)!;
      if (log.status === "Terlambat") {
        item.totalTerlambat += 1;
      } else {
        item.totalHadir += 1;
      }
      item.totalKehadiran += 1;

      const d = new Date(log.scanned_at);
      const dateOnly = d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeOnly = d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      item.datesFormattedList.push(`${dateOnly} (${timeOnly})`);
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
          item.kelas.toLowerCase().includes(q),
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
    0,
  );
  const totalTepatWaktu = processedData.reduce(
    (acc, curr) => acc + curr.totalHadir,
    0,
  );
  const totalTerlambat = processedData.reduce(
    (acc, curr) => acc + curr.totalTerlambat,
    0,
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

  // Export CSV
  const handleExportCSV = () => {
    if (processedData.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    let csv = "No,NISN,Nama Siswa,Kelas,Total Hadir,Tepat Waktu,Terlambat,Riwayat Tanggal\n";
    processedData.forEach((row, idx) => {
      const dates = `"${row.datesFormattedList.join("; ")}"`;
      csv += `${idx + 1},"${row.nisn}","${row.name}","${row.kelas}",${row.totalKehadiran},${row.totalHadir},${row.totalTerlambat},${dates}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
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
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Pilihan Ekstrakurikuler:
            </label>
            <select
              value={selectedEkstra}
              onChange={(e) => setSelectedEkstra(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
            >
              {EKSTRA_LIST.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
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
                  opts.push({
                    val: `${yr}-${mo}`,
                    label: `${monthNames[d.getMonth()]} ${yr}`,
                  });
                }
                return opts.map((o) => (
                  <option key={o.val} value={o.val}>
                    {o.label}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              Pencarian Siswa:
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
              />
            </div>
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
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TOGGLE PARTICIPATION */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyParticipated}
              onChange={(e) => setOnlyParticipated(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <span>Hanya tampilkan peserta yang pernah scan/hadir di {selectedEkstra}</span>
          </label>

          <div className="text-xs text-slate-500 font-medium">
            Periode:{" "}
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {getMonthLabel(rekapMonth)}
            </strong>
          </div>
        </div>

        {/* METRICS SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800">
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Users size={14} /> Total Peserta
            </div>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-1">
              {totalPeserta}
            </div>
            <div className="text-[10px] text-purple-500 mt-0.5">Siswa terdata</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Trophy size={14} /> Total Kehadiran
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">
              {totalKehadiranSemua}
            </div>
            <div className="text-[10px] text-amber-500 mt-0.5">Akumulasi scan</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Tepat Waktu
            </div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
              {totalTepatWaktu}
            </div>
            <div className="text-[10px] text-emerald-500 mt-0.5">
              {totalKehadiranSemua > 0
                ? `${Math.round((totalTepatWaktu / totalKehadiranSemua) * 100)}% disiplin`
                : "0%"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800">
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Clock size={14} /> Terlambat
            </div>
            <div className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-1">
              {totalTerlambat}
            </div>
            <div className="text-[10px] text-rose-500 mt-0.5">Setelah batas jam</div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-center">Total Hadir</th>
                <th className="px-4 py-3 text-center">Tepat Waktu</th>
                <th className="px-4 py-3 text-center">Terlambat</th>
                <th className="px-4 py-3">Riwayat Tanggal Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-500" />
                    <span>Memuat data rekapitulasi ekstrakurikuler...</span>
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Trophy size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-bold">Tidak ada data kehadiran ditemukan</p>
                    <p className="text-[11px] mt-1">
                      Coba ubah pilihan ekstrakurikuler, kelas, atau centang semua peserta.
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
                      <span className="inline-block px-2.5 py-1 rounded-full font-black text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

        {/* Kop Laporan Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wider">UPT SMP NEGERI 8 PASURUAN</h2>
          <h3 className="text-sm font-semibold uppercase text-slate-700">
            Laporan Rekapitulasi Presensi Ekstrakurikuler
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Kegiatan: <strong>{selectedEkstra}</strong> | Periode: {getMonthLabel(rekapMonth)} | Tahun Ajaran: {academicYear || "2025/2026"}
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
            <p className="font-bold underline">{profile?.full_name || "......................................."}</p>
            <p>NIP. {profile?.nip || "......................................."}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
