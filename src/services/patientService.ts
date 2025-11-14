// src/services/patientService.ts
import { supabase } from "./supabaseClient";
// ajuste o caminho se o tipo Patient estiver em outro lugar
import type { Patient } from "../store/board";

export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*") // ajuste pro nome das colunas que você criou
    .order("created_at", { ascending: true });

  if (error) throw error;

  // se o formato do banco não bater 100% com Patient,
  // faça o map aqui antes de retornar
  return data as Patient[];
}

export async function createPatient(input: {
  name: string;
  phone?: string;
}): Promise<Patient> {
  const { data, error } = await supabase
    .from("patients")
    .insert({
      name: input.name,
      phone: input.phone,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Patient;
}
