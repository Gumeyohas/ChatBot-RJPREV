import morgan from "morgan";
import cors from "cors";
import express from 'express';
import fetch from 'node-fetch'; // Importando o node-fetch

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Endpoint de verificação do Webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = 'meu_token_secreto'; // Defina o token aqui

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Endpoint que recebe mensagens
app.post('/webhook', (req, res) => {
    console.log('Webhook recebido:', req.body);
    const body = req.body;
  
    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(entry => {
        const changes = entry.changes;
        changes.forEach(change => {
          const message = change.value.messages && change.value.messages[0];
          if (message) {
            console.log('Mensagem recebida:', message);
            
            const from = message.from; // Número de telefone do remetente
            const text = message.text.body; // Conteúdo da mensagem
  
            // Chame a função para enviar uma resposta
            handleIncomingMessage(from, text);
          }
        });
      });
  
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  });
  
  // Função para lidar com mensagens recebidas
  const handleIncomingMessage = async (from, text) => {
    let responseMessage = '';
  
    // Aqui você pode implementar a lógica do seu chatbot
    if (text.toLowerCase() === 'olá') {
      responseMessage = 'Olá! Como posso ajudar você?';
    } else {
      responseMessage = 'Desculpe, não entendi sua mensagem.';
    }
  
    // Enviar a resposta usando a função sendMessage
    await sendMessage(from, responseMessage);
  };

const phone_number_id = 467167046473343;
// Função para enviar mensagens
const sendMessage = async (to, message) => {
    const url = `https://graph.facebook.com/v13.0/${phone_number_id}/messages`;
    const token = 'EAA0rRhfq43oBO67ZCacVJsrMM9Aa98n2Ie6YBIAdtHzANPDDiqFk5u2XMQrR0YNNZAbGzpf8cZCbfZBFIm9DXhLqC6pP7FP8lTxIEEufYlsFAOGhXw6wU5hfJqMCX1qcKbN7mrAjS7tRwau7gVBm7qo48muTjtSK85szspw3ZCqtZBt1CQ4Osvh7OePz3ZBtAFDhCrkcT3G1ZCGN7oDqmgZDZD'; // Substitua pelo seu token de acesso
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          text: { body: message }
        })
      });
  
      const data = await response.json();
      console.log('Mensagem enviada:', data);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };
  
  export default app;