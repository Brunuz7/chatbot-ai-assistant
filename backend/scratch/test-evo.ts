
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;

async function testCreate() {
  const instanceName = 'test_inst_' + Math.floor(Math.random() * 10000);
  console.log(`Testing creation for instance: ${instanceName}`);
  console.log(`URL: ${EVO_URL}`);
  
  try {
    const response = await axios.post(`${EVO_URL}/instance/create`, {
      instanceName: instanceName,
      // token: 'token', // Trying without token first
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    }, {
      headers: { apikey: EVO_KEY },
      timeout: 10000
    });

    console.log('Success:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

testCreate();
