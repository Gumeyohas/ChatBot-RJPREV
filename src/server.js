import morgan from "morgan";
import cors from "cors";
import express from 'express';
import fetch from 'node-fetch'; // Importando o node-fetch
import dotenv from 'dotenv'; // Para carregar as variáveis de ambiente

dotenv.config(); // Configura a leitura do arquivo .env

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Definir o tempo de inatividade em milissegundos (exemplo: 1 hora)
const INACTIVITY_TIMEOUT = 15000; // 15 segundos

const chatFlows = {
  inicio: {
    mensagem: 'A Fundação de Previdência Complementar do Estado do Rio de Janeiro-RJPrev agradece seu contato. Nos informe seu assunto:\n1- Suporte\n2- Pagamento\n3- Cancelamento',
    opcoes: { '1': 'suporte', '2': 'pagamento', '3': 'cancelamento' }
  },
  suporte: {
    mensagem: 'Você escolheu Suporte. Escolha uma das opções abaixo:\n1- Problemas técnicos\n2- Dúvidas sobre cadastro\n3- Falar com um atendente\n4- Voltar',
    opcoes: { '1': 'suporte_tecnico', '2': 'suporte_cadastro', '3': 'atendimento', '4': 'inicio' }
  },
  suporte_tecnico: {
    mensagem: 'Você escolheu Problemas técnicos. Nossa equipe está ciente e um atendente entrará em contato em breve.',
    final: true
  },
  suporte_cadastro: {
    mensagem: 'Você escolheu Dúvidas sobre cadastro. Envie sua dúvida e um atendente retornará em breve.',
    final: true
  },
  suporte_atendente: {
    mensagem: 'Você escolheu Falar com um atendente. Um atendente entrará em contato em breve.',
    final: true
  },
  pagamento: {
    mensagem: 'Você escolheu Pagamento. Escolha uma das opções abaixo:\n1- Ver detalhes do pagamento\n2- Emitir segunda via\n3- Outras dúvidas sobre pagamento\n4- Voltar',
    opcoes: { '1': 'pagamento_detalhes', '2': 'pagamento_segunda_via', '3': 'pagamento_duvidas', '4': 'inicio' }
  },
  pagamento_detalhes: {
    mensagem: 'Você escolheu Ver detalhes do pagamento. Por favor, nos informe seu nome completo, ID funcional, telefone para contato, o endereço completo com CEP por gentileza.',
    final: true
  },
  pagamento_segunda_via: {
    mensagem: 'Você escolheu Emitir segunda via. Escolha uma das opções abaixo: \n1- Receber segunda via por Whatsapp \n2- Receber segunda via por e-mail\n3- Voltar',
    opcoes: { '1': 'pagamento_whatsapp', '2': 'pagamento_email', '3': 'pagamento' }
  },
  pagamento_whatsapp: {
    mensagem: 'Em breve um atendentende entrará em contato e enviaremos sua segunda via.', // Enviaremos sua segunda via em instantes.'
    final: true
  },
  pagamento_email: {
    mensagem: 'Informe seu melhor e-mail que um atendente entrará em contato e enviará sua segunda via em instantes. (Lembre-se de olhar o spam e o lixo eletrônico!)',
    final: true
  },
  pagamento_duvidas: {
    mensagem: 'Você escolheu Outras dúvidas sobre pagamento. Detalhe sua dúvida para que possamos ajudar e aguarde até o atendente entrar em contato.',
    final: true
  },
  cancelamento: {
    mensagem: 'Você escolheu Cancelamento. Escolha uma das opções abaixo:\n1- Informar motivo/problema\n2- Falar com um atendente\n3- Voltar',
    opcoes: { '1': 'cancelamento_motivo', '2': 'atendimento', '3': 'inicio' }
  },
  cancelamento_motivo: {
    mensagem: 'Você escolheu Informar motivo/problema. Por favor, descreva o motivo do cancelamento e algum de nossos atendentes irá entrar em contato em breve.',
    final: true
  },
  cancelamento_atendente: {
    mensagem: 'Você escolheu Falar com um atendente. Um atendente entrará em contato em breve.',
    final: true
  },
  atendimento: {
    mensagem: 'Um atendente entrará em contato em breve. Envie sua dúvida ou problema para nos ajudar.',
    final: true
  }
};


// Armazena o estado da conversa de cada usuário (em memória)
const conversationState = {};

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
        if (message && message.text && message.text.body) {
          console.log('Mensagem recebida:', message);
          const from = message.from; // Número de telefone do remetente
          const text = message.text.body; // Conteúdo da mensagem

          // Chame a função para lidar com a mensagem recebida
          handleIncomingMessage(from, text);
        } else {
          console.warn('Mensagem inválida recebida:', message);
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

  // Verifica se a conversa expirou (tempo de inatividade)
  if (hasConversationExpired(from)) {
    // Se a conversa expirou, reinicia o fluxo
    conversationState[from] = { step: 'inicio', lastInteraction: Date.now() }; // Reinicia o estado e atualiza o tempo
    responseMessage = chatFlows['inicio'].mensagem;
  } else {
    // Verifica se o usuário tem um estado de conversa armazenado
    const userState = conversationState[from];
    if (!userState) {
      // Inicia a conversa com o fluxo inicial
      conversationState[from] = { step: 'inicio', lastInteraction: Date.now() }; // Atualiza o tempo de interação
      responseMessage = chatFlows['inicio'].mensagem;
    } else if (userState.step === 'finalizado') {
      // Se a conversa já foi finalizada e não expirou, não processe mais mensagens
      responseMessage = ''; // Não enviar mais mensagens ao usuário
    } else {
      const currentStep = chatFlows[userState.step];

      if (!currentStep) {
        // Caso o estado atual seja inválido, reinicia
        conversationState[from].step = 'inicio';
        responseMessage = chatFlows['inicio'].mensagem;
      } else if (currentStep.final) {
        // Se o fluxo já foi finalizado, não processe mais interações
        responseMessage = 'Obrigado pelo contato! Caso precise de mais informações, inicie uma nova conversa.';
        conversationState[from].step = 'finalizado'; // Define que a conversa foi finalizada
      } else if (currentStep.opcoes && currentStep.opcoes[text]) {
        // Avançar para o próximo passo com base na escolha
        const nextStep = currentStep.opcoes[text];
        conversationState[from].step = nextStep;
        responseMessage = chatFlows[nextStep].mensagem;
      } else if (userState.step === 'atendimento') {
        // Se o usuário estiver no estado de "atendimento", não enviar mais mensagens automáticas
        responseMessage = ''; // Não enviar nada ao usuário quando estiver com o atendente
      } else {
        // Caso não haja nenhuma escolha válida, reinicie o fluxo
        conversationState[from].step = 'inicio';
        responseMessage = chatFlows['inicio'].mensagem;
      }
    }
  }

  conversationState[from].lastInteraction = Date.now(); // Atualiza o tempo da última interação
  // Se a resposta não for vazia, envie a mensagem
  if (responseMessage) {
    await sendMessage(from, responseMessage);
  }
};

// Função para verificar se a conversa expirou
const hasConversationExpired = (from) => {
  const lastInteractionTime = conversationState[from]?.lastInteraction;
  if (!lastInteractionTime) return false; // Se não existe tempo de interação, a conversa não pode ter expirado

  const currentTime = Date.now();
  const timeElapsed = currentTime - lastInteractionTime;

  // Considera que a conversa só expira se estiver inativa por mais do que o tempo limite
  return timeElapsed > INACTIVITY_TIMEOUT;
};


// const phone_number_id = 467167046473343;
const phone_number_id = process.env.PHONE_NUMBER_ID;

// Função para enviar mensagens
const sendMessage = async (to, message) => {
  const url = `https://graph.facebook.com/v21.0/${phone_number_id}/messages`;
  // const token = 'EAA0rRhfq43oBO7XaRLR6wZCZBpiWBOszLXNLpBhbvexm3IUS42TNtolXprnQ6ZAGMw6WuHJsNTRiZABoqDz4CgFcLAhzIQ52jltessgi5PvLcHNXGR72GEtGubgpSAQTHoNwblfBXXypFrUm0aOP9EgHnclILR8KWSzEIuZBXXbPScZCoz4fZCJl4WHryrEsAH4wncKqhVXzBCxRkVNw4RT35l5f9oZD'; // Substitua pelo seu token de acesso
  const token = process.env.WHATSAPP_API_TOKEN;

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
