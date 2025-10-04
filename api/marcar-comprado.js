// api/marcar-comprado.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin
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
    const { produto, valorUnitario } = req.body;

    if (!produto || produto.trim() === '') {
      return res.status(400).json({
        error: 'Nome do produto é obrigatório',
        speechText: 'Desculpe, não entendi qual produto marcar.',
      });
    }

    // Buscar item
    const listaRef = db.collection('listaCompras');
    const snapshot = await listaRef.where('tarefa', '==', produto).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({
        error: 'Item não encontrado',
        speechText: `Não encontrei ${produto} na sua lista.`,
      });
    }

    // Atualizar item
    const updateData = {
      feito: true,
      atualizadoEm: new Date().toISOString(),
    };

    if (valorUnitario !== undefined && valorUnitario !== null) {
      updateData.valorUnitario = valorUnitario;
    }

    await snapshot.docs[0].ref.update(updateData);

    return res.status(200).json({
      success: true,
      speechText: `${produto} foi marcado como comprado.`,
    });
  } catch (error) {
    console.error('❌ Erro ao marcar item:', error);
    return res.status(500).json({
      error: 'Erro ao marcar item',
      speechText: 'Desculpe, houve um erro ao marcar o item.',
    });
  }
}