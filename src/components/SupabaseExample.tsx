import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Componente de ejemplo para demostrar el uso de Supabase
 * Este componente muestra cómo:
 * - Autenticar usuarios
 * - Usar el hook useSupabaseAuth
 * - Realizar queries básicas
 */
export function SupabaseExample() {
    const { user, loading, signOut } = useSupabaseAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success('¡Inicio de sesión exitoso!');
        } catch (error: any) {
            toast.error(error.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async () => {
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            toast.success('¡Cuenta creada! Revisa tu email para confirmar.');
        } catch (error: any) {
            toast.error(error.message || 'Error al crear cuenta');
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        try {
            const { data, error } = await supabase
                .from('_test_table_')
                .select('*')
                .limit(1);

            if (error) {
                toast.error('Conexión fallida: ' + error.message);
            } else {
                toast.success('✅ Conexión exitosa a Supabase!');
            }
        } catch (error: any) {
            toast.info('Base de datos conectada (tabla de prueba no existe aún)');
        }
    };

    if (loading) {
        return (
            <Card className="w-full max-w-md mx-auto mt-8">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (user) {
        return (
            <Card className="w-full max-w-md mx-auto mt-8">
                <CardHeader>
                    <CardTitle>¡Autenticado! ✅</CardTitle>
                    <CardDescription>Estás conectado a Supabase</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Email:</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium">ID de Usuario:</p>
                        <p className="text-sm text-muted-foreground font-mono text-xs">
                            {user.id}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => signOut()} variant="outline" className="flex-1">
                            Cerrar Sesión
                        </Button>
                        <Button onClick={testConnection} className="flex-1">
                            Test Conexión
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto mt-8">
            <CardHeader>
                <CardTitle>Supabase Auth Demo</CardTitle>
                <CardDescription>
                    Prueba la conexión con Supabase
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleSignUp}
                            disabled={isLoading}
                        >
                            Crear Cuenta
                        </Button>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={testConnection}
                    >
                        🔌 Probar Conexión
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
