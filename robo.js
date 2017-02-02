var Nightmare = require('nightmare');
var nightmare = Nightmare({
  show: false
});

// Banco de Dados
var mysql = require('mysql');
/*var connection = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '',
	database : 'test_nodejs'
});*/
var connection = mysql.createConnection({
	host : 'mysql.magodaweb.com.br',
	user : 'magodaweb05',
	password : 'm540120',
	database : 'magodaweb05'
});
connection.connect();


// Request
var request = require('request');

/**
 * Busca a lista de Motéis
 * com o link de detalhe do motel
 */
nightmare
    .goto('https://www.guiademoteis.com.br/porto-alegre')
    .wait()
    .evaluate(function() {
        var a = [];
        $('.motelBox').each(function() {
            a.push($(this).find('a').attr('href'))
        })
        return a
    })
    .then(function(title) {
        runNext(0, title);
    });
nightmare.end();

/**
 * Entra no link de detalhe do motel
 * e busca as informações dele
 */
var runNext = function (i, sites) {
    if (i < sites.length - 1) {
        nightmare = new Nightmare({show: false});
        nightmare
        	.goto(sites[i])
    		.evaluate(function() {

    			var endereco = $('.dados .address').text().replace(',', '-').split('-');

    			var	rua = endereco[0].trim(),
    				numero = endereco[1].trim(),
    				bairro = endereco[2].trim(),
    				cidade = endereco[3].trim(),
    				estado = endereco[4].trim(),
    				endereco = rua + ", " + numero + " - " + cidade + " - " + estado;

    			var dados = {
    				nome: $('.dados .resolveChar').text().trim(),
					descricao: $('.abaOMotelDetalhes').text().trim(),
					endereco: endereco,
					rua: rua,
					estado: estado,
					cidade: cidade,
					bairro: bairro,
					cep: '',
					numero: parseInt(numero),
					telefone: $('.infoMenu.dicon-d-tel.fMotel').text().trim().replace('(0', '('),
					suites: 0,
					latitude: 0,
					longitude: 0,
					likes: 0,
					dislikes: 0
    			}
    			
    			return dados
        	})
        	.then(function(motel) {
        		request('http://api.magodaweb.com.br/motel/json.php?acao=validar&nome=' + motel.nome + '&telefone=' + motel.telefone + '&numero=' + motel.numero, function (error, response, body) {
				  if (!error && response.statusCode == 200) {
				    if (body == 0) {
				    	console.log("[VALIDATOR] O motel " + motel.nome + " já foi cadastrado!");
				    	nightmare = new Nightmare({show: false});
						nightmare.run(function () {runNext(i+1, sites);});
						nightmare.end();
				    } else {
				    	console.log("[VALIDATOR] O motel " + motel.nome + " está sendo cadastrado!");
				    	test(motel.endereco, motel, sites, i)
				    }
				  }
				});
        	});
        	nightmare.end();
    } else {
    	console.log("Finalizaram os cadastros!");
    }
}
/**
 * Busca as Coordenadas do Motel
 * pegando latitude e longitude
 * além do endereço/cep
 */
var test = function(end, infos, sites, contador) {
	nightmare = new Nightmare({show: false});
    nightmare
    	.goto('http://pt.mygeoposition.com/')
    	.wait(2000)
    	.type('input[name="query"]', end)
    	.click('button[id="submit"]')
    	.wait(4000)
		.evaluate(function() {
			var lat = $('.gm-style-iw .infoWindow .lat .rad').text().trim(),
				long = $('.gm-style-iw .infoWindow .lng .rad').text().trim(),
				address = $('.gm-style-iw .infoWindow .address').text().trim().split(',');

				cep = address[address.length - 2];
				cep = cep.trim();
				if (cep.length > 9) {
					cep = 'null';
				}
			var result = {lat: lat, long: long, cep: cep}
			return result
		})
    	.then(function(title) {
    		infos.latitude = title.lat;
			infos.longitude = title.long;
			infos.cep = title.cep;
    		
    		add(infos, sites, contador);
    	})
    	.catch(function () {
		    console.log("Promise Rejected 2");
		});
		nightmare.end();
}

/**
 * Cadastra o Motel
 * insere o motel no banco de dados
 */
var add = function(informacoes, sites, contador) {

	var post = 
		"nome=" + informacoes.nome + 
		"&descricao=" + informacoes.descricao +
		"&cep=" + informacoes.cep +
		"&estado=" + informacoes.estado +
		"&cidade=" + informacoes.cidade +
		"&bairro=" + informacoes.bairro +
		"&rua=" + informacoes.rua +
		"&numero=" + informacoes.numero +
		"&telefone=" + informacoes.telefone +
		"&likes=" + informacoes.likes +
		"&dislikes=" + informacoes.dislikes +
		"&suites=" + 0 +
		"&latitude=" + informacoes.latitude +
		"&longitude=" + informacoes.longitude;

	var url = 'http://api.magodaweb.com.br/motel/json.php?acao=add&' + post;
	request(url.trim(), function (error, response, body) {
	  if (!error && response.statusCode == 200) {
	    if (body == 0) {
	    	console.log("[REVALIDATOR] O motel " + informacoes.nome + " já foi cadastrado!");
	    } else if (body == 1) {
	    	console.log("[AVISO] O motel " + informacoes.nome + " foi cadastrado!");
	    } else {
	    	console.log(body);
	    }
	  }
	});

	nightmare = new Nightmare({show: false});
	nightmare.run(function () {runNext(contador+1, sites);});
	nightmare.end();
}