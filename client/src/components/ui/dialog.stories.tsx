import type { Meta, StoryObj } from '@storybook/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Dialog> = {
    title: 'UI/Dialog',
    component: Dialog,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const CrearLead: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Nuevo Lead</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Lead</DialogTitle>
                    <DialogDescription>
                        Ingresá los datos del contacto para agregar un nuevo lead al pipeline.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input id="name" placeholder="Juan Pérez" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" type="tel" placeholder="+595 981 234 567" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email (Opcional)</Label>
                        <Input id="email" type="email" placeholder="juan@empresa.com" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Guardar Lead</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};

export const ConfirmarEliminacion: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive">Eliminar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[380px]">
                <DialogHeader>
                    <DialogTitle>¿Eliminar lead?</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el lead y todo su historial de conversaciones.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline">Cancelar</Button>
                    <Button variant="destructive">Confirmar Eliminación</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};
