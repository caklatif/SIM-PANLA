import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { RekapSholatMatrix } from "../components/RekapSholatMatrix";
import { RekapScanMasukMatrix } from "../components/RekapScanMasukMatrix";
import { KelolaHasilScan } from "../components/KelolaHasilScan";
import { RekapEkstraTab } from "../components/RekapEkstraTab";
import { LaporanJurnal } from "./LaporanJurnal";
import { AbsensiRapor } from "./AbsensiRapor";
import { Kedisiplinan } from "./Kedisiplinan";
import {
  checkIsPembinaEkstra,
  fetchPembinaListFromDb,
  getCachedPembinaList,
  PembinaEkstraItem,
} from "../utils/pembinaHelper";
import {
  FileSpreadsheet,
  Sun,
  Database,
  BookOpen,
  Calendar,
  GraduationCap,
  Trophy,
  ShieldAlert,
  Sparkles,
  LogIn,
} from "lucide-react";

export type PusatLaporanTab =
  | "kelola_scan"
  | "matrix_scan_masuk"
  | "matrix_sholat"
  | "laporan_jurnal"
  | "absensi_rapor"
  | "rekap_ekstra"
  | "kedisiplinan";

interface TabItem {
  id: PusatLaporanTab;
  label: string;
  icon: any;
  badgeColor: string;
}

const TABS: TabItem[] = [
  {
    id: "kelola_scan",
    label: "Kelola Hasil Scan",
    icon: Database,
    badgeColor: "bg-purple-600 shadow-purple-600/40",
  },
  {
    id: "matrix_scan_masuk",
    label: "Matrik Scan Masuk",
    icon: LogIn,
    badgeColor: "bg-blue-600 shadow-blue-600/40",
  },
  {
    id: "matrix_sholat",
    label: "Rekap Matriks Sholat (1–31)",
    icon: Sun,
    badgeColor: "bg-emerald-600 shadow-emerald-600/40",
  },
  {
    id: "laporan_jurnal",
    label: "Laporan Jurnal KBM Guru",
    icon: BookOpen,
    badgeColor: "bg-blue-600 shadow-blue-600/40",
  },
  {
    id: "absensi_rapor",
    label: "Rekap Absensi Buku Rapor",
    icon: GraduationCap,
    badgeColor: "bg-amber-600 shadow-amber-600/40",
  },
  {
    id: "rekap_ekstra",
    label: "Presensi QR & Ekstrakurikuler",
    icon: Trophy,
    badgeColor: "bg-teal-600 shadow-teal-600/40",
  },
  {
    id: "kedisiplinan",
    label: "Laporan Kedisiplinan & BK",
    icon: ShieldAlert,
    badgeColor: "bg-rose-600 shadow-rose-600/40",
  },
];

export const PusatLaporan: React.FC = () => {
  const { academicYear, semester, profile, isAdmin, isOperator } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Load and synchronize pembina ekstra list
  const [pembinaList, setPembinaList] = useState<PembinaEkstraItem[]>(getCachedPembinaList);

  useEffect(() => {
    fetchPembinaListFromDb().then((list) => {
      if (list && list.length > 0) {
        setPembinaList(list);
      }
    });
  }, []);

  const isUserAdmin = Boolean(isAdmin || isOperator);
  const pembinaStatus = checkIsPembinaEkstra(profile, pembinaList);
  const isUserPembina = pembinaStatus.isPembina;

  // RULE: Admin OR Pembina Ekstra can access rekap_ekstra.
  // If neither (bukan keduanya), hide tab Presensi QR & Ekstrakurikuler completely!
  const canAccessEkstraTab = isUserAdmin || isUserPembina;

  const availableTabs = TABS.filter((tab) => {
    if (tab.id === "rekap_ekstra") {
      return canAccessEkstraTab;
    }
    return true;
  });

  // Determine initial tab from query parameter or pathname
  const getInitialTab = (): PusatLaporanTab => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as PusatLaporanTab;
    if (tabParam === "rekap_ekstra") {
      return canAccessEkstraTab ? "rekap_ekstra" : "kelola_scan";
    }
    if (tabParam && availableTabs.some((t) => t.id === tabParam)) {
      return tabParam;
    }
    if (
      tabParam === "matrix_scan_masuk" ||
      (tabParam as string) === "rekap_scan_masuk" ||
      location.pathname.includes("matrik-scan-masuk") ||
      location.pathname.includes("rekap-scan-masuk")
    ) {
      return "matrix_scan_masuk";
    }
    if (
      tabParam === "matrix_sholat" ||
      (tabParam as string) === "rekap_sholat" ||
      location.pathname.includes("rekap-sholat")
    ) {
      return "matrix_sholat";
    }
    if (location.pathname.includes("laporan") && !location.pathname.includes("laporan-terpadu")) {
      return "laporan_jurnal";
    }
    if (location.pathname.includes("absensi-rapor")) {
      return "absensi_rapor";
    }
    if (location.pathname.includes("kedisiplinan")) {
      return "kedisiplinan";
    }
    return availableTabs[0]?.id || "kelola_scan";
  };

  const [activeTab, setActiveTab] = useState<PusatLaporanTab>(getInitialTab);
  const [scanCount, setScanCount] = useState<number | null>(null);

  // Sync tab state when URL changes or access permissions load
  useEffect(() => {
    const nextTab = getInitialTab();
    if (nextTab === "rekap_ekstra" && !canAccessEkstraTab) {
      setActiveTab("kelola_scan");
    } else {
      setActiveTab(nextTab);
    }
  }, [location.search, location.pathname, canAccessEkstraTab]);

  const handleTabChange = (tabId: PusatLaporanTab) => {
    setActiveTab(tabId);
    navigate(`/laporan-terpadu?tab=${tabId}`, { replace: true });
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 max-w-7xl mx-auto">
        {/* HERO BANNER: PUSAT LAPORAN TERPADU */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-slate-800">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute left-1/3 -top-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
              <Sparkles size={14} className="text-indigo-400" />
              <span>SIM-PANLA DIGITAL REPORTING CENTER</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  <FileSpreadsheet className="text-indigo-400" size={32} />
                  <span>Pusat Laporan Terpadu</span>
                </h1>
                <p className="text-slate-300 text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
                  Sentra administrasi & unduh laporan resmi UPT SMP Negeri 8 Pasuruan. Dilengkapi fasilitas Cetak PDF dan Download Excel pada setiap kategori laporan.
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shrink-0">
                <Calendar size={18} className="text-indigo-300" />
                <div className="text-xs">
                  <div className="text-slate-300">Tahun Pelajaran:</div>
                  <div className="font-bold text-white">
                    {academicYear || "2025/2026"} (Semester {semester || "1"})
                  </div>
                </div>
              </div>
            </div>

            {/* TAB SELECTOR (SCROLLABLE ON MOBILE, WRAP ON DESKTOP) */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                        isActive
                          ? `${tab.badgeColor} text-white shadow-lg`
                          : "bg-white/10 hover:bg-white/20 text-slate-200"
                      }`}
                    >
                      <Icon size={16} />
                      <span>
                        {tab.label}
                        {tab.id === "kelola_scan" && scanCount !== null
                          ? ` (${scanCount})`
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: KELOLA HASIL SCAN */}
        {activeTab === "kelola_scan" && (
          <div className="space-y-6">
            <KelolaHasilScan onCountChange={(count) => setScanCount(count)} />
          </div>
        )}

        {/* TAB 2: MATRIK SCAN MASUK (1–31) */}
        {activeTab === "matrix_scan_masuk" && (
          <div className="space-y-6">
            <RekapScanMasukMatrix showHeader={false} />
          </div>
        )}

        {/* TAB 3: REKAPITULASI KHUSUS SHOLAT (MATRIKS BULANAN TANGGAL 1–31) */}
        {activeTab === "matrix_sholat" && (
          <div className="space-y-6">
            <RekapSholatMatrix showHeader={false} />
          </div>
        )}

        {/* TAB 3: LAPORAN JURNAL KBM GURU */}
        {activeTab === "laporan_jurnal" && (
          <div className="space-y-6">
            <LaporanJurnal embedded={true} />
          </div>
        )}

        {/* TAB 4: REKAP ABSENSI BUKU RAPOR */}
        {activeTab === "absensi_rapor" && (
          <div className="space-y-6">
            <AbsensiRapor embedded={true} />
          </div>
        )}

        {/* TAB 5: PRESENSI QR & EKSTRAKURIKULER */}
        {activeTab === "rekap_ekstra" && canAccessEkstraTab && (
          <div className="space-y-6">
            <RekapEkstraTab />
          </div>
        )}

        {/* TAB 6: LAPORAN KEDISIPLINAN & BK */}
        {activeTab === "kedisiplinan" && (
          <div className="space-y-6">
            <Kedisiplinan embedded={true} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PusatLaporan;
