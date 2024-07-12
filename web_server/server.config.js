var http = require('http');
var fs = require('fs');
var io = require('socket.io');
var net = require('net');

var usuarios = [];
var ultimas_mensagens = [];
const PORTA_HTTP = 3000;
const PORTA_TCP = 4000; // Porta para o servidor TCP

var app = http.createServer(resposta);
io = io(app);

app.listen(PORTA_HTTP);
console.log("Servidor HTTP está em execução na porta " + PORTA_HTTP);

// Função principal de resposta as requisições do servidor HTTP
function resposta(req, res) {
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
}

// Configuração do servidor TCP
var tcpServer = net.createServer(function (socket) {
    console.log('Conexão TCP recebida de ' + socket.remoteAddress + ':' + socket.remotePort);
    usuarios.push({
        endereco: socket.remoteAddress,
        porta: socket.remotePort
    });
    
    socket.on('data', function (data) {
        var mensagem = data.toString();
        console.log('Mensagem recebida do servidor Java: ' + mensagem);

        var obj_mensagem = { msg: mensagem, tipo: 'sistema' };
        io.sockets.emit("atualizar mensagens", obj_mensagem);
        armazenaMensagem(obj_mensagem);
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

io.on("connection", function (socket) {
    socket.on("entrar", function (apelido, callback) {
        if (!(apelido in usuarios)) {
            socket.apelido = apelido;
            usuarios[apelido] = socket;

            for (var indice in ultimas_mensagens) {
                socket.emit("atualizar mensagens", ultimas_mensagens[indice]);
            }

            var mensagem = "[ " + pegarDataAtual() + " ] " + apelido + " acabou de entrar na sala";
            var obj_mensagem = { msg: mensagem, tipo: 'sistema' };

            io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
            io.sockets.emit("atualizar mensagens", obj_mensagem);

            armazenaMensagem(obj_mensagem);

            callback(true);
        } else {
            callback(false);
        }
    });

    socket.on("enviar mensagem", function (dados, callback) {
        var mensagem_enviada = dados.msg;
        var usuario = dados.usu;
        if (usuario == null)
            usuario = '';

        mensagem_enviada = "[ " + pegarDataAtual() + " ] " + socket.apelido + " diz: " + mensagem_enviada;
        var obj_mensagem = { msg: mensagem_enviada, tipo: '' };

        if (usuario == '') {
            io.sockets.emit("atualizar mensagens", obj_mensagem);
            armazenaMensagem(obj_mensagem);
        } else {
            obj_mensagem.tipo = 'privada';
            socket.emit("atualizar mensagens", obj_mensagem);
            usuarios[usuario].emit("atualizar mensagens", obj_mensagem);
        }
        callback();
    });

    socket.on("disconnect", function () {
        delete usuarios[socket.apelido];
        var mensagem = "[ " + pegarDataAtual() + " ] " + socket.apelido + " saiu da sala";
        var obj_mensagem = { msg: mensagem, tipo: 'sistema' };

        io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
        io.sockets.emit("atualizar mensagens", obj_mensagem);

        armazenaMensagem(obj_mensagem);
    });
});

function pegarDataAtual() {
    var dataAtual = new Date();
    var dia = (dataAtual.getDate() < 10 ? '0' : '') + dataAtual.getDate();
    var mes = ((dataAtual.getMonth() + 1) < 10 ? '0' : '') + (dataAtual.getMonth() + 1);
    var ano = dataAtual.getFullYear();
    var hora = (dataAtual.getHours() < 10 ? '0' : '') + dataAtual.getHours();
    var minuto = (dataAtual.getMinutes() < 10 ? '0' : '') + dataAtual.getMinutes();
    var segundo = (dataAtual.getSeconds() < 10 ? '0' : '') + dataAtual.getSeconds();

    var dataFormatada = dia + "/" + mes + "/" + ano + " " + hora + ":" + minuto + ":" + segundo;
    return dataFormatada;
}

function armazenaMensagem(mensagem) {
    if (ultimas_mensagens.length > 5) {
        ultimas_mensagens.shift();
    }
    ultimas_mensagens.push(mensagem);
}
