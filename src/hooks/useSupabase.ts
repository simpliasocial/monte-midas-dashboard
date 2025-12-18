import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Hook personalizado para obtener el usuario autenticado de Supabase
 * @returns {User | null} El usuario autenticado o null
 */
export function useSupabaseAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Obtener sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Escuchar cambios en la autenticación
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    return {
        user,
        session,
        loading,
        signOut: () => supabase.auth.signOut(),
    };
}

/**
 * Hook personalizado para realizar queries de Supabase con estado
 * @param table Nombre de la tabla
 * @param query Función de query personalizada
 */
export function useSupabaseQuery<T>(
    table: string,
    query?: (queryBuilder: any) => any
) {
    const [data, setData] = useState<T[] | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let queryBuilder = supabase.from(table).select('*');

                if (query) {
                    queryBuilder = query(queryBuilder);
                }

                const { data, error } = await queryBuilder;

                if (error) throw error;
                setData(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [table]);

    return { data, error, loading };
}
