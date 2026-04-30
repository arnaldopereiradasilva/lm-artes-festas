/* ========================================
   L&M ARTES E FESTAS - ADMIN SCRIPT (SEGURO)
   ======================================== */

var pedidoAtualModal = null;
var mesAtual = new Date().getMonth();
var anoAtual = new Date().getFullYear();

var nomesServicos = {
    garcom: 'Garcom',
    copeira: 'Copeira',
    fritadeira: 'Fritadeira',
    churrasqueiro: 'Churrasqueiro',
    monitora: 'Monitora',
    recepcionista: 'Recepcionista'
};

var nomesEstacoes = {
    pipoca: 'Pipoca',
    algodao: 'Algodao Doce',
    acai: 'Ac ai',
    sorvete: 'Sorvete',
    batata: 'Batata Frita',
    crepe: 'Crepe',
    suco: 'Suco Natural'
};

document.addEventListener('DOMContentLoaded', function() {
    var loginPass = document.getElementById('login-pass');
    var loginUser = document.getElementById('login-user');
    if (loginPass) loginPass.addEventListener('keypress', function(e) { if (e.key === 'Enter') fazerLogin(); });
    if (loginUser) loginUser.addEventListener('keypress', function(e) { if (e.key === 'Enter') fazerLogin(); });

    var modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) modalOverlay.addEventListener('click', function(e) { if (e.target === this) fecharModal(); });

    API.setBase('');
});

async function fazerLogin() {
    var user = document.getElementById('login-user').value.trim();
    var pass = document.getElementById('login-pass').value.trim();

    if (!user || !pass) {
        mostrarErroLogin('Preencha usuario e senha');
        return;
    }

    try {
        var result = await API.auth.login(user, pass);
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('painel').classList.remove('hidden');
        iniciarPainel();
    } catch (err) {
        mostrarErroLogin(err.message || 'Usuario ou senha incorretos');
    }
}

function mostrarErroLogin(msg) {
    var el = document.getElementById('login-erro');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
}

function sair() {
    if (confirm('Deseja sair do painel?')) {
        API.auth.logout().then(function() {
            document.getElementById('loginOverlay').classList.remove('hidden');
            document.getElementById('painel').classList.add('hidden');
            document.getElementById('login-user').value = '';
            document.getElementById('login-pass').value = '';
        }).catch(function() {
            document.getElementById('loginOverlay').classList.remove('hidden');
            document.getElementById('painel').classList.add('hidden');
        });
    }
}

function iniciarPainel() {
    atualizarDataAtual();
    atualizarDashboard();
    renderizarPedidos();
    renderizarCalendario();
    renderizarFinanceiro();
    renderizarBloqueios();
    renderizarProximosEventos();
}

function atualizarDataAtual() {
    var agora = new Date();
    var opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dataAtual').textContent = agora.toLocaleDateString('pt-BR', opcoes);
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.add('hidden'); });
    var target = document.getElementById('page-' + page);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.sidebar-link').forEach(function(l) { l.classList.remove('active'); });
    if (event && event.target) event.target.classList.add('active');

    var titulos = { dashboard: 'Dashboard', pedidos: 'Pedidos', calendario: 'Calendario', financeiro: 'Financeiro', configuracoes: 'Configuracoes' };
    document.getElementById('page-title').textContent = titulos[page] || page;

    document.querySelector('.sidebar').classList.remove('open');

    if (page === 'dashboard') atualizarDashboard();
    if (page === 'pedidos') renderizarPedidos();
    if (page === 'calendario') renderizarCalendario();
    if (page === 'financeiro') renderizarFinanceiro();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

async function atualizarDashboard() {
    try {
        var resumo = await API.pedidos.resumo();
        document.getElementById('total-pedidos').textContent = resumo.total;
        document.getElementById('pedidos-confirmados').textContent = resumo.confirmados;
        document.getElementById('pedidos-pendentes').textContent = resumo.pendentes;
        document.getElementById('faturamento-total').textContent = 'R$ ' + resumo.faturamento.toFixed(2).replace('.', ',');
    } catch (e) { console.error(e); }

    try {
        var pedidos = await API.pedidos.listar();
        var recentes = pedidos.slice(0, 5);
        renderizarTabelaRecentes(recentes);
    } catch (e) { console.error(e); }

    renderizarProximosEventos();
}

function renderizarTabelaRecentes(pedidos) {
    var tbody = document.getElementById('tbody-recentes');
    if (!pedidos || pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhum pedido ainda</td></tr>';
        return;
    }

    tbody.innerHTML = pedidos.map(function(p) {
        return '<tr>' +
            '<td><strong>#' + escapeHtml(p.numero_pedido) + '</strong></td>' +
            '<td>' + escapeHtml(p.cliente_nome) + '</td>' +
            '<td>' + escapeHtml(p.evento_data) + '</td>' +
            '<td><strong>R$ ' + p.total.toFixed(2).replace('.', ',') + '</strong></td>' +
            '<td>' + getBadge(p.status) + '</td>' +
            '<td>' +
                '<button class="btn-acao" onclick="abrirModal(\'' + p.numero_pedido + '\')">Ver</button>' +
                '<button class="btn-acao" onclick="contatarClientePorNumero(\'' + p.numero_pedido + '\')">WhatsApp</button>' +
            '</td>' +
        '</tr>';
    }).join('');
}

async function renderizarPedidos() {
    try {
        var filtroStatus = document.getElementById('filtro-status') ? document.getElementById('filtro-status').value : 'todos';
        var filtroBusca = document.getElementById('filtro-busca') ? document.getElementById('filtro-busca').value.toLowerCase() : '';

        var pedidos = await API.pedidos.listar({ status: filtroStatus, busca: filtroBusca });
        var tbody = document.getElementById('tbody-pedidos');

        if (!pedidos || pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhum pedido encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = pedidos.map(function(p) {
            return '<tr>' +
                '<td><strong>#' + escapeHtml(p.numero_pedido) + '</strong></td>' +
                '<td>' + escapeHtml(p.cliente_nome) + '</td>' +
                '<td>' + escapeHtml(p.cliente_whatsapp) + '</td>' +
                '<td>' + escapeHtml(p.evento_data) + '</td>' +
                '<td>' + escapeHtml(p.pagamento).toUpperCase() + '</td>' +
                '<td><strong>R$ ' + p.total.toFixed(2).replace('.', ',') + '</strong></td>' +
                '<td>' + getBadge(p.status) + '</td>' +
                '<td>' +
                    '<button class="btn-acao" onclick="abrirModal(\'' + p.numero_pedido + '\')">Ver</button>' +
                    '<button class="btn-acao" onclick="contatarClientePorNumero(\'' + p.numero_pedido + '\')">WhatsApp</button>' +
                    '<button class="btn-acao" onclick="excluirPedido(\'' + p.numero_pedido + '\')">Excluir</button>' +
                '</td>' +
            '</tr>';
        }).join('');
    } catch (e) { console.error(e); }
}

function filtrarPedidos() { renderizarPedidos(); }

function getBadge(status) {
    var badges = {
        pendente: '<span class="badge badge-pendente">Pendente</span>',
        confirmado: '<span class="badge badge-confirmado">Confirmado</span>',
        cancelado: '<span class="badge badge-cancelado">Cancelado</span>',
        concluido: '<span class="badge badge-concluido">Concluido</span>'
    };
    return badges[status] || status;
}

async function abrirModal(numeroPedido) {
    try {
        var pedido = await API.pedidos.buscar(numeroPedido);
        if (!pedido) return;
        pedidoAtualModal = pedido;

        document.getElementById('modal-titulo').textContent = 'Pedido #' + pedido.numero_pedido;

        var equipeHtml = '';
        for (var s in pedido.equipe) {
            if (pedido.equipe[s] > 0) {
                var preco = getPreco(s);
                equipeHtml += '<div class="modal-item"><span>' + pedido.equipe[s] + 'x ' + nomesServicos[s] + '</span><span>R$ ' + (pedido.equipe[s] * preco).toFixed(2).replace('.', ',') + '</span></div>';
            }
        }

        var estacoesHtml = '';
        for (var est in pedido.estacoes) {
            estacoesHtml += '<div class="modal-item"><span>' + nomesEstacoes[est] + '</span><span>R$ ' + pedido.estacoes[est].toFixed(2).replace('.', ',') + '</span></div>';
        }
        if (!estacoesHtml) estacoesHtml = '<div class="modal-item"><span>Nenhuma estacao</span><span>-</span></div>';

        document.getElementById('modal-body').innerHTML =
            '<div class="modal-secao">Dados do Cliente</div>' +
            '<div class="modal-item"><span>Nome</span><span>' + escapeHtml(pedido.cliente_nome) + '</span></div>' +
            '<div class="modal-item"><span>WhatsApp</span><span>' + escapeHtml(pedido.cliente_whatsapp) + '</span></div>' +
            '<div class="modal-item"><span>E-mail</span><span>' + escapeHtml(pedido.cliente_email) + '</span></div>' +
            '<div class="modal-secao">Dados do Evento</div>' +
            '<div class="modal-item"><span>Data</span><span>' + escapeHtml(pedido.evento_data) + '</span></div>' +
            '<div class="modal-item"><span>Horario</span><span>' + escapeHtml(pedido.evento_horario) + '</span></div>' +
            '<div class="modal-item"><span>Duracao</span><span>' + escapeHtml(pedido.evento_duracao) + 'h</span></div>' +
            '<div class="modal-item"><span>Endereco</span><span>' + escapeHtml(pedido.evento_endereco) + '</span></div>' +
            '<div class="modal-item"><span>Convidados</span><span>' + escapeHtml(pedido.evento_convidados) + '</span></div>' +
            '<div class="modal-secao">Equipe</div>' + equipeHtml +
            '<div class="modal-secao">Estacoes</div>' + estacoesHtml +
            '<div class="modal-secao">Pagamento</div>' +
            '<div class="modal-item"><span>Forma</span><span>' + escapeHtml(pedido.pagamento).toUpperCase() + '</span></div>' +
            '<div class="modal-item"><span>Status</span><span>' + getBadge(pedido.status) + '</span></div>' +
            '<div class="modal-total"><strong>Total</strong><span>R$ ' + pedido.total.toFixed(2).replace('.', ',') + '</span></div>';

        document.getElementById('modalOverlay').classList.remove('hidden');
    } catch (e) { console.error(e); }
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    pedidoAtualModal = null;
}

async function atualizarStatus(novoStatus) {
    if (!pedidoAtualModal) return;
    try {
        await API.pedidos.status(pedidoAtualModal.numero_pedido, novoStatus);
        alert('Status atualizado para: ' + novoStatus.toUpperCase());
        fecharModal();
        atualizarDashboard();
        renderizarPedidos();
        renderizarFinanceiro();
    } catch (e) { alert('Erro: ' + e.message); }
}

async function excluirPedido(numeroPedido) {
    if (!confirm('Deseja excluir o pedido #' + numeroPedido + '?')) return;
    try {
        await API.pedidos.excluir(numeroPedido);
        alert('Pedido excluido com sucesso!');
        atualizarDashboard();
        renderizarPedidos();
        renderizarFinanceiro();
    } catch (e) { alert('Erro: ' + e.message); }
}

function contatarCliente() {
    if (pedidoAtualModal) contatarClientePorNumero(pedidoAtualModal.numero_pedido);
}

function contatarClientePorNumero(numeroPedido) {
    var pedidos = JSON.parse(sessionStorage.getItem('_pedidos_cache') || '[]');
    var pedido = pedidos.find(function(p) { return p.numero_pedido === numeroPedido; });
    if (!pedido) { alert('Pedido nao encontrado em cache'); return; }

    var mensagem = 'Ola ' + pedido.cliente_nome + '!\nAqui e a L&M Artes e Festas.\nEstamos entrando em contato sobre seu pedido *#' + pedido.numero_pedido + '* para o dia *' + pedido.evento_data + '*.';
    var whatsapp = pedido.cliente_whatsapp.replace(/\D/g, '');
    window.open('https://wa.me/55' + whatsapp + '?text=' + encodeURIComponent(mensagem), '_blank');
}

async function renderizarCalendario() {
    var calendario = document.getElementById('calendario');
    var mesAnoEl = document.getElementById('mes-ano');
    if (!calendario) return;

    var meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    mesAnoEl.textContent = meses[mesAtual] + ' ' + anoAtual;

    try {
        var pedidos = await API.pedidos.listar();
        sessionStorage.setItem('_pedidos_cache', JSON.stringify(pedidos));

        var bloqueios = await API.bloqueios.listar();
        var config = await API.config.listar();
        var maxPorDia = parseInt(config.max_eventos_por_dia) || 5;

        var eventosPorData = {};
        pedidos.forEach(function(p) {
            if (p.status !== 'cancelado') {
                var data = converterData(p.evento_data);
                if (data) eventosPorData[data] = (eventosPorData[data] || 0) + 1;
            }
        });

        var primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
        var diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        var hoje = new Date(); hoje.setHours(0,0,0,0);

        var html = '';
        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].forEach(function(d) { html += '<div class="cal-dia-semana">' + d + '</div>'; });

        for (var i = 0; i < primeiroDia; i++) html += '<div class="cal-dia vazio"></div>';

        for (var dia = 1; dia <= diasNoMes; dia++) {
            var dataFormatada = anoAtual + '-' + String(mesAtual + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
            var dataObj = new Date(anoAtual, mesAtual, dia);
            var isHoje = dataObj.toDateString() === hoje.toDateString();
            var isPassado = dataObj < hoje && !isHoje;
            var isBloqueado = bloqueios.some(function(b) { return b.data === dataFormatada; });
            var numEventos = eventosPorData[dataFormatada] || 0;
            var isOcupado = numEventos >= maxPorDia;

            var classe = 'cal-dia ';
            if (isHoje) classe += 'hoje';
            else if (isPassado) classe += 'passado';
            else if (isBloqueado) classe += 'bloqueado';
            else if (isOcupado) classe += 'ocupado';
            else classe += 'disponivel';

            html += '<div class="' + classe + '" onclick="clicouDia(\'' + dataFormatada + '\')">' + dia +
                (numEventos > 0 ? '<span class="cal-eventos-num">' + numEventos + '</span>' : '') + '</div>';
        }

        calendario.innerHTML = html;
    } catch (e) { console.error(e); }
}

function clicouDia(data) {
    var pedidos = JSON.parse(sessionStorage.getItem('_pedidos_cache') || '[]');
    var eventosDia = pedidos.filter(function(p) { return converterData(p.evento_data) === data && p.status !== 'cancelado'; });

    if (eventosDia.length > 0) {
        var nomes = eventosDia.map(function(p) { '- #' + p.numero_pedido + ' - ' + p.cliente_nome; }).join('\n');
        alert('Eventos em ' + formatarData(data) + ':\n\n' + nomes);
    }
}

function mudarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
    if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
    renderizarCalendario();
}

async function bloquearData() {
    var data = document.getElementById('data-bloquear').value;
    var motivo = document.getElementById('motivo-bloqueio').value;
    if (!data) { alert('Selecione uma data!'); return; }

    try {
        await API.bloqueios.criar(data, motivo || 'Sem motivo');
        alert('Data ' + formatarData(data) + ' bloqueada com sucesso!');
        renderizarBloqueios();
        renderizarCalendario();
        document.getElementById('data-bloquear').value = '';
        document.getElementById('motivo-bloqueio').value = '';
    } catch (e) { alert('Erro: ' + e.message); }
}

async function desbloquearData() {
    var data = document.getElementById('data-bloquear').value;
    if (!data) { alert('Selecione uma data!'); return; }

    try {
        await API.bloqueios.remover(data);
        alert('Data ' + formatarData(data) + ' desbloqueada!');
        renderizarBloqueios();
        renderizarCalendario();
        document.getElementById('data-bloquear').value = '';
    } catch (e) { alert('Erro: ' + e.message); }
}

async function renderizarBloqueios() {
    try {
        var bloqueios = await API.bloqueios.listar();
        var lista = document.getElementById('lista-bloqueios');
        if (!lista) return;

        if (bloqueios.length === 0) {
            lista.innerHTML = '<p style="color: var(--gray-dark); font-style: italic;">Nenhuma data bloqueada</p>';
            return;
        }

        lista.innerHTML = bloqueios.map(function(b) {
            return '<div class="bloqueio-item"><span>' + formatarData(b.data) + ' - ' + escapeHtml(b.motivo) + '</span><button onclick="removerBloqueio(\'' + b.data + '\')">X</button></div>';
        }).join('');
    } catch (e) { console.error(e); }
}

async function removerBloqueio(data) {
    try {
        await API.bloqueios.remover(data);
        renderizarBloqueios();
        renderizarCalendario();
    } catch (e) { alert('Erro: ' + e.message); }
}

async function renderizarProximosEventos() {
    try {
        var pedidos = await API.pedidos.listar();
        var hoje = new Date(); hoje.setHours(0,0,0,0);

        var proximos = pedidos.filter(function(p) {
            var data = converterDataObj(p.evento_data);
            return data >= hoje && p.status !== 'cancelado';
        }).sort(function(a, b) {
            return converterDataObj(a.evento_data) - converterDataObj(b.evento_data);
        }).slice(0, 5);

        var container = document.getElementById('proximos-eventos');
        if (!container) return;

        if (proximos.length === 0) {
            container.innerHTML = '<p class="sem-dados">Nenhum evento agendado</p>';
            return;
        }

        var meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        container.innerHTML = proximos.map(function(p) {
            var data = converterDataObj(p.evento_data);
            return '<div class="evento-card" onclick="abrirModal(\'' + p.numero_pedido + '\')">' +
                '<div class="evento-data-box"><div class="dia">' + data.getDate() + '</div><div class="mes">' + meses[data.getMonth()] + '</div></div>' +
                '<div class="evento-info"><strong>' + escapeHtml(p.cliente_nome) + '</strong><span>' + escapeHtml(p.evento_horario) + ' - ' + escapeHtml(p.evento_convidados) + ' convidados - R$ ' + p.total.toFixed(2).replace('.', ',') + '</span></div>' +
                getBadge(p.status) + '</div>';
        }).join('');
    } catch (e) { console.error(e); }
}

async function renderizarFinanceiro() {
    try {
        var pedidos = await API.pedidos.listar();
        var hoje = new Date();
        var mesHoje = hoje.getMonth();
        var anoHoje = hoje.getFullYear();

        var fatMes = pedidos.filter(function(p) { var d = converterDataObj(p.evento_data); return d && d.getMonth() === mesHoje && d.getFullYear() === anoHoje && p.status !== 'cancelado'; }).reduce(function(a, p) { return a + p.total; }, 0);
        var fatTotal = pedidos.filter(function(p) { return p.status !== 'cancelado'; }).reduce(function(a, p) { return a + p.total; }, 0);
        var fatPendente = pedidos.filter(function(p) { return p.status === 'pendente'; }).reduce(function(a, p) { return a + p.total; }, 0);
        var validos = pedidos.filter(function(p) { return p.status !== 'cancelado'; });
        var ticketMedio = validos.length > 0 ? fatTotal / validos.length : 0;

        var fmt = function(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
        document.getElementById('fat-mes').textContent = fmt(fatMes);
        document.getElementById('fat-total').textContent = fmt(fatTotal);
        document.getElementById('fat-pendente').textContent = fmt(fatPendente);
        document.getElementById('ticket-medio').textContent = fmt(ticketMedio);

        filtrarFinanceiro();
    } catch (e) { console.error(e); }
}

async function filtrarFinanceiro() {
    try {
        var pedidos = await API.pedidos.listar();
        var filtroMes = document.getElementById('filtro-mes-fin') ? document.getElementById('filtro-mes-fin').value : 'todos';

        var filtrados = pedidos.filter(function(p) { return p.status !== 'cancelado'; });
        if (filtroMes !== 'todos') {
            filtrados = filtrados.filter(function(p) { var d = converterDataObj(p.evento_data); return d && d.getMonth() === parseInt(filtroMes); });
        }

        var tbody = document.getElementById('tbody-financeiro');
        if (filtrados.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhum registro</td></tr>'; return; }

        tbody.innerHTML = filtrados.map(function(p) {
            return '<tr><td><strong>#' + escapeHtml(p.numero_pedido) + '</strong></td><td>' + escapeHtml(p.cliente_nome) + '</td><td>' + escapeHtml(p.evento_data) + '</td><td>' + escapeHtml(p.pagamento).toUpperCase() + '</td><td><strong>R$ ' + p.total.toFixed(2).replace('.', ',') + '</strong></td><td>' + getBadge(p.status) + '</td></tr>';
        }).join('');
    } catch (e) { console.error(e); }
}

async function alterarSenha() {
    var atual = document.getElementById('senha-atual').value;
    var nova = document.getElementById('senha-nova').value;
    var confirmar = document.getElementById('senha-confirmar').value;

    try {
        await API.auth.trocarSenha(atual, nova, confirmar);
        alert('Senha alterada com sucesso!');
        document.getElementById('senha-atual').value = '';
        document.getElementById('senha-nova').value = '';
        document.getElementById('senha-confirmar').value = '';
    } catch (e) { alert('Erro: ' + e.message); }
}

async function salvarPrecos() {
    var precos = {
        preco_garcom: document.getElementById('preco-garcom').value,
        preco_copeira: document.getElementById('preco-copeira').value,
        preco_fritadeira: document.getElementById('preco-fritadeira').value,
        preco_churrasqueiro: document.getElementById('preco-churrasqueiro').value,
        preco_monitora: document.getElementById('preco-monitora').value,
        preco_recepcionista: document.getElementById('preco-recepcionista').value,
        preco_pipoca: document.getElementById('preco-pipoca').value,
        preco_algodao: document.getElementById('preco-algodao').value,
        preco_acai: document.getElementById('preco-acai').value,
        preco_sorvete: document.getElementById('preco-sorvete').value,
        preco_batata: document.getElementById('preco-batata').value,
        preco_crepe: document.getElementById('preco-crepe').value,
        preco_suco: document.getElementById('preco-suco').value
    };

    try {
        await API.config.salvarLote(precos);
        alert('Precos salvos com sucesso!');
    } catch (e) { alert('Erro: ' + e.message); }
}

async function salvarConfiguracoes() {
    var configs = {
        whatsapp: document.getElementById('config-whatsapp').value,
        email: document.getElementById('config-email').value,
        pix: document.getElementById('config-pix').value,
        max_eventos_por_dia: document.getElementById('config-max-eventos').value
    };

    try {
        await API.config.salvarLote(configs);
        alert('Configuracoes salvas com sucesso!');
    } catch (e) { alert('Erro: ' + e.message); }
}

async function salvarMercadoPago() {
    var dados = {
        mp_nome: document.getElementById('mp-nome').value,
        mp_documento: document.getElementById('mp-documento').value,
        mp_email: document.getElementById('mp-email').value,
        mp_public_key: document.getElementById('mp-public-key').value,
        mp_access_token: document.getElementById('mp-access-token').value,
        mp_modo: document.getElementById('mp-modo').value
    };

    if (!dados.mp_nome || !dados.mp_documento || !dados.mp_email) { alert('Preencha todos os dados!'); return; }
    if (!dados.mp_public_key || !dados.mp_access_token) { alert('Adicione as chaves do Mercado Pago!'); return; }

    try {
        await API.config.salvarLote(dados);
        alert('Configuracoes do Mercado Pago salvas!');
    } catch (e) { alert('Erro: ' + e.message); }
}

async function gerarLinkPagamento() {
    var cliente = document.getElementById('link-cliente').value;
    var descricao = document.getElementById('link-descricao').value;
    var valor = parseFloat(document.getElementById('link-valor').value);
    var whatsapp = document.getElementById('link-whatsapp').value;

    if (!cliente || !descricao || !valor || valor <= 0) { alert('Preencha todos os campos!'); return; }

    try {
        var result = await API.pagamento.gerarLink({ cliente: cliente, descricao: descricao, valor: valor, whatsapp: whatsapp });

        document.getElementById('link-resultado').style.display = 'block';
        document.getElementById('link-gerado').value = result.link;

        if (result.whatsapp) {
            var mensagem = 'Ola ' + cliente + '!\nAqui e a L&M Artes e Festas.\n\nSegue o link para pagamento:\n\n*' + descricao + '*\nValor: R$ ' + valor.toFixed(2).replace('.', ',') + '\n\nLink: ' + result.link;
            var whatsNum = whatsapp.replace(/\D/g, '');
            if (whatsNum.length === 11) whatsNum = '55' + whatsNum;
            setTimeout(function() {
                if (confirm('Deseja enviar pelo WhatsApp?')) {
                    window.open('https://wa.me/' + whatsNum + '?text=' + encodeURIComponent(mensagem), '_blank');
                }
            }, 500);
        }
    } catch (e) { alert('Erro: ' + e.message); }
}

function copiarLink() {
    var link = document.getElementById('link-gerado');
    link.select();
    document.execCommand('copy');
    alert('Link copiado!');
}

function converterData(dataStr) {
    if (!dataStr) return null;
    if (dataStr.indexOf('/') !== -1) {
        var parts = dataStr.split('/');
        if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    return dataStr;
}

function converterDataObj(dataStr) {
    if (!dataStr) return null;
    try {
        if (dataStr.indexOf('/') !== -1) {
            var parts = dataStr.split('/');
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        if (dataStr.indexOf('-') !== -1) {
            var parts = dataStr.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
    } catch (e) { return null; }
    return null;
}

function formatarData(dataStr) {
    if (!dataStr) return '';
    if (dataStr.indexOf('-') !== -1) {
        var parts = dataStr.split('-');
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dataStr;
}

function getPreco(servico) {
    return 0;
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
