import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    tags: ['autodocs'],
    argTypes: {
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'tel', 'search'],
        },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: { placeholder: 'Nombre del lead...' },
};

export const Email: Story = {
    args: { type: 'email', placeholder: 'correo@empresa.com' },
};

export const Password: Story = {
    args: { type: 'password', placeholder: '••••••••' },
};

export const Phone: Story = {
    args: { type: 'tel', placeholder: '+54 9 11 1234-5678' },
};

export const Disabled: Story = {
    args: { placeholder: 'Campo deshabilitado', disabled: true },
};

export const WithLabel: Story = {
    render: () => (
        <div className="grid gap-2 w-[300px]">
            <Label htmlFor="phone">Teléfono del Lead</Label>
            <Input id="phone" type="tel" placeholder="+595 981 234 567" />
        </div>
    ),
};
