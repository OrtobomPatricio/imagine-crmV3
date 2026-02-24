import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
    title: 'UI/Badge',
    component: Badge,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'secondary', 'destructive', 'outline'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
    args: { children: 'Nuevo' },
};

export const Secondary: Story = {
    args: { children: 'En Progreso', variant: 'secondary' },
};

export const Destructive: Story = {
    args: { children: 'Urgente', variant: 'destructive' },
};

export const Outline: Story = {
    args: { children: 'Borrador', variant: 'outline' },
};

export const LeadStatuses: Story = {
    render: () => (
        <div className="flex gap-2">
            <Badge>Nuevo</Badge>
            <Badge variant="secondary">Contactado</Badge>
            <Badge variant="outline">Calificado</Badge>
            <Badge variant="destructive">Perdido</Badge>
        </div>
    ),
};
