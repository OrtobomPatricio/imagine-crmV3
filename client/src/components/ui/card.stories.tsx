import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card className="w-[380px]">
            <CardHeader>
                <CardTitle>Resumen del Pipeline</CardTitle>
                <CardDescription>Vista general de leads activos</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span>Nuevos</span>
                        <Badge>12</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Contactados</span>
                        <Badge variant="secondary">8</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Calificados</span>
                        <Badge variant="outline">5</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    ),
};

export const WithActions: Story = {
    render: () => (
        <Card className="w-[380px]">
            <CardHeader>
                <CardTitle>Lead: Juan Pérez</CardTitle>
                <CardDescription>+5491155667788 · Contactado</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Button size="sm">Editar</Button>
                <Button size="sm" variant="outline">Enviar Mensaje</Button>
                <Button size="sm" variant="destructive">Eliminar</Button>
            </CardContent>
        </Card>
    ),
};
