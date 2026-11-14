import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    role: z.literal('CLIENTE').default('CLIENTE'),
    nome: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    telefone: z.string().min(14, 'WhatsApp com DDD obrigatório'),
    password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirmPassword: z.string().min(6, 'Obrigatório'),
    endereco: z.string().min(5, 'Endereço obrigatório'),
    cpf: z.string().min(14, 'CPF inválido'),
    rg: z.string().min(5, 'RG obrigatório'),
    cnhNumero: z.string().optional(),
    dataNascimento: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type RegisterFormInputs = z.infer<typeof registerSchema>;
