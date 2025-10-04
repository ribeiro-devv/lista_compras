// api/adicionar-item.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin (só uma vez)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  // Habilitar CORS
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
    const { produto, quantidade, valorUnitario } = req.body;

    // Validações
    if (!produto || produto.trim() === '') {
      return res.status(400).json({
        error: 'Nome do produto é obrigatório',
        speechText: 'Desculpe, não entendi o nome do produto. Tente novamente.',
      });
    }

    // Buscar último código
    const listaRef = db.collection('listaCompras');
    const snapshot = await listaRef.orderBy('codigo', 'desc').limit(1).get();

    let proximoCodigo = 1;
    if (!snapshot.empty) {
      const ultimoItem = snapshot.docs[0].data();
      proximoCodigo = ultimoItem.codigo + 1;
    }

    // Criar novo item
    const novoItem = {
      tarefa: produto,
      quantidade: quantidade || 1,
      valorUnitario: valorUnitario || 0,
      feito: false,
      codigo: proximoCodigo,
      criadoEm: new Date().toISOString(),
      origem: 'alexa',
    };

    // Salvar no Firestore
    const docRef = await listaRef.add(novoItem);

    console.log('✅ Item adicionado via Alexa:', docRef.id);

    // Resposta para Alexa
    return res.status(200).json({
      success: true,
      itemId: docRef.id,
      speechText: `${produto} foi adicionado à sua lista de compras com sucesso.`,
      item: novoItem,
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar item:', error);
    return res.status(500).json({
      error: 'Erro ao adicionar item',
      speechText: 'Desculpe, houve um erro ao adicionar o item. Tente novamente mais tarde. ' + error,
    });
  }
}