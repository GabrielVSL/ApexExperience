<div align="center">
  <img width="70%" alt="pucminas" src="https://joaopauloaramuni.github.io/image/engsoft2.svg?raw=true"/>
</div>

<h1 align="center">Apex Track Experience — Supercarros & Track Days</h1>

<div align="center">

![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Micronaut](https://img.shields.io/badge/Micronaut-000000?style=for-the-badge&logo=micronaut&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Laboratório de Desenvolvimento de Software — PUC Minas**

*Engenharia de Software · Prof. João Paulo Carneiro Aramuni*

</div>

---

## 📋 Sobre o Projeto

Plataforma full-stack para reserva de supercarros em **8 circuitos oficiais FIA** (Interlagos, Nürburgring, Spa-Francorchamps, Le Mans, Monza, Mônaco, Silverstone e Suzuka), evoluída a partir do projeto acadêmico de **Laboratório de Desenvolvimento de Software** da PUC Minas.

O sistema oferece catálogo dinâmico por circuito e turno (`TrackSlot`), prevenção de overbooking, carteira digital integrada (**ApexPay**) com fidelidade progressiva e cobrança de sinistros/taxas, **E-Pass QR** assinado com HMAC-SHA256 para check-in no paddock, fila assíncrona de reservas e notificações transacionais por e-mail via **Resend API**.

### Atores do Sistema

| Ator | Role JWT | Permissões |
|---|---|---|
| **Piloto (Cliente)** | `ROLE_CLIENTE` | Cadastrar conta e CNH, consultar circuitos/vagas, criar/reagendar/cancelar sessões e gerenciar carteira ApexPay. |
| **Diretor de Prova (Admin)** | `ROLE_ADMIN` | Operar o Race Control (aprovar/reprovar sessões, check-in E-Pass, sinistros), gerenciar pilotos, saldos e visualizar métricas da fila. |

---

## 🏗️ Arquitetura

O sistema segue o padrão arquitetural **Cliente-Servidor via API RESTful**, dividido em duas camadas desacopladas:

- **Frontend (SPA)** — React, TypeScript, Tailwind CSS, Framer Motion e Vite.
- **Backend (API)** — Micronaut Framework (Java 21), Micronaut Data JPA, Micronaut Security JWT e envio de e-mails assíncronos via Resend API.

```text
┌──────────────────────────────────────────────┐
│                Frontend Web (SPA)            │
│      React + TypeScript + Tailwind + Vite    │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / REST / JWT
┌──────────────────────▼───────────────────────┐
│              Servidor API (Micronaut)        │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Security JWT │  │      Controllers      │ │
│  └──────────────┘  └──────────┬────────────┘ │
│                               │              │
│                    ┌──────────▼────────────┐ │
│                    │   Facades / Services  │ │
│                    │  (ApexPay / Queue /   │ │
│                    │   QrCodePass / Email) │ │
│                    └──────────┬────────────┘ │
│                               │              │
│                    ┌──────────▼────────────┐ │
│                    │ Micronaut Data (JPA)  │ │
│                    └───────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Tecnologias Utilizadas

### Backend

- **Java 21** — Linguagem principal
- **Micronaut Framework** — API REST, injeção de dependências AOT e agendadores (`@Scheduled`)
- **Micronaut Data JPA + Hibernate** — Persistência relacional (H2 em desenvolvimento / PostgreSQL em produção)
- **Micronaut Security (JWT)** — Autenticação stateless e RBAC por perfis (`ROLE_CLIENTE`, `ROLE_ADMIN`)
- **Resend API** — Envio de e-mail transacional para recuperação de senha por código OTP (6 dígitos)

### Frontend

- **React 19 + TypeScript** — Biblioteca de UI com tipagem estrita
- **Vite** — Bundler e servidor de desenvolvimento
- **Tailwind CSS & Framer Motion** — Design system escuro automobilístico e animações
- **Vitest + Testing Library** — Testes unitários e de integração de componentes

---

## 📦 Histórico de Modelagem (Sprints Acadêmicas PUC Minas)

> Os diagramas originais documentam a base acadêmica da disciplina antes da evolução para o domínio **Apex Track Experience**:

### ✅ Lab02S01 — Sprint 1: Modelagem UML

#### Diagrama de Casos de Uso

![Diagrama de Casos de Uso](./assets/DiagramaCasosDeUso.png)

#### Diagrama de Classes

![Diagrama de Classes](./assets/UML.png)

#### Diagrama de Pacotes

![Diagrama de Pacotes](./assets/DiagramaDePacotes.png)

### 🔄 Lab02S02 — Sprint 2: Componentes e CRUD

![Diagrama de Componentes](./assets/DiagramaComponentes.png)

### 🔄 Lab02S03 — Sprint 3: Implantação e Plataforma Apex Track Experience

![Diagrama de Implantação](./assets/DiagramaImplnatacao.png)

- Motor de prevenção de overbooking por veículo e controle otimista de vagas por turno (`TrackSlot` com `@Version`).
- Carteira **ApexPay** com histórico de transações, juros automáticos diários em débitos vencidos e desconto progressivo por tier.
- Painel **Race Control** para aprovação/reprovação de sessões, leitura de **E-Pass QR**, registro de sinistros e monitoramento da fila.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- **Java 21+**
- **Node.js 20+** (para o Frontend)
- Gradle Wrapper (`./gradlew` / `.\gradlew.bat` incluído em `backend/`)

### Executando o Backend (Micronaut)

```bash
cd backend

# No Linux/macOS:
./gradlew run

# No Windows (PowerShell / CMD):
.\gradlew.bat run
```

A API estará disponível em `http://localhost:8080`.

### Executando o Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

A aplicação web estará disponível em `http://localhost:5173`.

### Executando os Testes

```bash
# Testes Backend (JUnit 5 + Mockito)
cd backend && .\gradlew.bat test

# Lint, Testes e Build Frontend (ESLint + Vitest + Vite)
cd frontend && npm run lint && npm test -- --run && npm run build
```

---

## 🌐 Deploy em Produção

O projeto possui suporte a **Containerização Docker Multi-Stage**, **CORS configurável por ambiente** e **Rewrite SPA**:

### 1. Banco de Dados (PostgreSQL)
- **Supabase** ou **Neon.tech** com Connection String JDBC (`sslmode=require`).

### 2. Backend (Micronaut no Java 21)
- **Koyeb** ou **Render** (`Root Directory: backend`, `Build Type: Dockerfile`):
  - `JDBC_URL`: URL JDBC do PostgreSQL
  - `DB_USER` / `DB_PASSWORD`: credenciais do banco
  - `JWT_SECRET`: chave secreta HMAC-SHA256 (>= 32 bytes em produção)
  - `CORS_ALLOWED_ORIGINS`: URL do seu frontend em produção (padrão: `https://apex-experience.vercel.app`; além de `localhost:5173` e `localhost:3000` já liberados)
  - `RESEND_API_KEY` / `RESEND_FROM_EMAIL`: credenciais da Resend API para recuperação de senha
  - `ADMIN_DEMO_PASSWORD` / `TEST_PILOT_PASSWORD` *(opcional)*: sobrescrevem as senhas padrão dos usuários seed em produção

### 3. Frontend (React + Vite)
- **Vercel** (`Root Directory: frontend`, `Framework Preset: Vite`):
  - `VITE_API_URL`: URL pública do backend
  - `frontend/vercel.json` já configurado para roteamento SPA
