import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Obtener las variables de configuración
const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check src/config.ts');
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
