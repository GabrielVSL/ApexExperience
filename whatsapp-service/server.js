import http from 'http';
import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const PORT = process.env.PORT || 8085;
const logger = pino({ level: 'silent' });

let sock = null;
let isConnected = false;
let latestQr = null;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Apex Racing Paddock', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
      console.log('\n============================================================');
      console.log('🏎️ APEX WHATSAPP GATEWAY (100% GRATUITO / SEM MENSALIDADE)');
      console.log('Escaneie o QR Code abaixo com seu WhatsApp para ativar:');
      console.log('WhatsApp > Dispositivos Conectados > Conectar um Aparelho');
      console.log('============================================================\n');
      qrcode.generate(qr, { small: true });
      console.log('\n============================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      console.log('⚠️ Conexão com o WhatsApp encerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      isConnected = true;
      latestQr = null;
      console.log('✅ APEX WHATSAPP GATEWAY ONLINE! Mensagens prontas para envio.');
    }
  });
}

connectToWhatsApp();

// Servidor HTTP local para receber comandos de envio do backend Micronaut
const server = http.createServer(async (req, res) => {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: isConnected ? 'ONLINE' : 'CONNECTING',
      connected: isConnected,
      needsQr: !isConnected && !!latestQr,
    }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/send-otp') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body || '{}');

        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Parâmetros phone e message são obrigatórios' }));
          return;
        }

        // Formatação do número: adiciona 55 (Brasil) se não houver código de país
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10 || clean.length === 11) {
          clean = `55${clean}`;
        }
        const jid = `${clean}@s.whatsapp.net`;

        if (!isConnected || !sock) {
          console.warn(`[Apex WhatsApp Gateway (Simulação)] Para: ${clean} | Mensagem: "${message}"`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            simulated: true,
            message: 'WhatsApp Gateway em espera de pareamento por QR Code. Mensagem registrada no log.',
          }));
          return;
        }

        // Envio real pelo WhatsApp via Baileys
        await sock.sendMessage(jid, { text: message });
        console.log(`[Apex WhatsApp Gateway] Mensagem real entregue com sucesso para ${clean}!`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          simulated: false,
          message: 'Mensagem enviada com sucesso no WhatsApp do piloto!',
        }));
      } catch (err) {
        console.error('[Apex WhatsApp Gateway] Erro ao enviar mensagem:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Microserviço Apex WhatsApp HTTP ouvindo na porta ${PORT}`);
});
