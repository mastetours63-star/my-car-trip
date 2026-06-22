/**
 * Web fallback implementation using AsyncStorage.
 * Native platforms use DatabaseContext.native.tsx (expo-sqlite).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Trip, Member, Expense } from "@/types";
import type { DatabaseContextType } from "./DatabaseContext.native";

export type { DatabaseContextType };

const KEYS = {
  trips: "mct_trips",
  members: "mct_members",
  expenses: "mct_expenses",
} as const;

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

async function load<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

async function save<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, m, e] = await Promise.all([
        load<Trip>(KEYS.trips),
        load<Member>(KEYS.members),
        load<Expense>(KEYS.expenses),
      ]);
      setTrips(t.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setMembers(m);
      setExpenses(e);
      setIsReady(true);
    })();
  }, []);

  const reloadTrips = useCallback(async () => {
    const t = await load<Trip>(KEYS.trips);
    setTrips(t.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  const createTrip = useCallback(async (data: Omit<Trip, "id" | "createdAt">): Promise<Trip> => {
    const trip: Trip = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    const next = [trip, ...trips];
    setTrips(next);
    await save(KEYS.trips, next);
    return trip;
  }, [trips]);

  const updateTrip = useCallback(async (id: string, data: Partial<Omit<Trip, "id" | "createdAt">>) => {
    const next = trips.map((t) => (t.id === id ? { ...t, ...data } : t));
    setTrips(next);
    await save(KEYS.trips, next);
  }, [trips]);

  const deleteTrip = useCallback(async (id: string) => {
    const nextTrips = trips.filter((t) => t.id !== id);
    const nextMembers = members.filter((m) => m.tripId !== id);
    const nextExpenses = expenses.filter((e) => e.tripId !== id);
    setTrips(nextTrips);
    setMembers(nextMembers);
    setExpenses(nextExpenses);
    await Promise.all([
      save(KEYS.trips, nextTrips),
      save(KEYS.members, nextMembers),
      save(KEYS.expenses, nextExpenses),
    ]);
  }, [trips, members, expenses]);

  const getMembersForTrip = useCallback(async (tripId: string): Promise<Member[]> => {
    return members.filter((m) => m.tripId === tripId);
  }, [members]);

  const addMember = useCallback(async (data: Omit<Member, "id">): Promise<Member> => {
    const member: Member = { id: generateId(), ...data };
    const next = [...members, member];
    setMembers(next);
    await save(KEYS.members, next);
    return member;
  }, [members]);

  const updateMember = useCallback(async (id: string, data: Partial<Omit<Member, "id">>) => {
    const next = members.map((m) => (m.id === id ? { ...m, ...data } : m));
    setMembers(next);
    await save(KEYS.members, next);
  }, [members]);

  const deleteMember = useCallback(async (id: string) => {
    const next = members.filter((m) => m.id !== id);
    setMembers(next);
    await save(KEYS.members, next);
  }, [members]);

  const getExpensesForTrip = useCallback(async (tripId: string): Promise<Expense[]> => {
    return expenses
      .filter((e) => e.tripId === tripId)
      .sort((a, b) => {
        const da = `${a.date}${a.time}`;
        const db = `${b.date}${b.time}`;
        return db.localeCompare(da);
      });
  }, [expenses]);

  const addExpense = useCallback(async (data: Omit<Expense, "id" | "createdAt">): Promise<Expense> => {
    const expense: Expense = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    const next = [...expenses, expense];
    setExpenses(next);
    await save(KEYS.expenses, next);
    return expense;
  }, [expenses]);

  const updateExpense = useCallback(async (id: string, data: Partial<Omit<Expense, "id" | "createdAt">>) => {
    const next = expenses.map((e) => (e.id === id ? { ...e, ...data } : e));
    setExpenses(next);
    await save(KEYS.expenses, next);
  }, [expenses]);

  const deleteExpense = useCallback(async (id: string) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    await save(KEYS.expenses, next);
  }, [expenses]);

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
