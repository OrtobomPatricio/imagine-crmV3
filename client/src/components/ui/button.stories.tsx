import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Download, Trash2, Plus, Send } from 'lucide-react';

const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: {
            control: 'select',
            options: ['default', 'sm', 'lg', 'icon'],
        },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: { children: 'Guardar Cambios' },
};

export const Destructive: Story = {
    args: { children: 'Eliminar Lead', variant: 'destructive' },
};

export const Outline: Story = {
    args: { children: 'Cancelar', variant: 'outline' },
};

export const Secondary: Story = {
    args: { children: 'Exportar', variant: 'secondary' },
};

export const Ghost: Story = {
    args: { children: 'Ver más', variant: 'ghost' },
};

export const Link: Story = {
    args: { children: 'Ir al Dashboard', variant: 'link' },
};

export const Loading: Story = {
    args: { children: 'Procesando...', isLoading: true },
};

export const WithIcon: Story = {
    render: () => (
        <div className="flex gap-2">
            <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Lead</Button>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
            <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
            <Button variant="secondary"><Send className="mr-2 h-4 w-4" /> Enviar</Button>
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Button size="sm">Pequeño</Button>
            <Button size="default">Normal</Button>
            <Button size="lg">Grande</Button>
        </div>
    ),
};
