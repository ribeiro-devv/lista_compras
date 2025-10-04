// api/remover-item.js
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
    const { produto } = req.body;

    if (!produto || produto.trim() === '') {
      return res.status(400).json({
        error: 'Nome do produto é obrigatório',
        speechText: 'Desculpe, não entendi qual produto remover.',
      });
    }

    // Buscar item pelo nome (case-insensitive)
    const listaRef = db.collection('listaCompras');
    const snapshot = await listaRef.where('tarefa', '==', produto).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({
        error: 'Item não encontrado',
        speechText: `Não encontrei ${produto} na sua lista.`,
      });
    }

    // Remover item
    await snapshot.docs[0].ref.delete();

    return res.status(200).json({
      success: true,
      speechText: `${produto} foi removido da sua lista de compras.`,
    });
  } catch (error) {
    console.error('❌ Erro ao remover item:', error);
    return res.status(500).json({
      error: 'Erro ao remover item',
      speechText: 'Desculpe, houve um erro ao remover o item.',
    });
  }
}