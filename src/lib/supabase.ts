import { createClient } from '@supabase/supabase-js';

// Obtener las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Crear el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Tipos de ayuda para TypeScript
export type Database = {
  // Aquí puedes definir los tipos de tus tablas de Supabase
  // Por ejemplo:
  // public: {
  //   Tables: {
  //     users: {
  //       Row: {
  //         id: string;
  //         email: string;
  //         created_at: string;
  //       };
  //       Insert: {
  //         id?: string;
  //         email: string;
  //         created_at?: string;
  //       };
  //       Update: {
  //         id?: string;
  //         email?: string;
  //         created_at?: string;
  //       };
  //     };
  //   };
  // };
};
