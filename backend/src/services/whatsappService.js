const { Client, LocalAuth } = require('whatsapp-web.js');

const qrcode = require ('qrcode-terminal');
const gerarResposta = require('./aiService')

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) =>{

    console.log('Escaneie o QR Code Abaixo');
    qrcode.generate(qr, {small:true});
    
})

client.on('ready', () =>{
    console.log("Whatsapp conectado");
    
})

client.on('message', async (message) => {


        const texto = message.body;

        console.log('Mensagem:', texto);

        const respostaIA = await gerarResposta(texto);
        await message.reply(respostaIA)
        
});

client.initialize();
module.exports = client;