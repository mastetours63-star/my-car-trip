import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as SQLite from "expo-sqlite";
import type { Trip, Member, Expense } from "@/types";

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

export interface DatabaseContextType {
  trips: Trip[];
  isReady: boolean;
  createTrip: (data: Omit<Trip, "id" | "createdAt">) => Promise<Trip>;
  updateTrip: (id: string, data: Partial<Omit<Trip, "id" | "createdAt">>) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  getMembersForTrip: (tripId: string) => Promise<Member[]>;
  addMember: (data: Omit<Member, "id">) => Promise<Member>;
  updateMember: (id: string, data: Partial<Omit<Member, "id">>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  getExpensesForTrip: (tripId: string) => Promise<Expense[]>;
  addExpense: (data: Omit<Expense, "id" | "createdAt">) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Omit<Expense, "id" | "createdAt">>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  reloadTrips: () => Promise<void>;
}

export const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isReady, setIsReady] = useState(false);
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync("mycartrip.db");
        dbRef.current = db;
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS trips (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            departureDate TEXT NOT NULL,
            returnDate TEXT NOT NULL,
            totalBudget REAL NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY,
            tripId TEXT NOT NULL,
            name TEXT NOT NULL,
            advanceAmount REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
          );
          CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            tripId TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            location TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            createdAt TEXT NOT NULL,
            FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
          );
        `);
        const rows = await db.getAllAsync<Trip>("SELECT * FROM trips ORDER BY createdAt DESC");
        if (mounted) {
          setTrips(rows);
          setIsReady(true);
        }
      } catch (e) {
        console.error("DB init error", e);
        if (mounted) setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const reloadTrips = useCallback(async () => {
    if (!dbRef.current) return;
    const rows = await dbRef.current.getAllAsync<Trip>(
      "SELECT * FROM trips ORDER BY createdAt DESC"
    );
    setTrips(rows);
  }, []);

  const createTrip = useCallback(async (data: Omit<Trip, "id" | "createdAt">): Promise<Trip> => {
    const db = dbRef.current!;
    const id = generateId();
    const createdAt = new Date().toISOString();
    const trip: Trip = { id, ...data, createdAt };
    await db.runAsync(
      "INSERT INTO trips (id, name, departureDate, returnDate, totalBudget, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [id, data.name, data.departureDate, data.returnDate, data.totalBudget, createdAt]
    );
    setTrips((prev) => [trip, ...prev]);
    return trip;
  }, []);

  const updateTrip = useCallback(async (id: string, data: Partial<Omit<Trip, "id" | "createdAt">>) => {
    const db = dbRef.current!;
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), id];
    await db.runAsync(`UPDATE trips SET ${fields} WHERE id = ?`, values);
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    const db = dbRef.current!;
    await db.runAsync("DELETE FROM trips WHERE id = ?", [id]);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getMembersForTrip = useCallback(async (tripId: string): Promise<Member[]> => {
    const db = dbRef.current!;
    return db.getAllAsync<Member>(
      "SELECT * FROM members WHERE tripId = ? ORDER BY rowid ASC", [tripId]
    );
  }, []);

  const addMember = useCallback(async (data: Omit<Member, "id">): Promise<Member> => {
    const db = dbRef.current!;
    const id = generateId();
    const member: Member = { id, ...data };
    await db.runAsync(
      "INSERT INTO members (id, tripId, name, advanceAmount) VALUES (?, ?, ?, ?)",
      [id, data.tripId, data.name, data.advanceAmount]
    );
    return member;
  }, []);

  const updateMember = useCallback(async (id: string, data: Partial<Omit<Member, "id">>) => {
    const db = dbRef.current!;
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), id];
    await db.runAsync(`UPDATE members SET ${fields} WHERE id = ?`, values);
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    const db = dbRef.current!;
    await db.runAsync("DELETE FROM members WHERE id = ?", [id]);
  }, []);

  const getExpensesForTrip = useCallback(async (tripId: string): Promise<Expense[]> => {
    const db = dbRef.current!;
    return db.getAllAsync<Expense>(
      "SELECT * FROM expenses WHERE tripId = ? ORDER BY date DESC, time DESC, createdAt DESC",
      [tripId]
    );
  }, []);

  const addExpense = useCallback(async (data: Omit<Expense, "id" | "createdAt">): Promise<Expense> => {
    const db = dbRef.current!;
    const id = generateId();
    const createdAt = new Date().toISOString();
    const expense: Expense = { id, ...data, createdAt };
    await db.runAsync(
      "INSERT INTO expenses (id, tripId, category, amount, date, time, location, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, data.tripId, data.category, data.amount, data.date, data.time, data.location, data.description, createdAt]
    );
    return expense;
  }, []);

  const updateExpense = useCallback(async (id: string, data: Partial<Omit<Expense, "id" | "createdAt">>) => {
    const db = dbRef.current!;
    const fields = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(data), id];
    await db.runAsync(`UPDATE expenses SET ${fields} WHERE id = ?`, values);
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    const db = dbRef.current!;
    await db.runAsync("DELETE FROM expenses WHERE id = ?", [id]);
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        trips, isReady,
        createTrip, updateTrip, deleteTrip,
        getMembersForTrip, addMember, updateMember, deleteMember,
        getExpensesForTrip, addExpense, updateExpense, deleteExpense,
        reloadTrips,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useDatabase must be used within DatabaseProvider");
  return ctx;
}
