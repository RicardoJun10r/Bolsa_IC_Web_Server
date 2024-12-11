var http = require('http');
var fs = require('fs');
var io = require('socket.io');
var net = require('net');

const PORTA_HTTP = 3000;
const PORTA_TCP = 4000; // Porta para o servidor TCP

// Servidor HTTP simples
var app = http.createServer(function (req, res) {
    var arquivo = "";
    if (req.url == "/") {
        arquivo = __dirname + '/index.html';
    } else {
        arquivo = __dirname + req.url;
    }
    fs.readFile(arquivo, function (err, data) {
        if (err) {
            res.writeHead(404);
            return res.end('Página ou arquivo não encontrados');
        }
        res.writeHead(200);
        res.end(data);
    });
});

io = io(app);
app.listen(PORTA_HTTP);
console.log("Servidor HTTP está em execução na porta " + PORTA_HTTP);

// Servidor TCP para receber mensagens do servidor Java
var tcpServer = net.createServer(function (socket) {
    console.log('Conexão TCP recebida de ' + socket.remoteAddress + ':' + socket.remotePort);

    socket.on('data', function (data) {
        try {
            // Parse da mensagem como JSON
            var mensagemJson = JSON.parse(data.toString());
            console.log('Mensagem JSON recebida:', mensagemJson);

            var obj_mensagem = { msg: JSON.stringify(mensagemJson), tipo: 'sistema' };
            // Emite a mensagem para todos os clientes conectados via socket.io
            io.sockets.emit("atualizar mensagens", obj_mensagem);
        } catch (err) {
            console.error('Erro ao parsear mensagem JSON:', err);
        }
    });

    socket.on('end', function () {
        console.log('Conexão TCP encerrada');
    });

    socket.on('error', function (err) {
        console.log('Erro na conexão TCP: ' + err.message);
    });
});

tcpServer.listen(PORTA_TCP, function () {
    console.log('Servidor TCP está em execução na porta ' + PORTA_TCP);
});
