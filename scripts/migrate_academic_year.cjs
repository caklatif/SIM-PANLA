const fs = require('fs');
const path = require('path');

const TYPES_FILE = path.join(__dirname, '../types.ts');
const SQL_FILE = path.join(__dirname, '../SUPABASE_SETUP.sql');

// 1. Update SUPABASE_SETUP.sql
let sql = fs.readFileSync(SQL_FILE, 'utf8');
if (!sql.includes('academic_year text')) {
    sql = sql.replace('create table if not exists public.schedules (', "create table if not exists public.schedules (\n  academic_year text default '2024/2025',\n  semester text default 'Genap',");
    sql = sql.replace('create table if not exists public.journals (', "create table if not exists public.journals (\n  academic_year text default '2024/2025',\n  semester text default 'Genap',");
    sql = sql.replace('create table if not exists public.homeroom_attendance (', "create table if not exists public.homeroom_attendance (\n  academic_year text default '2024/2025',\n  semester text default 'Genap',");
    sql = sql.replace('create table if not exists public.journal_notes (', "create table if not exists public.journal_notes (\n  academic_year text default '2024/2025',\n  semester text default 'Genap',");
    sql = sql.replace('create table if not exists public.attendance_logs (', "create table if not exists public.attendance_logs (\n  academic_year text default '2024/2025',\n  semester text default 'Genap',");
    
    sql += `

-- MIGRATION: Tambahkan academic_year ke tabel-tabel utama
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'schedules' and column_name = 'academic_year') then
    alter table public.schedules add column academic_year text default '2024/2025';
    alter table public.schedules add column semester text default 'Genap';
    
    alter table public.journals add column academic_year text default '2024/2025';
    alter table public.journals add column semester text default 'Genap';
    
    alter table public.homeroom_attendance add column academic_year text default '2024/2025';
    alter table public.homeroom_attendance add column semester text default 'Genap';
    
    alter table public.journal_notes add column academic_year text default '2024/2025';
    alter table public.journal_notes add column semester text default 'Genap';

    alter table public.attendance_logs add column academic_year text default '2024/2025';
    alter table public.attendance_logs add column semester text default 'Genap';
  end if;
end $$;
`;
    fs.writeFileSync(SQL_FILE, sql);
}

// 2. Update Types
let types = fs.readFileSync(TYPES_FILE, 'utf8');
if (!types.includes('academic_year?: string;')) {
    types = types.replace('export interface Schedule {', 'export interface Schedule {\n  academic_year?: string;\n  semester?: string;');
    types = types.replace('export interface Journal {', 'export interface Journal {\n  academic_year?: string;\n  semester?: string;');
    fs.writeFileSync(TYPES_FILE, types);
}

console.log("SQL and Types updated successfully!");
