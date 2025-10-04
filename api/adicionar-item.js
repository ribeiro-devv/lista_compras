// api/adicionar-item.js
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configuração do Firebase Admin
const initFirebase = () => {
  if (!getApps().length) {
    try {
      // Verificar se todas as variáveis de ambiente estão presentes
      const requiredEnvVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL', 
        'FIREBASE_PRIVATE_KEY'
      ];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Variável de ambiente ${envVar} não encontrada`);
        }
      }

      // Formatar a private key corretamente
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      
      console.log('✅ Firebase Admin inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro na inicialização do Firebase Admin:', error);
      throw error;
    }
  }
  
  return getFirestore();
};

export default async function handler(req, res) {
  // Configuração CORS
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
    // Inicializar Firebase
    const db = initFirebase();
    
    const { produto, quantidade, valorUnitario } = req.body;

    // Validações
    if (!produto || produto.trim() === '') {
      return res.status(400).json({
        error: 'Nome do produto é obrigatório',
        speechText: 'Desculpe, não entendi o nome do produto. Tente novamente.',
      });
    }

    // Testar conexão com Firestore
    try {
      // Fazer uma consulta simples para testar a conexão
      const testQuery = await db.collection('listaCompras').limit(1).get();
      console.log('✅ Conexão com Firestore estabelecida');
    } catch (firestoreError) {
      console.error('❌ Erro na conexão com Firestore:', firestoreError);
      throw new Error(`Falha na conexão com Firestore: ${firestoreError.message}`);
    }

    // Buscar último código
    const listaRef = db.collection('listaCompras');
    const snapshot = await listaRef.orderBy('codigo', 'desc').limit(1).get();

    let proximoCodigo = 1;
    if (!snapshot.empty) {
      const ultimoItem = snapshot.docs[0].data();
      proximoCodigo = (ultimoItem.codigo || 0) + 1;
    }

    // Criar novo item
    const novoItem = {
      tarefa: produto.trim(),
      quantidade: quantidade || 1,
      valorUnitario: valorUnitario || 0,
      feito: false,
      codigo: proximoCodigo,
      criadoEm: new Date().toISOString(),
      origem: 'alexa',
    };

    // Salvar no Firestore
    const docRef = await listaRef.add(novoItem);

    console.log('✅ Item adicionado via Alexa:', docRef.id, novoItem);

    return res.status(200).json({
      success: true,
      itemId: docRef.id,
      speechText: `${produto} foi adicionado à sua lista de compras com sucesso.`,
      item: novoItem,
    });

  } catch (error) {
    console.error('❌ Erro detalhado:', {
      message: error.message,
      stack: error.stack,
      envVars: {
        projectId: process.env.FIREBASE_PROJECT_ID ? '✅ Configurado' : '❌ Ausente',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? '✅ Configurado' : '❌ Ausente',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? '✅ Configurado' : '❌ Ausente'
      }
    });

    return res.status(500).json({
      error: 'Erro interno do servidor',
      speechText: 'Desculpe, houve um erro ao adicionar o item.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}