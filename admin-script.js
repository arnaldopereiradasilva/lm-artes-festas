/* ========================================
   L&M ARTES E FESTAS - ADMIN SCRIPT
   ======================================== */

// ========================================
// CONFIGURAÇÕES
// ========================================

const CONFIG = {
    usuario: 'lenice',
    senha: 'lm2025',
    maxEventosPorDia: 5
};

// ========================================
// DADOS (LocalStorage)
// ========================================

function getPedidos() {
    return JSON.parse(localStorage.getItem('lm_pedidos') || '[]');
}

function savePedidos(pedidos) {
    localStorage.setItem('lm_pedidos', JSON.stringify(pedidos));
}

function getBloqueios() {
    return JSON.parse(localStorage.getItem('lm_bloqueios') || '[]');
}

function saveBloqueios(bloqueios) {
    localStorage.setItem('lm_bloqueios', JSON.stringify(bloqueios));
}

function getConfig() {
    return JSON.parse(localStorage.getItem('lm_config') || JSON.stringify(CONFIG));
}

function saveConfig(config) {
    localStorage.setItem('lm_config', JSON.stringify(config));
}

// ========================================
// LOGIN
// ========================================

function fazerLogin() {
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const config = getConfig();

    if (user === config.usuario && pass === config.senha) {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('painel').classList.remove('hidden');
        iniciarPainel();
    } else {
        document.getElementById('login-erro').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('login-erro').classList.add('hidden');
        }, 3000);
    }
}

// Enter para login
document.getElementById('login-pass').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});

document.getElementById('login-user').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') fazerLogin();
});

function sair() {
    if (confirm('Deseja sair do painel?')) {
        document.getElementById('loginOverlay').classList.remove('hidden');
        document.getElementById('painel').classList.add('hidden');
        document.getElementById('login-user').value = '';
        document.getElementById('login-pass').value = '';
    }
}

// ========================================
// INICIAR PAINEL
// ========================================

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
    const agora = new Date();
    const opcoes = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    document.getElementById('dataAtual').textContent =
        agora.toLocaleDateString('pt-BR', opcoes);
}

// ========================================
// NAVEGAÇÃO ENTRE PÁGINAS
// ========================================

function showPage(page) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

    // Mostrar página selecionada
    document.getElementById(`page-${page}`).classList.remove('hidden');

    // Atualizar sidebar
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');

    // Atualizar título
    const titulos = {
        dashboard: 'Dashboard',
        pedidos: 'Pedidos',
        calendario: 'Calendário',
        financeiro: 'Financeiro',
        configuracoes: 'Configurações'
    };

    document.getElementById('page-title').textContent = titulos[page] || page;

    // Fechar sidebar mobile
    document.querySelector('.sidebar').classList.remove('open');

    // Atualizar dados
    if (page === 'dashboard') atualizarDashboard();
    if (page === 'pedidos') renderizarPedidos();
    if (page === 'calendario') renderizarCalendario();
    if (page === 'financeiro') renderizarFinanceiro();
}

// ========================================
// TOGGLE SIDEBAR MOBILE
// ========================================

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// ========================================
// DASHBOARD
// ========================================

function atualizarDashboard() {
    const pedidos = getPedidos();

    const total = pedidos.length;
    const confirmados = pedidos.filter(p => p.status === 'confirmado').length;
    const pendentes = pedidos.filter(p => p.status === 'pendente').length;
    const faturamento = pedidos
        .filter(p => p.status !== 'cancelado')
        .reduce((acc, p) => acc + (p.total || 0), 0);

    document.getElementById('total-pedidos').textContent = total;
    document.getElementById('pedidos-confirmados').textContent = confirmados;
    document.getElementById('pedidos-pendentes').textContent = pendentes;
    document.getElementById('faturamento-total').textContent =
        `R$ ${faturamento.toFixed(2).replace('.', ',')}`;

    // Pedidos recentes (últimos 5)
    const recentes = [...pedidos].reverse().slice(0, 5);
    renderizarTabelaRecentes(recentes);

    // Próximos eventos
    renderizarProximosEventos();
}

// ========================================
// RENDERIZAR TABELA RECENTES
// ========================================

function renderizarTabelaRecentes(pedidos) {
    const tbody = document.getElementById('tbody-recentes');

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhum pedido ainda</td></tr>';
        return;
    }

    tbody.innerHTML = pedidos.map(p => `
        <tr>
            <td><strong>#${p.numeroPedido}</strong></td>
            <td>${p.cliente.nome}</td>
            <td>${p.evento.data}</td>
            <td><strong>R$ ${p.total.toFixed(2).replace('.', ',')}</strong></td>
            <td>${getBadge(p.status)}</td>
            <td>
                <button class="btn-acao" onclick="abrirModal('${p.numeroPedido}')" title="Ver detalhes">👁️</button>
                <button class="btn-acao" onclick="contatarClientePorNumero('${p.numeroPedido}')" title="WhatsApp">📱</button>
            </td>
        </tr>
    `).join('');
}

// ========================================
// RENDERIZAR TODOS OS PEDIDOS
// ========================================

function renderizarPedidos() {
    const pedidos = getPedidos();
    const filtroStatus = document.getElementById('filtro-status')?.value || 'todos';
    const filtroBusca = document.getElementById('filtro-busca')?.value.toLowerCase() || '';

    let filtrados = pedidos;

    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(p => p.status === filtroStatus);
    }

    if (filtroBusca) {
        filtrados = filtrados.filter(p =>
            p.cliente.nome.toLowerCase().includes(filtroBusca) ||
            p.cliente.whatsapp.includes(filtroBusca) ||
            p.numeroPedido.includes(filtroBusca)
        );
    }

    const tbody = document.getElementById('tbody-pedidos');

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhum pedido encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = [...filtrados].reverse().map(p => `
        <tr>
            <td><strong>#${p.numeroPedido}</strong></td>
            <td>${p.cliente.nome}</td>
            <td>${p.cliente.whatsapp}</td>
            <td>${p.evento.data}</td>
            <td>${p.pagamento.toUpperCase()}</td>
            <td><strong>R$ ${p.total.toFixed(2).replace('.', ',')}</strong></td>
            <td>${getBadge(p.status)}</td>
            <td>
                <button class="btn-acao" onclick="abrirModal('${p.numeroPedido}')" title="Ver detalhes">👁️</button>
                <button class="btn-acao" onclick="contatarClientePorNumero('${p.numeroPedido}')" title="WhatsApp">📱</button>
                <button class="btn-acao" onclick="excluirPedido('${p.numeroPedido}')" title="Excluir">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function filtrarPedidos() {
    renderizarPedidos();
}

// ========================================
// BADGE DE STATUS
// ========================================

function getBadge(status) {
    const badges = {
        pendente: '<span class="badge badge-pendente">⏳ Pendente</span>',
        confirmado: '<span class="badge badge-confirmado">✅ Confirmado</span>',
        cancelado: '<span class="badge badge-cancelado">❌ Cancelado</span>',
        concluido: '<span class="badge badge-concluido">🏁 Concluído</span>'
    };
    return badges[status] || status;
}

// ========================================
// MODAL DE DETALHES
// ========================================

let pedidoAtualModal = null;

function abrirModal(numeroPedido) {
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.numeroPedido === numeroPedido);
    if (!pedido) return;

    pedidoAtualModal = pedido;

    document.getElementById('modal-titulo').textContent =
        `Pedido #${pedido.numeroPedido}`;

    const nomesServicos = {
        garcom: 'Garçom',
        copeira: 'Copeira',
        fritadeira: 'Fritadeira',
        churrasqueiro: 'Churrasqueiro',
        monitora: 'Monitora',
        recepcionista: 'Recepcionista'
    };

    const nomesEstacoes = {
        pipoca: 'Pipoca',
        algodao: 'Algodão Doce',
        acai: 'Açaí',
        sorvete: 'Sorvete',
        batata: 'Batata Frita',
        crepe: 'Crepe',
        suco: 'Suco Natural'
    };

    let equipeHtml = '';
    for (const [s, qty] of Object.entries(pedido.equipe)) {
        if (qty > 0) {
            equipeHtml += `
                <div class="modal-item">
                    <span>${qty}x ${nomesServicos[s]}</span>
                    <span>R$ ${(qty * getPreco(s)).toFixed(2).replace('.', ',')}</span>
                </div>`;
        }
    }

    let estacoesHtml = '';
    for (const [est, preco] of Object.entries(pedido.estacoes || {})) {
        estacoesHtml += `
            <div class="modal-item">
                <span>${nomesEstacoes[est]}</span>
                <span>R$ ${preco.toFixed(2).replace('.', ',')}</span>
            </div>`;
    }
    if (!estacoesHtml) estacoesHtml = '<div class="modal-item"><span>Nenhuma estação</span><span>-</span></div>';

    document.getElementById('modal-body').innerHTML = `
        <div class="modal-secao">📋 Dados do Cliente</div>
        <div class="modal-item"><span>Nome</span><span>${pedido.cliente.nome}</span></div>
        <div class="modal-item"><span>WhatsApp</span><span>${pedido.cliente.whatsapp}</span></div>
        <div class="modal-item"><span>E-mail</span><span>${pedido.cliente.email}</span></div>
        <div class="modal-item"><span>CPF</span><span>${pedido.cliente.cpf}</span></div>

        <div class="modal-secao">📅 Dados do Evento</div>
        <div class="modal-item"><span>Data</span><span>${pedido.evento.data}</span></div>
        <div class="modal-item"><span>Horário</span><span>${pedido.evento.horario}</span></div>
        <div class="modal-item"><span>Duração</span><span>${pedido.evento.duracao}h</span></div>
        <div class="modal-item"><span>Endereço</span><span>${pedido.evento.endereco}</span></div>
        <div class="modal-item"><span>Convidados</span><span>${pedido.evento.convidados}</span></div>

        <div class="modal-secao">🤵 Equipe</div>
        ${equipeHtml}

        <div class="modal-secao">🍿 Estações</div>
        ${estacoesHtml}

        <div class="modal-secao">💳 Pagamento</div>
        <div class="modal-item"><span>Forma</span><span>${pedido.pagamento.toUpperCase()}</span></div>
        <div class="modal-item"><span>Status</span><span>${getBadge(pedido.status)}</span></div>

        <div class="modal-total">
            <strong>Total do Pedido</strong>
            <span>R$ ${pedido.total.toFixed(2).replace('.', ',')}</span>
        </div>
    `;

    document.getElementById('modalOverlay').classList.remove('hidden');
}

function fecharModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    pedidoAtualModal = null;
}

// Fechar modal clicando fora
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
});

// ========================================
// ATUALIZAR STATUS DO PEDIDO
// ========================================

function atualizarStatus(novoStatus) {
    if (!pedidoAtualModal) return;

    const pedidos = getPedidos();
    const index = pedidos.findIndex(p => p.numeroPedido === pedidoAtualModal.numeroPedido);

    if (index !== -1) {
        pedidos[index].status = novoStatus;
        savePedidos(pedidos);

        alert(`✅ Status atualizado para: ${novoStatus.toUpperCase()}`);
        fecharModal();
        atualizarDashboard();
        renderizarPedidos();
        renderizarFinanceiro();
    }
}

// ========================================
// EXCLUIR PEDIDO
// ========================================

function excluirPedido(numeroPedido) {
    if (!confirm(`Deseja excluir o pedido #${numeroPedido}?`)) return;

    let pedidos = getPedidos();
        pedidos = pedidos.filter(p => p.numeroPedido !== numeroPedido);
    savePedidos(pedidos);

    alert('✅ Pedido excluído com sucesso!');
    atualizarDashboard();
    renderizarPedidos();
    renderizarFinanceiro();
}

// ========================================
// CONTATAR CLIENTE
// ========================================

function contatarCliente() {
    if (!pedidoAtualModal) return;
    contatarClientePorNumero(pedidoAtualModal.numeroPedido);
}

function contatarClientePorNumero(numeroPedido) {
    const pedidos = getPedidos();
    const pedido = pedidos.find(p => p.numeroPedido === numeroPedido);
    if (!pedido) return;

    const mensagem = `Olá ${pedido.cliente.nome}! 😊
Aqui é a L&M Artes e Festas.
Estamos entrando em contato sobre seu pedido *#${pedido.numeroPedido}* para o dia *${pedido.evento.data}*.
Como podemos te ajudar?`;

    const whatsapp = pedido.cliente.whatsapp.replace(/\D/g, '');
    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// ========================================
// CALENDÁRIO
// ========================================

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();

function renderizarCalendario() {
    const calendario = document.getElementById('calendario');
    const mesAnoEl = document.getElementById('mes-ano');

    if (!calendario) return;

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    mesAnoEl.textContent = `${meses[mesAtual]} ${anoAtual}`;

    const pedidos = getPedidos();
    const bloqueios = getBloqueios();

    // Contar eventos por data
    const eventosPorData = {};
    pedidos.forEach(p => {
        if (p.status !== 'cancelado') {
            const data = converterData(p.evento.data);
            if (data) {
                eventosPorData[data] = (eventosPorData[data] || 0) + 1;
            }
        }
    });

    // Primeiro dia do mês
    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const hoje = new Date();

    let html = '';

    // Dias da semana
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    diasSemana.forEach(d => {
        html += `<div class="cal-dia-semana">${d}</div>`;
    });

    // Espaços vazios
    for (let i = 0; i < primeiroDia; i++) {
        html += `<div class="cal-dia vazio"></div>`;
    }

    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const dataObj = new Date(anoAtual, mesAtual, dia);

        const isHoje = dataObj.toDateString() === hoje.toDateString();
        const isPassado = dataObj < hoje && !isHoje;
        const isBloqueado = bloqueios.some(b => b.data === dataFormatada);
        const numEventos = eventosPorData[dataFormatada] || 0;
        const config = getConfig();
        const isOcupado = numEventos >= (config.maxEventosPorDia || 5);

        let classe = 'cal-dia ';
        if (isHoje) classe += 'hoje';
        else if (isPassado) classe += 'passado';
        else if (isBloqueado) classe += 'bloqueado';
        else if (isOcupado) classe += 'ocupado';
        else classe += 'disponivel';

        html += `
            <div class="${classe}" onclick="clicouDia('${dataFormatada}')">
                ${dia}
                ${numEventos > 0 ? `<span class="cal-eventos-num">${numEventos}</span>` : ''}
            </div>`;
    }

    calendario.innerHTML = html;
}

function clicouDia(data) {
    const pedidos = getPedidos();
    const eventosDia = pedidos.filter(p => {
        const dataConvertida = converterData(p.evento.data);
        return dataConvertida === data && p.status !== 'cancelado';
    });

    if (eventosDia.length > 0) {
        const nomes = eventosDia.map(p => `• #${p.numeroPedido} - ${p.cliente.nome}`).join('\n');
        alert(`📅 Eventos em ${formatarData(data)}:\n\n${nomes}`);
    }
}

function mudarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
    }
    if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
    }
    renderizarCalendario();
}

// ========================================
// BLOQUEAR / DESBLOQUEAR DATAS
// ========================================

function bloquearData() {
    const data = document.getElementById('data-bloquear').value;
    const motivo = document.getElementById('motivo-bloqueio').value;

    if (!data) {
        alert('Por favor, selecione uma data!');
        return;
    }

    const bloqueios = getBloqueios();

    if (bloqueios.some(b => b.data === data)) {
        alert('Esta data já está bloqueada!');
        return;
    }

    bloqueios.push({ data, motivo: motivo || 'Sem motivo' });
    saveBloqueios(bloqueios);

    alert(`✅ Data ${formatarData(data)} bloqueada com sucesso!`);
    renderizarBloqueios();
    renderizarCalendario();

    document.getElementById('data-bloquear').value = '';
    document.getElementById('motivo-bloqueio').value = '';
}

function desbloquearData() {
    const data = document.getElementById('data-bloquear').value;

    if (!data) {
        alert('Por favor, selecione uma data!');
        return;
    }

    let bloqueios = getBloqueios();

    if (!bloqueios.some(b => b.data === data)) {
        alert('Esta data não está bloqueada!');
        return;
    }

    bloqueios = bloqueios.filter(b => b.data !== data);
    saveBloqueios(bloqueios);

    alert(`✅ Data ${formatarData(data)} desbloqueada com sucesso!`);
    renderizarBloqueios();
    renderizarCalendario();

    document.getElementById('data-bloquear').value = '';
}

function renderizarBloqueios() {
    const bloqueios = getBloqueios();
    const lista = document.getElementById('lista-bloqueios');

    if (!lista) return;

    if (bloqueios.length === 0) {
        lista.innerHTML = '<p style="color: var(--gray-dark); font-style: italic;">Nenhuma data bloqueada</p>';
        return;
    }

    lista.innerHTML = bloqueios.map(b => `
        <div class="bloqueio-item">
            <span>🔒 ${formatarData(b.data)} - ${b.motivo}</span>
            <button onclick="removerBloqueio('${b.data}')">✕</button>
        </div>
    `).join('');
}

function removerBloqueio(data) {
    let bloqueios = getBloqueios();
    bloqueios = bloqueios.filter(b => b.data !== data);
    saveBloqueios(bloqueios);
    renderizarBloqueios();
    renderizarCalendario();
}

// ========================================
// PRÓXIMOS EVENTOS
// ========================================

function renderizarProximosEventos() {
    const pedidos = getPedidos();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximos = pedidos
        .filter(p => {
            const data = converterDataObj(p.evento.data);
            return data >= hoje && p.status !== 'cancelado';
        })
        .sort((a, b) => {
            const dataA = converterDataObj(a.evento.data);
            const dataB = converterDataObj(b.evento.data);
            return dataA - dataB;
        })
        .slice(0, 5);

    const container = document.getElementById('proximos-eventos');
    if (!container) return;

    if (proximos.length === 0) {
        container.innerHTML = '<p class="sem-dados">Nenhum evento agendado</p>';
        return;
    }

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    container.innerHTML = proximos.map(p => {
        const data = converterDataObj(p.evento.data);
        return `
            <div class="evento-card" onclick="abrirModal('${p.numeroPedido}')">
                <div class="evento-data-box">
                    <div class="dia">${data.getDate()}</div>
                    <div class="mes">${meses[data.getMonth()]}</div>
                </div>
                <div class="evento-info">
                    <strong>${p.cliente.nome}</strong>
                    <span>🕐 ${p.evento.horario} • 👥 ${p.evento.convidados} convidados • 💰 R$ ${p.total.toFixed(2).replace('.', ',')}</span>
                </div>
                ${getBadge(p.status)}
            </div>`;
    }).join('');
}

// ========================================
// FINANCEIRO
// ========================================

function renderizarFinanceiro() {
    const pedidos = getPedidos();
    const hoje = new Date();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();

    // Faturamento do mês
    const fatMes = pedidos
        .filter(p => {
            const data = converterDataObj(p.evento.data);
            return data &&
                data.getMonth() === mesHoje &&
                data.getFullYear() === anoHoje &&
                p.status !== 'cancelado';
        })
        .reduce((acc, p) => acc + (p.total || 0), 0);

    // Faturamento total
    const fatTotal = pedidos
        .filter(p => p.status !== 'cancelado')
        .reduce((acc, p) => acc + (p.total || 0), 0);

    // Aguardando pagamento
    const fatPendente = pedidos
        .filter(p => p.status === 'pendente')
        .reduce((acc, p) => acc + (p.total || 0), 0);

    // Ticket médio
    const pedidosValidos = pedidos.filter(p => p.status !== 'cancelado');
    const ticketMedio = pedidosValidos.length > 0
        ? fatTotal / pedidosValidos.length
        : 0;

    const fmt = v => `R$ ${v.toFixed(2).replace('.', ',')}`;

    document.getElementById('fat-mes').textContent = fmt(fatMes);
    document.getElementById('fat-total').textContent = fmt(fatTotal);
    document.getElementById('fat-pendente').textContent = fmt(fatPendente);
    document.getElementById('ticket-medio').textContent = fmt(ticketMedio);

    filtrarFinanceiro();
}

function filtrarFinanceiro() {
    const pedidos = getPedidos();
    const filtroMes = document.getElementById('filtro-mes-fin')?.value;

    let filtrados = pedidos.filter(p => p.status !== 'cancelado');

    if (filtroMes !== 'todos') {
        filtrados = filtrados.filter(p => {
            const data = converterDataObj(p.evento.data);
            return data && data.getMonth() === parseInt(filtroMes);
        });
    }

    const tbody = document.getElementById('tbody-financeiro');

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhum registro encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = [...filtrados].reverse().map(p => `
        <tr>
            <td><strong>#${p.numeroPedido}</strong></td>
            <td>${p.cliente.nome}</td>
            <td>${p.evento.data}</td>
            <td>${p.pagamento.toUpperCase()}</td>
            <td><strong>R$ ${p.total.toFixed(2).replace('.', ',')}</strong></td>
            <td>${getBadge(p.status)}</td>
        </tr>
    `).join('');
}

// ========================================
// CONFIGURAÇÕES
// ========================================

function alterarSenha() {
    const atual = document.getElementById('senha-atual').value;
    const nova = document.getElementById('senha-nova').value;
    const confirmar = document.getElementById('senha-confirmar').value;
    const config = getConfig();

    if (atual !== config.senha) {
        alert('❌ Senha atual incorreta!');
        return;
    }

    if (!nova || nova.length < 4) {
        alert('❌ A nova senha deve ter pelo menos 4 caracteres!');
        return;
    }

    if (nova !== confirmar) {
        alert('❌ As senhas não coincidem!');
        return;
    }

    config.senha = nova;
    saveConfig(config);

    alert('✅ Senha alterada com sucesso!');
    document.getElementById('senha-atual').value = '';
    document.getElementById('senha-nova').value = '';
    document.getElementById('senha-confirmar').value = '';
}

function salvarPrecos() {
    const precos = {
        garcom: parseFloat(document.getElementById('preco-garcom').value) || 180,
        copeira: parseFloat(document.getElementById('preco-copeira').value) || 160,
        fritadeira: parseFloat(document.getElementById('preco-fritadeira').value) || 150,
        churrasqueiro: parseFloat(document.getElementById('preco-churrasqueiro').value) || 220,
        monitora: parseFloat(document.getElementById('preco-monitora').value) || 140,
        recepcionista: parseFloat(document.getElementById('preco-recepcionista').value) || 160,
                pipoca: parseFloat(document.getElementById('preco-pipoca').value) || 120,
        algodao: parseFloat(document.getElementById('preco-algodao').value) || 130,
        acai: parseFloat(document.getElementById('preco-acai').value) || 200,
        sorvete: parseFloat(document.getElementById('preco-sorvete').value) || 180,
        batata: parseFloat(document.getElementById('preco-batata').value) || 150,
        crepe: parseFloat(document.getElementById('preco-crepe').value) || 160,
        suco: parseFloat(document.getElementById('preco-suco').value) || 140
    };

    const config = getConfig();
    config.precos = precos;
    saveConfig(config);

    alert('✅ Preços salvos com sucesso!');
}

function salvarConfiguracoes() {
    const config = getConfig();

    config.whatsapp = document.getElementById('config-whatsapp').value;
    config.email = document.getElementById('config-email').value;
    config.pix = document.getElementById('config-pix').value;
    config.maxEventosPorDia = parseInt(document.getElementById('config-max-eventos').value) || 5;

    saveConfig(config);
    alert('✅ Configurações salvas com sucesso!');
}

// ========================================
// HELPERS - CONVERSÃO DE DATAS
// ========================================

// Converter dd/mm/yyyy para yyyy-mm-dd
function converterData(dataStr) {
    if (!dataStr) return null;
    if (dataStr.includes('/')) {
        const parts = dataStr.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return dataStr;
}

// Converter dd/mm/yyyy para objeto Date
function converterDataObj(dataStr) {
    if (!dataStr) return null;
    try {
        if (dataStr.includes('/')) {
            const parts = dataStr.split('/');
            return new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
            );
        }
        if (dataStr.includes('-')) {
            const parts = dataStr.split('-');
            return new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2])
            );
        }
    } catch (e) {
        return null;
    }
    return null;
}

// Formatar yyyy-mm-dd para dd/mm/yyyy
function formatarData(dataStr) {
    if (!dataStr) return '';
    if (dataStr.includes('-')) {
        const parts = dataStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dataStr;
}

// ========================================
// HELPER - PREÇO DO SERVIÇO
// ========================================

function getPreco(servico) {
    const config = getConfig();
    const precos = config.precos || {
        garcom: 180,
        copeira: 160,
        fritadeira: 150,
        churrasqueiro: 220,
        monitora: 140,
        recepcionista: 160
    };
    return precos[servico] || 0;
}

// ========================================
// RECEBER PEDIDOS DO SITE
// ========================================

// Esta função é chamada pelo site quando um pedido é feito
// Salva o pedido no localStorage para o admin visualizar
window.salvarPedidoAdmin = function(pedido) {
    const pedidos = getPedidos();
    pedidos.push(pedido);
    savePedidos(pedidos);
};

// ========================================
// DADOS DE TESTE (REMOVER EM PRODUÇÃO)
// ========================================

function gerarDadosTeste() {
    const pedidosTeste = [
        {
            numeroPedido: 'LM001',
            cliente: {
                nome: 'Maria Silva',
                whatsapp: '(21) 9 9999-1111',
                email: 'maria@email.com',
                cpf: '123.456.789-00'
            },
            evento: {
                data: '20/07/2025',
                horario: '18:00',
                duracao: '6',
                endereco: 'Rua das Flores, 100 - Copacabana, RJ',
                convidados: '80'
            },
            equipe: {
                garcom: 3,
                copeira: 1,
                fritadeira: 1,
                churrasqueiro: 0,
                monitora: 0,
                recepcionista: 0
            },
            estacoes: {
                pipoca: 120,
                algodao: 130
            },
            pagamento: 'pix',
            total: 1040,
            status: 'confirmado',
            dataPedido: new Date().toISOString()
        },
        {
            numeroPedido: 'LM002',
            cliente: {
                nome: 'João Santos',
                whatsapp: '(21) 9 8888-2222',
                email: 'joao@email.com',
                cpf: '987.654.321-00'
            },
            evento: {
                data: '25/07/2025',
                horario: '19:00',
                duracao: '8',
                endereco: 'Av. Atlântica, 500 - Ipanema, RJ',
                convidados: '150'
            },
            equipe: {
                garcom: 6,
                copeira: 2,
                fritadeira: 1,
                churrasqueiro: 1,
                monitora: 0,
                recepcionista: 1
            },
            estacoes: {
                acai: 200,
                sorvete: 180,
                crepe: 160
            },
            pagamento: 'credito',
            total: 2580,
            status: 'pendente',
            dataPedido: new Date().toISOString()
        },
        {
            numeroPedido: 'LM003',
            cliente: {
                nome: 'Ana Oliveira',
                whatsapp: '(21) 9 7777-3333',
                email: 'ana@email.com',
                cpf: '456.789.123-00'
            },
            evento: {
                data: '10/07/2025',
                horario: '16:00',
                duracao: '4',
                endereco: 'Rua do Catete, 200 - Catete, RJ',
                convidados: '40'
            },
            equipe: {
                garcom: 2,
                copeira: 1,
                fritadeira: 0,
                churrasqueiro: 0,
                monitora: 0,
                recepcionista: 0
            },
            estacoes: {
                pipoca: 120
            },
            pagamento: 'debito',
            total: 640,
            status: 'concluido',
            dataPedido: new Date().toISOString()
        }
    ];

    // Só adicionar se não tiver pedidos ainda
    const pedidosExistentes = getPedidos();
    if (pedidosExistentes.length === 0) {
        savePedidos(pedidosTeste);
    }
}

// ========================================
// INICIALIZAR
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Gerar dados de teste
    gerarDadosTeste();

    // Atualizar data atual
    atualizarDataAtual();

    console.log('🎉 L&M Admin - Sistema iniciado!');
    console.log('👤 Usuário: lenice');
    console.log('🔑 Senha: lm2025');
});

// ========================================
// GERENCIAR FOTOS DOS CARROSSEIS
// ========================================

// Chaves do localStorage para as fotos
var FOTOS_KEYS = {
    avaliacoes: 'lm_fotos_avaliacoes',
    eventos: 'lm_fotos_eventos',
    estacoes: 'lm_fotos_estacoes'
};

// Nomes padrão das fotos (caso não tenha no localStorage)
var FOTOS_PADRAO = {
    avaliacoes: [
        'imagem/imagem-1.jpg',
        'imagem/imagem-2.jpg',
        'imagem/imagem-3.jpg',
        'imagem/imagem-4.jpg'
    ],
    eventos: [
        'imagem/evento-1.jpg',
        'imagem/evento-2.jpg',
        'imagem/evento-3.jpg',
        'imagem/evento-4.jpg',
        'imagem/evento-5.jpg',
        'imagem/evento-6.jpg',
        'imagem/evento-7.jpg',
        'imagem/evento-8.jpg',
        'imagem/evento-9.jpg',
        'imagem/evento-10.jpg',
        'imagem/evento-11.jpg',
        'imagem/evento-12.jpg',
        'imagem/evento-13.jpg'
    ],
    estacoes: [
        'imagem/estaçao-1.jpg',
        'imagem/estaçao-2.jpg',
        'imagem/estaçao-3.jpg',
        'imagem/estaçao-4.jpg'
    ]
};

function getFotos(tipo) {
    try {
        var salvas = localStorage.getItem(FOTOS_KEYS[tipo]);
        if (salvas) return JSON.parse(salvas);
        return FOTOS_PADRAO[tipo] || [];
    } catch(e) {
        return FOTOS_PADRAO[tipo] || [];
    }
}

function saveFotos(tipo, fotos) {
    localStorage.setItem(FOTOS_KEYS[tipo], JSON.stringify(fotos));
}

function renderizarFotos(tipo) {
    var grid = document.getElementById('grid-' + tipo);
    if (!grid) return;

    var fotos = getFotos(tipo);

    if (fotos.length === 0) {
        grid.innerHTML = '<div class="fotos-vazio">📷 Nenhuma foto adicionada ainda</div>';
        return;
    }

    grid.innerHTML = fotos.map(function(src, index) {
        return '<div class="foto-item">' +
            '<span class="foto-num">' + (index + 1) + '</span>' +
            '<img src="' + src + '" alt="Foto ' + (index + 1) + '" onerror="this.src=\'imagem/logo-2.png\'">' +
            '<div class="foto-overlay">' +
                '<button class="btn-remover-foto" onclick="removerFoto(\'' + tipo + '\', ' + index + ')">🗑️ Remover</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function adicionarFotos(tipo, input) {
    var files = input.files;
    if (!files || files.length === 0) return;

    var fotos = getFotos(tipo);
    var processados = 0;
    var total = files.length;

    for (var i = 0; i < files.length; i++) {
        (function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                fotos.push(e.target.result);
                processados++;

                if (processados === total) {
                    saveFotos(tipo, fotos);
                    renderizarFotos(tipo);
                    atualizarCarrosselSite(tipo, fotos);
                    alert('✅ ' + total + ' foto(s) adicionada(s) com sucesso!');
                }
            };
            reader.readAsDataURL(file);
        })(files[i]);
    }

    // Limpar input
    input.value = '';
}

function removerFoto(tipo, index) {
    if (!confirm('Deseja remover esta foto?')) return;

    var fotos = getFotos(tipo);
    fotos.splice(index, 1);
    saveFotos(tipo, fotos);
    renderizarFotos(tipo);
    atualizarCarrosselSite(tipo, fotos);
    alert('✅ Foto removida com sucesso!');
}

function atualizarCarrosselSite(tipo, fotos) {
    // Mapear tipo para ID do slider no site
    var sliderIds = {
        avaliacoes: 'avalSlider',
        eventos: 'eventosSlider',
        estacoes: 'estacoesSlider'
    };

    var sliderId = sliderIds[tipo];
    var slider = document.getElementById(sliderId);
    if (!slider) return;

    // Atualizar imagens do carrossel
    slider.innerHTML = fotos.map(function(src, i) {
        return '<img src="' + src + '" alt="Foto ' + (i + 1) + '">';
    }).join('');
}

function inicializarFotos() {
    renderizarFotos('avaliacoes');
    renderizarFotos('eventos');
    renderizarFotos('estacoes');
}

// Inicializar quando a aba de fotos for aberta
document.addEventListener('DOMContentLoaded', function() {
    inicializarFotos();
});