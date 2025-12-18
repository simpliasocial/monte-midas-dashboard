import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Phone, User } from "lucide-react";

const recentAppointments = [
    {
        id: 1,
        nombre: "Margarita Veliz",
        celular: "+593 99 123 4567",
        agencia: "Agencia Amazonas",
        fecha: "2025-12-19",
        hora: "10:00 AM",
        status: "Confirmada"
    },
    {
        id: 2,
        nombre: "Juan Pérez",
        celular: "+593 98 765 4321",
        agencia: "Agencia Villaflora",
        fecha: "2025-12-19",
        hora: "11:30 AM",
        status: "Pendiente"
    },
    {
        id: 3,
        nombre: "María López",
        celular: "+593 99 876 5432",
        agencia: "Agencia Marianitas",
        fecha: "2025-12-20",
        hora: "09:00 AM",
        status: "Confirmada"
    },
    {
        id: 4,
        nombre: "Carlos Ruiz",
        celular: "+593 97 654 3210",
        agencia: "Agencia Sangolquí",
        fecha: "2025-12-20",
        hora: "03:00 PM",
        status: "Confirmada"
    },
    {
        id: 5,
        nombre: "Ana Torres",
        celular: "+593 96 543 2109",
        agencia: "Agencia Tumbaco",
        fecha: "2025-12-21",
        hora: "10:30 AM",
        status: "Pendiente"
    }
];

export function RecentAppointments() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">Cliente</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Agencia</TableHead>
                        <TableHead>Fecha y Hora</TableHead>
                        <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {appointment.nombre}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    {appointment.celular}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    {appointment.agencia}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        {appointment.fecha}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {appointment.hora}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant={appointment.status === "Confirmada" ? "default" : "secondary"}>
                                    {appointment.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
