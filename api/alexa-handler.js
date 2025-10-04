// api/alexa-handler.js
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  
    try {
      const alexaRequest = req.body;
      console.log('📱 Request Alexa:', JSON.stringify(alexaRequest, null, 2));
  
      // Verificar se é requisição da Alexa
      if (alexaRequest.request.type === 'LaunchRequest') {
        return handleLaunchRequest(res);
      }
  
      if (alexaRequest.request.type === 'IntentRequest') {
        return await handleIntentRequest(alexaRequest.request, res);
      }
  
      // Request não reconhecido
      return buildAlexaResponse(res, 'Desculpe, não entendi o comando.', false);
  
    } catch (error) {
      console.error('❌ Erro no handler Alexa:', error);
      return buildAlexaResponse(res, 'Desculpe, ocorreu um erro interno.', true);
    }
  }
  
  // Handler quando usuário abre a skill
  function handleLaunchRequest(res) {
    const speechText = 'Olá! Eu posso ajudar você a gerenciar sua lista de compras. Você pode dizer: adicione leite na lista, ou, o que tem na minha lista?';
    return buildAlexaResponse(res, speechText, false);
  }
  
  // Handler para as intenções
  async function handleIntentRequest(request, res) {
    const intentName = request.intent.name;
    
    console.log('🎯 Intent recebida:', intentName);
    console.log('📦 Slots:', request.intent.slots);
  
    switch (intentName) {
      case 'AdicionarItemIntent':
        return await handleAdicionarItem(request.intent, res);
      case 'ListarItensIntent':
        return await handleListarItens(res);
      case 'AMAZON.CancelIntent':
      case 'AMAZON.StopIntent':
        return buildAlexaResponse(res, 'Até logo!', true);
      case 'AMAZON.HelpIntent':
        return buildAlexaResponse(res, 'Você pode me pedir para adicionar itens na sua lista de compras. Por exemplo: "Adicione leite na lista" ou "Incluir pão com quantidade 2".', false);
      default:
        return buildAlexaResponse(res, 'Desculpe, não entendi. Tente novamente.', false);
    }
  }
  
  // Adicionar item na lista
  async function handleAdicionarItem(intent, res) {
    const slots = intent.slots;
    const item = slots.item && slots.item.value;
    const quantidade = slots.quantidade && slots.quantidade.value;
    
    console.log('🛒 Item para adicionar:', { item, quantidade });
  
    if (!item) {
      return buildAlexaResponse(res, 'Desculpe, não entendi qual item você quer adicionar. Pode repetir?', false);
    }
  
    try {
      // Chamar sua API existente de adicionar item
      const response = await fetch('https://lista-compras-murex.vercel.app/api/adicionar-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          produto: item,
          quantidade: quantidade ? parseInt(quantidade) : 1,
          valorUnitario: 0
        }),
      });
  
      const result = await response.json();
      console.log('✅ Resposta da API:', result);
  
      if (result.success) {
        const speechText = quantidade 
          ? `Ok, adicionei ${quantidade} ${item} na sua lista de compras.`
          : `Ok, adicionei ${item} na sua lista de compras.`;
        
        return buildAlexaResponse(res, speechText, true);
      } else {
        return buildAlexaResponse(res, 'Desculpe, houve um erro ao adicionar o item na lista.', true);
      }
  
    } catch (error) {
      console.error('❌ Erro ao chamar API:', error);
      return buildAlexaResponse(res, 'Desculpe, não consegui conectar com sua lista de compras. Verifique se o serviço está disponível.', true);
    }
  }
  
  // Listar itens (para implementar depois)
  async function handleListarItens(res) {
    return buildAlexaResponse(res, 'Em breve você poderá ouvir sua lista completa de compras!', true);
  }
  
  // Helper para construir resposta no formato Alexa
  function buildAlexaResponse(res, speechText, shouldEndSession) {
    const response = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: `<speak>${speechText}</speak>`
        },
        shouldEndSession: shouldEndSession
      }
    };
  
    return res.status(200).json(response);
  }