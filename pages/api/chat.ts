import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { makeChain } from '@/utils/makechain';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { type } from 'os';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history, formResponses } = req.body;

  // evaluate the chat history using langchain evaluation
  // TODO: add the evaluation code here


  console.log('question', question);

  console.log('form responses', formResponses);
  console.log(typeof formResponses);

  const form_responses  = JSON.stringify(formResponses);
  console.log(typeof form_responses);

  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');
  const question_and_form = sanitizedQuestion + '\n The following information is patient submitted and relates to their medical situation. YOUR OUTPUT MUST NOT REMOVE OR SIMPLIFY THIS INFORMATION: '+ form_responses;

  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    /* create vectorstore*/
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({}),
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: PINECONE_NAME_SPACE, //namespace comes from your config folder
      },
    );
    //create chain
    const chain = makeChain(vectorStore);
    //Ask a question using chat history
    const response = await chain.call({
      // question: sanitizedQuestion,
      question: question_and_form,
      chat_history: history || [],
      // form_responses: form_responses || [],
    });

    console.log('response', response);
    res.status(200).json(response);
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
