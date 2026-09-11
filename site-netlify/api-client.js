var API = (function() {
  var BASE = '';
  var _cliente = null;

  function supabase() {
    if (_cliente) return _cliente;
    if (!window.supabase) throw new Error('Biblioteca do Supabase nao carregada.');
    _cliente = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return _cliente;
  }

  function setBase() {}

  function redirecionarLogin() {
    var loginOverlay = document.getElementById('loginOverlay');
    var painel = document.getElementById('painel');
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (painel) painel.classList.add('hidden');
  }

  function erroMsg(e) {
    return (e && (e.message || e.error_description || e.error)) || 'Erro na requisicao';
  }

  function exigirSessao() {
    return supabase().auth.getSession().then(function(res) {
      if (res && res.data && res.data.session && res.data.session.user) {
        return res.data.session.user;
      }
      redirecionarLogin();
      throw new Error('Sessao expirada. Faca login novamente.');
    });
  }

  function gerarNumeroPedido() {
    return 'LM' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-2).toUpperCase();
  }

  function converterParaISO(dataStr) {
    if (!dataStr) return dataStr;
    if (dataStr.indexOf('/') !== -1) {
      var parts = dataStr.split('/');
      if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    return dataStr;
  }

  function validarCPF(cpf) {
    if (typeof cpf !== 'string') return false;
    var numeros = cpf.replace(/\D/g, '');
    if (numeros.length !== 11 || /^(\d)\1+$/.test(numeros)) return false;
    var soma = 0;
    for (var i = 0; i < 9; i++) soma += parseInt(numeros[i], 10) * (10 - i);
    var dig1 = 11 - (soma % 11);
    if (dig1 > 9) dig1 = 0;
    soma = 0;
    for (var j = 0; j < 10; j++) soma += parseInt(numeros[j], 10) * (11 - j);
    var dig2 = 11 - (soma % 11);
    if (dig2 > 9) dig2 = 0;
    return dig1 === parseInt(numeros[9], 10) && dig2 === parseInt(numeros[10], 10);
  }

  function parseLinhaPedido(p) {
    try { p.equipe = JSON.parse(p.equipe); } catch (_) { p.equipe = {}; }
    try { p.estacoes = JSON.parse(p.estacoes || '{}'); } catch (_) { p.estacoes = {}; }
    return p;
  }

  function publicUrl(caminho) {
    if (!caminho) return caminho;
    if (caminho.indexOf('http') === 0) return caminho;
    return (window.SUPABASE_URL || '').replace(/\/+$/, '') + '/storage/v1/object/public/imagens/' + caminho.replace(/^\//, '');
  }

  function uploadImagem(file) {
    if (!file) return Promise.reject(new Error('Nenhuma imagem enviada'));
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].indexOf(ext) === -1) {
      return Promise.reject(new Error('Tipo de arquivo nao permitido'));
    }
    var nome = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.' + ext;
    return exigirSessao().then(function() {
      return supabase().storage.from('imagens').upload(nome, file, { contentType: file.type || undefined, upsert: false }).then(function(res) {
        if (res.error) return Promise.reject(new Error(res.error.message));
        return nome;
      });
    });
  }

  function ordenar(rows, chave, asc) {
    return (rows || []).slice().sort(function(a, b) {
      var av = a[chave], bv = b[chave];
      if (av === bv) return 0;
      var cmp = av > bv ? 1 : -1;
      return asc ? cmp : -cmp;
    });
  }

  return {
    setBase: setBase,

    auth: {
      login: function(user, pass) {
        var email = user && user.indexOf('@') !== -1 ? user : 'lenicebraga@hotmail.com';
        return supabase().auth.signInWithPassword({ email: email, password: pass }).then(function(res) {
          if (res.error) {
            var e = new Error(res.error.message || 'Usuario ou senha incorretos');
            e.code = res.error.code;
            throw e;
          }
          return { ok: true, username: email };
        });
      },
      logout: function() {
        return supabase().auth.signOut().then(function() { return { ok: true }; });
      },
      me: function() {
        return exigirSessao().then(function(u) { return { ok: true, username: u.email }; });
      },
      trocarSenha: function(atual, nova, confirmar) {
        if (nova !== confirmar) return Promise.reject(new Error('As senhas nao coincidem'));
        if (nova.length < 8) return Promise.reject(new Error('A senha deve ter pelo menos 8 caracteres'));
        if (!/[A-Z]/.test(nova) || !/[a-z]/.test(nova) || !/[0-9]/.test(nova)) {
          return Promise.reject(new Error('A senha deve conter letras maiusculas, minusculas e numeros'));
        }
        if (!atual) return Promise.reject(new Error('Digite a senha atual'));
        return exigirSessao().then(function(u) {
          return supabase().auth.signInWithPassword({ email: u.email, password: atual }).then(function(r) {
            if (r.error) return Promise.reject(new Error('Senha atual incorreta'));
            return supabase().auth.updateUser({ password: nova }).then(function(res) {
              if (res.error) return Promise.reject(new Error(res.error.message));
              return { ok: true, msg: 'Senha alterada com sucesso' };
            });
          });
        });
      }
    },

    pedidos: {
      criar: function(dados) {
        var cliente = dados.cliente, evento = dados.evento;
        if (!cliente || !evento || !dados.equipe || !dados.pagamento || !dados.total) {
          return Promise.reject(new Error('Dados incompletos'));
        }
        if (!cliente.nome || !cliente.whatsapp || !cliente.email || !cliente.cpf) {
          return Promise.reject(new Error('Dados do cliente sao obrigatorios'));
        }
        if (!validarCPF(cliente.cpf)) return Promise.reject(new Error('CPF invalido'));
        if (!evento.data || !evento.horario || !evento.endereco || !evento.convidados) {
          return Promise.reject(new Error('Dados do evento sao obrigatorios'));
        }
        var convidados = parseInt(evento.convidados, 10);
        if (isNaN(convidados) || convidados < 1 || convidados > 5000) {
          return Promise.reject(new Error('Numero de convidados invalido'));
        }
        var dataISO = converterParaISO(evento.data);
        return supabase().from('configuracoes').select('valor').eq('chave', 'max_eventos_por_dia').limit(1).then(function(cfg) {
          var maxEventos = parseInt((cfg.data && cfg.data[0] && cfg.data[0].valor) || 5, 10) || 5;
          return supabase().from('pedidos').select('id').eq('evento_data', dataISO).neq('status', 'cancelado').then(function(chk) {
            if (chk.error) return Promise.reject(new Error(chk.error.message));
            if (chk.data && chk.data.length >= maxEventos) {
              return Promise.reject(new Error('Data lotada. Escolha outra data.'));
            }
            var numeroPedido = gerarNumeroPedido();
            var linha = {
              numero_pedido: numeroPedido,
              cliente_nome: cliente.nome,
              cliente_whatsapp: cliente.whatsapp,
              cliente_email: cliente.email,
              cliente_cpf: cliente.cpf,
              evento_data: dataISO,
              evento_horario: evento.horario,
              evento_duracao: evento.duracao || '5',
              evento_endereco: evento.endereco,
              evento_convidados: convidados,
              equipe: JSON.stringify(dados.equipe),
              estacoes: dados.estacoes ? JSON.stringify(dados.estacoes) : JSON.stringify({}),
              pagamento: dados.pagamento,
              total: parseFloat(dados.total),
              status: 'pendente'
            };
            return supabase().from('pedidos').insert([linha]).then(function(res) {
              if (res.error) return Promise.reject(new Error(res.error.message));
              return { ok: true, numeroPedido: numeroPedido, id: res.data && res.data[0] ? res.data[0].id : null };
            });
          });
        });
      },

      listar: function(filtros) {
        return exigirSessao().then(function() {
          var q = supabase().from('pedidos').select('*').order('criado_em', { ascending: false });
          if (filtros && filtros.status && filtros.status !== 'todos') q = q.eq('status', filtros.status);
          return q.then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            var lista = (r.data || []).map(parseLinhaPedido);
            if (filtros && filtros.busca) {
              var b = String(filtros.busca).toLowerCase();
              lista = lista.filter(function(p) {
                return (p.cliente_nome || '').toLowerCase().indexOf(b) !== -1 ||
                       (p.cliente_whatsapp || '').toLowerCase().indexOf(b) !== -1 ||
                       (p.numero_pedido || '').toLowerCase().indexOf(b) !== -1;
              });
            }
            return lista;
          });
        });
      },

      buscar: function(num) {
        return exigirSessao().then(function() {
          return supabase().from('pedidos').select('*').eq('numero_pedido', num).single().then(function(r) {
            if (r.error) {
              var e = new Error(r.error.message);
              e.status = 404;
              throw e;
            }
            return parseLinhaPedido(r.data);
          });
        });
      },

      status: function(num, s) {
        return exigirSessao().then(function() {
          return supabase().from('pedidos').update({ status: s, atualizado_em: new Date().toISOString() }).eq('numero_pedido', num).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true, status: s };
          });
        });
      },

      excluir: function(num) {
        return exigirSessao().then(function() {
          return supabase().from('pedidos').delete().eq('numero_pedido', num).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      },

      datasOcupadas: function(max) {
        var maxPorDia = max || 5;
        return supabase().from('pedidos').select('evento_data').neq('status', 'cancelado').then(function(rp) {
          if (rp.error) return Promise.reject(new Error(rp.error.message));
          var contagem = {};
          (rp.data || []).forEach(function(p) {
            contagem[p.evento_data] = (contagem[p.evento_data] || 0) + 1;
          });
          return supabase().from('bloqueios').select('data').then(function(rb) {
            if (rb.error) return Promise.reject(new Error(rb.error.message));
            var ocupadas = Object.keys(contagem).filter(function(d) { return contagem[d] >= maxPorDia; });
            (rb.data || []).forEach(function(b) {
              if (ocupadas.indexOf(b.data) === -1) ocupadas.push(b.data);
            });
            return ocupadas;
          });
        });
      },

      resumo: function() {
        return exigirSessao().then(function() {
          return supabase().from('pedidos').select('*').then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            var pedidos = r.data || [];
            var total = pedidos.length;
            var confirmados = pedidos.filter(function(p) { return p.status === 'confirmado'; }).length;
            var pendentes = pedidos.filter(function(p) { return p.status === 'pendente'; }).length;
            var faturamento = pedidos.filter(function(p) { return p.status !== 'cancelado'; })
              .reduce(function(acc, p) { return acc + (p.total || 0); }, 0);
            return { total: total, confirmados: confirmados, pendentes: pendentes, faturamento: faturamento };
          });
        });
      }
    },

    config: {
      listar: function() {
        return supabase().from('configuracoes').select('chave, valor').then(function(r) {
          if (r.error) return Promise.reject(new Error(r.error.message));
          var result = {};
          (r.data || []).forEach(function(c) { result[c.chave] = c.valor; });
          return result;
        });
      },
      salvar: function(chave, valor) {
        return exigirSessao().then(function() {
          return supabase().from('configuracoes').upsert([{ chave: chave, valor: String(valor) }], { onConflict: 'chave' }).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      },
      salvarLote: function(obj) {
        return exigirSessao().then(function() {
          var linhas = Object.keys(obj).map(function(chave) {
            return { chave: chave, valor: String(obj[chave]) };
          });
          return supabase().from('configuracoes').upsert(linhas, { onConflict: 'chave' }).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      }
    },

    bloqueios: {
      listar: function() {
        return supabase().from('bloqueios').select('*').order('data', { ascending: false }).then(function(r) {
          if (r.error) return Promise.reject(new Error(r.error.message));
          return r.data || [];
        });
      },
      criar: function(data, motivo) {
        return exigirSessao().then(function() {
          return supabase().from('bloqueios').upsert([{ data: data, motivo: motivo || 'Sem motivo' }], { onConflict: 'data', ignoreDuplicates: false }).then(function(r) {
            if (r.error) {
              if (r.error.code === '23505') {
                var e2 = new Error('Data ja esta bloqueada');
                e2.status = 409;
                throw e2;
              }
              return Promise.reject(new Error(r.error.message));
            }
            return { ok: true };
          });
        });
      },
      remover: function(data) {
        return exigirSessao().then(function() {
          return supabase().from('bloqueios').delete().eq('data', data).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      }
    },

    promocoes: {
      listar: function() {
        return supabase().from('promocoes').select('*').eq('ativo', true).then(function(r) {
          if (r.error) return Promise.reject(new Error(r.error.message));
          var rows = ordenar(r.data, 'ordem', true);
          return rows.sort(function(a, b) { return a.ordem - b.ordem || b.id - a.id; });
        });
      },
      todas: function() {
        return exigirSessao().then(function() {
          return supabase().from('promocoes').select('*').then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return (r.data || []).sort(function(a, b) { return a.ordem - b.ordem || b.id - a.id; });
          });
        });
      },
      criar: function(dados) {
        return exigirSessao().then(function() {
          if (!dados.titulo || !dados.titulo.trim()) return Promise.reject(new Error('Titulo e obrigatorio'));
          return supabase().from('promocoes').insert([{
            titulo: dados.titulo.trim(),
            subtitulo: dados.subtitulo || '',
            preco: dados.preco || '',
            imagem: dados.imagem || '',
            ativo: dados.ativo ? true : false,
            ordem: parseInt(dados.ordem, 10) || 0
          }]).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      },
      atualizar: function(id, dados) {
        return exigirSessao().then(function() {
          if (!dados.titulo || !dados.titulo.trim()) return Promise.reject(new Error('Titulo e obrigatorio'));
          return supabase().from('promocoes').update({
            titulo: dados.titulo.trim(),
            subtitulo: dados.subtitulo || '',
            preco: dados.preco || '',
            imagem: dados.imagem || '',
            ativo: dados.ativo ? true : false,
            ordem: parseInt(dados.ordem, 10) || 0
          }).eq('id', id).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      },
      remover: function(id) {
        return exigirSessao().then(function() {
          return supabase().from('promocoes').delete().eq('id', id).then(function(r) {
            if (r.error) return Promise.reject(new Error(r.error.message));
            return { ok: true };
          });
        });
      },
      enviarImagem: function(formData) {
        var file = formData && formData.get('foto');
        return uploadImagem(file).then(function(nome) {
          return { ok: true, caminho: publicUrl(nome) };
        });
      }
    },

    fotos: {
      listar: function(tipo) {
        return supabase().from('fotos').select('*').eq('tipo', tipo).then(function(r) {
          if (r.error) return Promise.reject(new Error(r.error.message));
          return (r.data || []).sort(function(a, b) { return a.ordem - b.ordem || a.id - b.id; });
        });
      },
      enviar: function(tipo, formData) {
        var files = formData ? formData.getAll('fotos') : [];
        if (!files || files.length === 0) return Promise.reject(new Error('Nenhuma foto enviada'));
        if (['avaliacoes', 'eventos', 'estacoes'].indexOf(tipo) === -1) {
          return Promise.reject(new Error('Tipo invalido'));
        }
        var self = this;
        return supabase().from('fotos').select('ordem').eq('tipo', tipo).order('ordem', { ascending: false }).limit(1).then(function(mx) {
          var inicio = (mx.data && mx.data[0] && typeof mx.data[0].ordem === 'number') ? mx.data[0].ordem + 1 : 0;
          var seq = [];
          var i;
          for (i = 0; i < files.length; i++) {
            seq.push(uploadImagem(files[i]).then(function(publico) { return publico; }));
          }
          return Promise.all(seq).then(function(urls) {
            var linhas = urls.map(function(url, idx) { return { tipo: tipo, caminho: publicUrl(url), ordem: inicio + idx }; });
            return supabase().from('fotos').insert(linhas).then(function(rres) {
              if (rres.error) return Promise.reject(new Error(rres.error.message));
              return { ok: true, fotos: files.length };
            });
          });
        });
      },
      remover: function(id) {
        return exigirSessao().then(function() {
          return supabase().from('fotos').select('caminho').eq('id', id).single().then(function(reg) {
            if (reg.error) return Promise.reject(new Error(reg.error.message));
            var path = reg.data && reg.data.caminho ? reg.data.caminho : '';
            var objName = path.split('/imagens/').pop() || '';
            var ops = [];
            if (objName) ops.push(supabase().storage.from('imagens').remove([objName]));
            ops.push(supabase().from('fotos').delete().eq('id', id));
            return Promise.all(ops).then(function() { return { ok: true }; });
          });
        });
      }
    },

    site: {
      atualizarCarrosseis: function() {
        if (typeof atualizarCarrosseis === 'function') {
          return Promise.resolve(atualizarCarrosseis());
        }
        return Promise.resolve();
      }
    }
  };
})();