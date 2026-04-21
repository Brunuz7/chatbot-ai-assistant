const mysql = require('mysql2');


const connection = mysql.createConnection({
    host: 'localhost',
    user: 'chatbot_user',
    password: '', // sem senha
    database: 'chatbot'
});

connection.connect((error) => {
    if (error) {
        console.log("Erro banco:", error);

    } else {
        console.log('MySQL conectado');

    }
});

module.exports = connection;