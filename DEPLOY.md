# 🚀 Guia de Deploy em Produção (Vercel + Koyeb + Supabase)

Este guia descreve o passo a passo exato para publicar o ecossistema **Apex Track Experience & ApexPay** em produção de forma gratuita utilizando **Vercel** (Frontend), **Koyeb** (Backend Micronaut Java 21 em Docker) e **Supabase** (PostgreSQL).

---

## 🏗️ Arquitetura de Produção

```
[ Frontend: Vercel (Edge CDN + Vite SPA) ]
             │
             ▼ (HTTPS / REST + JWT Bearer)
[ Backend: Koyeb (Docker Multi-Stage / JRE 21 Alpine + Virtual Threads) ]
             │
             ▼ (JDBC SSL + Transaction Pooler Supavisor)
[ Banco de Dados: Supabase (PostgreSQL 15+) ]
```

### Por que essa composição?
- **Frontend na Vercel:** Deploy contínuo por push, CDN global e `frontend/vercel.json` já configurado para reescrever rotas SPA (`/(.*) -> /index.html`).
- **Backend no Koyeb:** Roda o `backend/Dockerfile` diretamente sobre **Java 21 JRE Alpine** com flags otimizadas para containers de **512 MB** (`-XX:MaxRAMPercentage=75 -XX:+UseSerialGC`) e **Virtual Threads** na fila de reservas (`ReservaQueueEngine`).
- **PostgreSQL no Supabase:** Banco gerenciado gratuito com Connection Pooler (**Supavisor**) compatível com IPv4 dos containers da Koyeb.

---

## 🗄️ Etapa 1: Banco de Dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto (ex: `apex-rentcars-prod`).
2. Guarde a senha do banco definida na criação.
3. No painel do projeto, clique em **Connect** (topo da tela) → aba **Connection String** → selecione **Transaction pooler** (porta `6543`).
   > **Importante:** O container gratuito da Koyeb utiliza rede **IPv4**, portanto use sempre o **Transaction Pooler (porta `6543`)** e não a conexão direta na porta `5432` (que no plano gratuito do Supabase pode exigir IPv6).
4. Monte a URL JDBC **exatamente** com `?sslmode=require&prepareThreshold=0`:
   ```text
   jdbc:postgresql://aws-0-[regiao].pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
   ```
   - O parâmetro **`prepareThreshold=0`** é obrigatório ao usar Hibernate/JPA com o Transaction Pooler do Supabase (`6543`) para evitar o erro `prepared statement "S_1" already exists`.
   - Atenção ao **usuário (`DB_USER`)**: no Transaction Pooler do Supabase, o usuário inclui o ID do projeto no formato `postgres.[project-ref]` (copie o valor exato exibido no modal *Connect* do Supabase).

---

## ⚙️ Etapa 2: Backend (Koyeb com Docker)

O repositório possui o arquivo `backend/Dockerfile` (multi-stage build com JDK/JRE 21) e `backend/src/main/resources/application.properties` já pré-configurados com driver e dialeto do PostgreSQL.

1. Acesse [koyeb.com](https://www.koyeb.com) e conecte sua conta GitHub.
2. Clique em **Create Web Service** → **GitHub** e selecione este repositório.
3. Em **Builder & Deployment**:
   - **Builder:** `Dockerfile`
   - **Work Directory (Docker Build Context):** `backend`
   - **Dockerfile location:** `Dockerfile` (ou `backend/Dockerfile` conforme o seletor da tela; mantenha o context apontando para `backend`)
   - **Instance:** `Free / Eco` (512 MB RAM)
4. Em **Exposed Ports & Health Check**:
   - **Port:** `8080` (Protocol: `HTTP`)
   - **Health Check:** Protocol `HTTP`, Path `/api/health`, Port `8080`, Grace Period `60` segundos (tempo para a primeira criação de tabelas do Hibernate e carga inicial do `DataInitializer`).
5. Em **Environment Variables**, configure:

| Variável | Obrigatória | Valor / Exemplo |
| :--- | :---: | :--- |
| `PORT` | Sim | `8080` |
| `JDBC_URL` | Sim | `jdbc:postgresql://aws-0-[regiao].pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0` |
| `DB_USER` | Sim | `postgres.[project-ref]` (fornecido no Pooler do Supabase) |
| `DB_PASSWORD` | Sim | Senha do banco configurada no Supabase |
| `JWT_SECRET` | Sim | String secreta forte (mínimo 32 caracteres). *Também assina os QR Codes HMAC-SHA256 das sessões.* |
| `CORS_ALLOWED_ORIGINS_REGEX` | Opcional | Padrão já aceita `localhost`, `*.vercel.app`, `*.koyeb.app`, `*.onrender.com`, `*.netlify.app`, `*.railway.app`. Defina apenas se usar domínio próprio (ex: `^https://(www\.)?seudominio\.com$`). |
| `WHATSAPP_TOKEN` | Opcional | Token da **WhatsApp Cloud API (Meta)** para envio real de OTP e passe em produção. |
| `WHATSAPP_PHONE_NUMBER_ID` | Opcional | ID do número na Meta Cloud API. |
| `WHATSAPP_SERVICE_URL` | Opcional | URL pública caso suba o microserviço `whatsapp-service` separado (não necessário se usar a Meta Cloud API). |

6. Clique em **Deploy** e aguarde o status ficar **Healthy**. Copie a URL pública gerada (ex: `https://apex-backend-seuuser.koyeb.app`).

---

## 💻 Etapa 3: Frontend (Vercel)

O diretório `frontend` já contém o [vercel.json](frontend/vercel.json) configurado com rewrites para evitar erro 404 nas rotas do React Router.

1. Acesse [vercel.com](https://vercel.com) → **Add New → Project** e importe o repositório.
2. Em **Configure Project**:
   - **Root Directory:** clique em *Edit* e selecione `frontend`.
   - **Framework Preset:** `Vite`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Em **Environment Variables**, adicione:

| Variável | Valor |
| :--- | :--- |
| `VITE_API_URL` | URL pública do backend no Koyeb **sem barra no final** (ex: `https://apex-backend-seuuser.koyeb.app`) |

4. Clique em **Deploy**.
5. Caso adicione um domínio customizado na Vercel posteriormente (diferente de `*.vercel.app`), adicione-o na regex da variável `CORS_ALLOWED_ORIGINS_REGEX` no Koyeb e faça redeploy do backend.

---

## 🔒 Credenciais Padrão do Administrador (Race Control)

No primeiro boot contra o banco Supabase vazio, o `DataInitializer` cria automaticamente os 8 circuitos, os 8 supercarros fixos da frota, os slots dos próximos 14 dias e a conta administrativa imutável:

- **E-mail:** `admin@apex.com`
- **Senha:** `123456`
- **Painel:** `/admin` e `/pedidos` (a senha, o e-mail e o nome desta conta são protegidos contra alteração para manter a demonstração pública funcional).

---

## 🔍 Checklist de Validação Pós-Deploy

- [ ] **Saúde Backend & Fila:** Acessar `https://seu-backend.koyeb.app/api/health` e confirmar `"status": "UP"`, `"database": { "status": "UP", "supercarrosFixos": 8 }`, `"virtualThreads": true` e `"bookingQueue": { "status": "ONLINE" }`.
- [ ] **Swagger / OpenAPI:** Acessar `https://seu-backend.koyeb.app/swagger-ui` para confirmar a documentação da API online.
- [ ] **SPA & Rotas Vercel:** Abrir a URL da Vercel, navegar para `/cars`, `/pistas` e `/login`, e pressionar **F5** para garantir que não ocorre erro `404` (`vercel.json`).
- [ ] **Login Admin & Race Control:** Entrar com `admin@apex.com` / `123456` e validar o painel `/admin`.
- [ ] **Fluxo Completo + Fila + QR Code Criptográfico:** Cadastrar um piloto, fazer uma recarga simulada no `/apexpay`, agendar uma sessão de pista e validar:
  - Métricas da fila em `GET /api/pedidos/fila/metricas` (autenticado).
  - Emissão do **QR Code FIA Paddock Pass (`HMAC-SHA256`)** em `/meus-alugueis` → *Credencial QR Code*.
  - Validação e **Check-in no Pitlane** pelo Admin em `/pedidos` → *Validador QR / Check-in Box*.
