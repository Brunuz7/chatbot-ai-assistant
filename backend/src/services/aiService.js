require('dotenv').config();
const OpenAI = require('openai').default

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

async function gerarResposta(mensagem) {
    try {
        const resposta = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Você é um atendente, rápido e profissional de uma empresa."
                },
                {
                    role: "user",
                    content: mensagem
                }
            ]
        });

        return resposta.choices[0].message.content;

    } catch (error) {
        console.log("Erro IA:", error.message);

        return "Olá 👋 No momento nosso assistente automático está ocupado. Como posso ajudar?";
    }
}

module.exports = gerarResposta;