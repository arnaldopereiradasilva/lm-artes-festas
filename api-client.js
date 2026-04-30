var API = (function() {
  var BASE = '';

  function setBase(url) {
    BASE = url;
  }

  function request(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok) throw new Error(data.erro || 'Erro na requisicao');
        return data;
      });
    });
  }

  return {
    setBase: setBase,

    auth: {
      login: function(user, pass) { return request('POST', '/api/auth/login', { username: user, senha: pass }); },
      logout: function() { return request('POST', '/api/auth/logout'); },
      me: function() { return request('GET', '/api/auth/me'); },
      trocarSenha: function(atual, nova, confirmar) { return request('POST', '/api/auth/trocar-senha', { senhaAtual: atual, senhaNova: nova, senhaConfirmar: confirmar }); }
    },

    pedidos: {
      criar: function(dados) { return request('POST', '/api/pedidos', dados); },
      listar: function(filtros) {
        var params = [];
        if (filtros && filtros.status && filtros.status !== 'todos') params.push('status=' + filtros.status);
        if (filtros && filtros.busca) params.push('busca=' + encodeURIComponent(filtros.busca));
        var query = params.length ? '?' + params.join('&') : '';
        return request('GET', '/api/pedidos' + query);
      },
      buscar: function(num) { return request('GET', '/api/pedidos/' + num); },
      status: function(num, s) { return request('PUT', '/api/pedidos/' + num + '/status', { status: s }); },
      excluir: function(num) { return request('DELETE', '/api/pedidos/' + num); },
      datasOcupadas: function(max) { return request('GET', '/api/pedidos/datas-ocupadas' + (max ? '?max=' + max : '')); },
      resumo: function() { return request('GET', '/api/pedidos/resumo'); }
    },

    config: {
      listar: function() { return request('GET', '/api/config'); },
      salvar: function(chave, valor) { return request('PUT', '/api/config/' + chave, { valor: valor }); },
      salvarLote: function(obj) { return request('PUT', '/api/config/lote', obj); }
    },

    bloqueios: {
      listar: function() { return request('GET', '/api/bloqueios'); },
      criar: function(data, motivo) { return request('POST', '/api/bloqueios', { data: data, motivo: motivo }); },
      remover: function(data) { return request('DELETE', '/api/bloqueios/' + data); }
    },

    fotos: {
      listar: function(tipo) { return request('GET', '/api/fotos/' + tipo); },
      enviar: function(tipo, formData) {
        return fetch(BASE + '/api/fotos/' + tipo, { method: 'POST', body: formData, credentials: 'same-origin' })
          .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.erro); return d; }); });
      },
      remover: function(id) { return request('DELETE', '/api/fotos/' + id); }
    },

    pagamento: {
      criarLinkPedido: function(num, tipo) { return request('POST', '/api/pagamento/pedido/' + num, { tipo: tipo }); },
      gerarLink: function(dados) { return request('POST', '/api/pagamento/link', dados); },
      links: function() { return request('GET', '/api/pagamento/links'); }
    }
  };
})();
