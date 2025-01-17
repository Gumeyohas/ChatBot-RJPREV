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
    mensagem: 'A Fundação de Previdência Complementar do Estado do Rio de Janeiro-RJPrev agradece seu contato. Em que podemos ajudar? \n1- Cancelamento do plano\n2- Adesão ao plano\n3- Formulários\n4- Suporte site\n5- Simulador de aposentadoria\n6- Dúvidas sobre seguro\n7- Informações sobre o plano\n8- Dúvidas sobre o desconto',
    opcoes: { '1': 'cancelamento_do_plano', '2': 'adesao_ao_plano', '3': 'formularios', '4': 'suporte_site', '5': 'simulador_aposentadoria', '6': 'duvidas_sobre_seguro', '7': 'informacoes_plano', '8': 'duvidas_desconto' }
  },
  cancelamento_do_plano: {
    mensagem: 'Você escolheu Cancelamento do plano. Você é um participante patrocinado? (explicar) \n1- Sim\n2- Não\n3- Voltar',
    opcoes: { '1': 'participante_patrocinado', '2': 'nao_PP', '3': 'inicio' }
  },
  participante_patrocinado: {
    mensagem: 'Aderiu de forma automática? \n1- Sim\n2- Não\n3- Voltar',
    opcoes: { '1': 'forma_automatica', '2': 'nao_forma_automatica', '3': 'inicio' }
  },
  forma_automatica: {
    mensagem: 'Solicitação ocorreu dentro de 120 dias? \n1- Sim\n2- Não\n3- Voltar',
    opcoes: {'1': 'dentro_de_120_dias', '2': 'fora_do_prazo', '3': 'inicio'}
  },
  dentro_de_120_dias: {
    mensagem: 'Segue o formulário e nos informe os dados bancários para devolução (Banco, Agência, Conta) que um de nossos atendentes entrará em contato em breve.\nhttps://rjprev.org.br/wp-content/uploads/2024/09/Formulario-de-Desligamento.pdf',
    final: true
  },
  adesao_ao_plano: {
    mensagem: 'Você escolheu Adesão ao plano. Podemos solicitar que um de nossos consultores entre em contato?\n1- Sim\n2- Não\n3- Voltar',
    opcoes: { '1': 'contato_consultores', '2': 'sem_consultores', '3': 'inicio' }
  },
  contato_consultores: {
    mensagem: 'Nos informe nome completo, orgão, ID Funcional e celular para contato.',
    final: true
  },
  sem_consultores: {
    mensagem: 'É participante patrocinado ou facultativo? \n1- Patrocinado\n2- Facultativo\n3- Voltar',
    opcoes: { '1': 'formulario_participante_patrocinado', '2': 'formulario_participante_facultativo', '3': 'inicio' }
  },
  formulario_participante_patrocinado: {
    mensagem: 'Segue formulário para Adesão de participante ativo patrocinado: https://rjprev.org.br/wp-content/uploads/2024/09/Formulario-de-Adesao-Ativo-Patrocinado.pdf', // Enviaremos sua segunda via em instantes.'
    final: true
  },
  formulario_participante_facultativo: {
    mensagem: 'Segue formulário para Adesão de participante ativo facultativo: https://rjprev.org.br/wp-content/uploads/2024/09/Formulario-de-Adesao-Facultativo.pdf',
    final: true
  },
  formularios: {
    mensagem: 'Qual seu plano?\n1- RJPREV-CD\n2- MUNICÍPIOS-CD\n3- Voltar',
    opcoes: { '1': 'plano_rjprev_cd', '2': 'plano_municipios_cd', '3': 'inicio' }
  },
  plano_rjprev_cd: {
    mensagem: 'Segue os formulários do plano RJPREV-CD:\n1- Inscrição de beneficiários: https://rjprev.org.br/wp-content/uploads/2024/09/formulario_inscricao_beneficiarios.pdf\n2- Alteração de Alíquota: https://rjprev.org.br/wp-content/uploads/2024/09/ALTERACAO-DE-ALIQUOTA.pdf\n3- Mudança de modalidade: https://rjprev.org.br/wp-content/uploads/2022/11/formulario_opcao_plano_modalidade_patrocinadores.pdf\n4- Tributação: https://rjprev.org.br/wp-content/uploads/2024/09/Formulario-de-Regime-de-Tributacao.pdf',
    final: true
  },
  plano_municipios_cd: {
    mensagem: 'Segue os formulários do plano MUNICIPIOS-CD:\n1- Inscrição de beneficiários: https://rjprev.org.br/wp-content/uploads/2024/09/formulario_inscricao_beneficiarios.pdf\n2- Alteração de Alíquota: https://rjprev.org.br/wp-content/uploads/2024/09/ALTERACAO-DE-ALIQUOTA.pdf\n3- Mudança de modalidade: https://rjprev.org.br/wp-content/uploads/2022/11/formulario_opcao_plano_modalidade_patrocinadores.pdf\n4- Tributação: https://rjprev.org.br/wp-content/uploads/2024/09/Formulario-de-Regime-de-Tributacao.pdf',
    final: true
  },
  suporte_site: {
    mensagem: 'Escolha uma das opções abaixo:\n1- Área do participante\n2- Extrato\n3- Rentabilidade\n4- Voltar',
    opcoes: {'1': 'area_do_participante', '2': 'extrato', '3': 'rentabilidade', '4': 'inicio' }
  },
  area_do_participante: {
    mensagem: 'Escolha uma das opções abaixo:\n1- Divergência de informações\n2- Problemas no acesso\n3- Voltar',
    opcoes: {'1': 'divergencia_informacoes', '2': 'problemas_acesso', '3': 'inicio'}
  },
  divergencia_informacoes: {
    mensagem: 'Informe o seu problema por gentileza e um atendente entrará em contato em breve.',
    final: true
  },
  problemas_acesso: {
    mensagem: 'Informe o seu problema por gentileza e um atendente entrará em contato em breve.',
    final: true
  },
  extrato: {
    mensagem: 'Você pode conseguir o seu extrato na nossa Área do participante localizada no nosso site. \nhttp://webparticipante.rjprev.rj.gov.br/rjprev/webparticipante/Area/Acesso/Autenticacao/Login',
    final: true
  },
  rentabilidade: {
    mensagem: 'Você pode verificar a rentabilidade do plano no nosso site.\nhttps://rjprev.org.br/',
    final: true
  },
  simulador_aposentadoria: {
    mensagem: 'Acesse o simulador do plano RJPREV-CD: \nhttp://simulador.rjprev.rj.gov.br/ \nAcesse o simulador do plano Municipios-CD: \nhttp://simulador_municipios.rjprev.rj.gov.br/',
    final: true
  },
  duvidas_sobre_seguro: {
    mensagem: 'Já possui o seguro? (invalidez e Morte)\n1- Sim\n2- Não\n3- Voltar',
    opcoes: {'1': 'sim_seguro', '2': 'informar_dados', '3': 'inicio'}
  },
  sim_seguro: {
    mensagem: 'Escolha uma das opções abaixo: \n1- Pagamento\n2- Alteração no valor do seguro\n3- Cancelamento\n4- Outros\n5- Voltar',
    opcoes: { '1': 'pagamento_seguro', '2': 'informar_dados', '3': 'formulario_desligamento'}
  },
  pagamento_seguro: {
    mensagem: 'Em breve nossa equipe de atendimento entrará em contato.',
    final: true
  },
  informar_dados: {
    mensagem: 'Nos informe nome completo, ID Funcional, orgão e celular para que possamos solicitar que um de nossos consultores entre em contato?',
    final: true
  },
  formulario_desligamento: {
    mensagem: 'Segue o link para acesso ao formulário de desligamento do seguro: \nhttps://rjprev.org.br/wp-content/uploads/2024/09/Formulario-PAR.pdf\n É importante informar que ao preencher o formulário é preciso deixar os campos referentes aos valores de Capital Segurado e do Prêmio riscados ou zerados.',
    final: true 
  },
  informacoes_plano: {
    mensagem: 'Escolha uma das opções abaixo: \n1- Adesão Automática\n2- Requerimento de benefícios\n3-Fui exonerado, como proceder?\n4- Mudança de regime previdenciário\n5- Outros\n6- Voltar',
    opcoes: { '1': 'adesao_automatica', '2': 'requerimento_de_beneficios', '3': 'exoneracao', '4': 'mudanca_de_regime', '5': 'direcionar_atendimento', '6': 'inicio' }
  },
  adesao_automatica: {
    mensagem: 'texto a ser feito',
    final: true
  },
  requerimento_de_beneficios: {
    mensagem: 'Escolha uma das opções abaixo: \n1- Aposentadoria\n2- Pensão por morte\n3- Voltar',
    opcoes: { '1': 'direcionar_atendimento', '2': 'direcionar_atendimento', '3': 'inicio' }
  },
  exoneracao: {
    mensagem: 'Para adiantar o atendimento, por gentileza envie o documento da publicação da Exoneração no Diário Oficial. Em breve nossa equipe de atendimento entrará em contato.',
    final: true
  },
  mudanca_de_regime: {
    mensagem: 'texto pronto',
    final: true
  },
  direcionar_atendimento: {
    mensagem: 'Em breve nossa equipe de atendimento entrará em contato.',
    final: true
  },
  duvidas_desconto: {
    mensagem: 'Escolha uma das opções abaixo: \n1- Folha\n2- Boleto\n3- Débito\n4- Voltar',
    opcoes: { '1': 'direcionar_atendimento', '2': 'direcionar_atendimento', '3': 'direcionar_atendimento', '4': 'inicio' }
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
