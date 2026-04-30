/* ========================================
   L&M ARTES E FESTAS - SCRIPT.JS (SEGURO)
   ======================================== */

var precos = {};
var datasOcupadas = [];
var chavePix = '';
var numeroWhatsApp = '';

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

var quantidades = {
    garcom: 0,
    copeira: 0,
    fritadeira: 0,
    churrasqueiro: 0,
    monitora: 0,
    recepcionista: 0
};

var estacoesSelecionadas = {};
var pagamentoSelecionado = '';

window.addEventListener('load', function () {
    carregarConfiguracoes();

    var menuToggle = document.querySelector('.menu-toggle');
    var navbar = document.getElementById('navbar');

    if (menuToggle && navbar) {
        menuToggle.addEventListener('click', function () {
            navbar.classList.toggle('open');
        });
        document.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('click', function () {
                navbar.classList.remove('open');
            });
        });
    }

    window.addEventListener('scroll', function () {
        var header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.background = 'rgba(26, 26, 46, 1)';
            header.style.boxShadow = '0 2px 30px rgba(0,0,0,0.5)';
        } else {
            header.style.background = 'rgba(26, 26, 46, 0.97)';
            header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.3)';
        }
    });

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.servico-card, .sugestao-box').forEach(function (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    var elWhats = document.getElementById('p-whatsapp');
    if (elWhats) {
        elWhats.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '');
            v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
            v = v.replace(/(\d)(\d{4})$/, '$1-$2');
            this.value = v;
        });
    }

    var elCpf = document.getElementById('p-cpf');
    if (elCpf) {
        elCpf.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            this.value = v;
        });
    }

    var elCard = document.getElementById('card-numero');
    if (elCard) {
        elCard.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '');
            v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
            this.value = v;
        });
    }

    var elValidade = document.getElementById('card-validade');
    if (elValidade) {
        elValidade.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '');
            v = v.replace(/(\d{2})(\d)/, '$1/$2');
            this.value = v;
        });
    }

    var urlParams = new URLSearchParams(window.location.search);
    var statusPagamento = urlParams.get('pagamento');
    if (statusPagamento === 'sucesso') {
        alert('Pagamento aprovado com sucesso! Em breve entraremos em contato.');
    } else if (statusPagamento === 'erro') {
        alert('Pagamento nao foi aprovado. Tente novamente ou entre em contato.');
    } else if (statusPagamento === 'pendente') {
        alert('Pagamento pendente. Assim que for confirmado, entraremos em contato!');
    }
});

async function carregarConfiguracoes() {
    try {
        var config = await API.config.listar();

        precos = {
            garcom: parseFloat(config.preco_garcom) || 180,
            copeira: parseFloat(config.preco_copeira) || 160,
            fritadeira: parseFloat(config.preco_fritadeira) || 150,
            churrasqueiro: parseFloat(config.preco_churrasqueiro) || 220,
            monitora: parseFloat(config.preco_monitora) || 140,
            recepcionista: parseFloat(config.preco_recepcionista) || 160,
            pipoca: parseFloat(config.preco_pipoca) || 120,
            algodao: parseFloat(config.preco_algodao) || 130,
            acai: parseFloat(config.preco_acai) || 200,
            sorvete: parseFloat(config.preco_sorvete) || 180,
            batata: parseFloat(config.preco_batata) || 150,
            crepe: parseFloat(config.preco_crepe) || 160,
            suco: parseFloat(config.preco_suco) || 140
        };

        chavePix = config.pix || '';
        numeroWhatsApp = config.whatsapp || '5521985412860';

        atualizarPrecosTela();
        atualizarChavePix();
        showStep(1);
        buscarDatasOcupadas(config.max_eventos_por_dia || 5);
        carregarFotosServidor();
    } catch (e) {
        console.error('Erro ao carregar config:', e);
        showStep(1);
        buscarDatasOcupadas(5);
    }
}

function atualizarChavePix() {
    var elChave = document.querySelector('.pix-chave strong');
    if (elChave && chavePix) elChave.textContent = chavePix;
}

async function carregarFotosServidor() {
    var tipos = {
        avaliacoes: 'avalSlider',
        eventos: 'eventosSlider',
        estacoes: 'estacoesSlider'
    };

    for (var tipo in tipos) {
        try {
            var fotos = await API.fotos.listar(tipo);
            if (fotos && fotos.length > 0) {
                var slider = document.getElementById(tipos[tipo]);
                if (slider) {
                    slider.innerHTML = fotos.map(function (f, i) {
                        return '<img src="' + f.caminho + '" alt="Foto ' + (i + 1) + '">';
                    }).join('');
                }
            }
        } catch (e) {
        }
    }

    iniciarCarrosseis();
}

function iniciarCarrosseis() {
    function carrossel(sliderId, esqId, dirId, autoPlay) {
        var slider = document.getElementById(sliderId);
        var esq = document.getElementById(esqId);
        var dir = document.getElementById(dirId);
        if (!slider || !esq || !dir) return;

        var imgs = slider.getElementsByTagName('img');
        var total = imgs.length;
        if (total === 0) return;
        var atual = 0;

        for (var i = 0; i < imgs.length; i++) {
            imgs[i].style.minWidth = '100%';
            imgs[i].style.height = '450px';
            imgs[i].style.objectFit = 'contain';
            imgs[i].style.objectPosition = 'center';
            imgs[i].style.flexShrink = '0';
            imgs[i].style.display = 'block';
            imgs[i].style.background = '#1a1a2e';
        }

        slider.style.display = 'flex';
        slider.style.transition = 'transform 0.5s ease';

        function ir(n) {
            if (n < 0) n = total - 1;
            if (n >= total) n = 0;
            atual = n;
            slider.style.transform = 'translateX(-' + (atual * 100) + '%)';
        }

        esq.onclick = function (e) { e.preventDefault(); ir(atual - 1); };
        dir.onclick = function (e) { e.preventDefault(); ir(atual + 1); };
        ir(0);

        if (autoPlay) {
            setInterval(function () { ir(atual + 1); }, 4000);
        }
    }

    carrossel('avalSlider', 'avalEsq', 'avalDir', false);
    carrossel('eventosSlider', 'eventosEsq', 'eventosDir', true);
    carrossel('estacoesSlider', 'estacoesEsq', 'estacoesDir', true);
}

async function buscarDatasOcupadas(maxPorDia) {
    try {
        datasOcupadas = await API.pedidos.datasOcupadas(maxPorDia || 5);
    } catch (e) {
        datasOcupadas = [];
    }
    iniciarFlatpickr();
}

function iniciarFlatpickr() {
    var elData = document.getElementById('p-data');
    if (!elData) return;

    flatpickr(elData, {
        locale: "pt",
        minDate: "today",
        dateFormat: "d/m/Y",
        disable: [
            function (date) {
                var iso = date.toISOString().split('T')[0];
                return datasOcupadas.indexOf(iso) !== -1;
            }
        ],
        onChange: function (selectedDates, dateStr) {
            var status = document.getElementById('data-status');
            if (!status) return;
            var iso = converterParaISO(dateStr);
            if (datasOcupadas.indexOf(iso) !== -1) {
                status.textContent = 'Data indisponivel!';
                status.className = 'indisponivel';
            } else {
                status.textContent = 'Data disponivel!';
                status.className = 'disponivel';
            }
        }
    });
}

function converterParaISO(dataStr) {
    if (!dataStr) return null;
    if (dataStr.indexOf('/') !== -1) {
        var parts = dataStr.split('/');
        if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    return dataStr;
}

function atualizarPrecosTela() {
    var profissionais = ['garcom', 'copeira', 'fritadeira', 'churrasqueiro', 'monitora', 'recepcionista'];
    var estacoes = ['pipoca', 'algodao', 'acai', 'sorvete', 'batata', 'crepe', 'suco'];

    profissionais.forEach(function (servico) {
        if (precos[servico] !== undefined) {
            var elemento = document.querySelector('[data-servico="' + servico + '"] .servico-preco');
            if (elemento) {
                elemento.textContent = 'R$ ' + precos[servico].toFixed(2).replace('.', ',') + '/evento';
            }
        }
    });

    estacoes.forEach(function (estacao) {
        if (precos[estacao] !== undefined) {
            var elemento = document.querySelector('[data-estacao="' + estacao + '"] .est-preco');
            if (elemento) {
                elemento.textContent = 'R$ ' + precos[estacao].toFixed(2).replace('.', ',');
            }
        }
    });
}

function changeQty(servico, delta) {
    quantidades[servico] = Math.max(0, quantidades[servico] + delta);
    document.getElementById('qty-' + servico).textContent = quantidades[servico];
}

function toggleEstacao(estacao) {
    if (estacoesSelecionadas[estacao]) {
        delete estacoesSelecionadas[estacao];
    } else {
        estacoesSelecionadas[estacao] = precos[estacao] || 0;
    }
}

function showStep(step) {
    document.querySelectorAll('.pedido-step').forEach(function (s) {
        s.classList.add('hidden');
    });

    var stepEl = document.getElementById('step-' + step);
    if (stepEl) stepEl.classList.remove('hidden');

    for (var i = 1; i <= 5; i++) {
        var ind = document.getElementById('step-indicator-' + i);
        if (!ind) continue;
        ind.classList.remove('active', 'completed');
        if (i < step) ind.classList.add('completed');
        if (i === step) ind.classList.add('active');
    }

    var pedidoEl = document.getElementById('pedido');
    if (pedidoEl) {
        pedidoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function nextStep(step) {
    if (!validarStep(step)) return;
    if (step === 4) gerarResumo();
    showStep(step + 1);
}

function prevStep(step) {
    showStep(step - 1);
}

function validarStep(step) {
    if (step === 1) {
        var nome = document.getElementById('p-nome').value.trim();
        var whatsapp = document.getElementById('p-whatsapp').value.trim();
        var email = document.getElementById('p-email').value.trim();
        var cpf = document.getElementById('p-cpf').value.trim();

        if (!nome) { alert('Por favor, informe seu nome completo!'); return false; }
        if (!whatsapp) { alert('Por favor, informe seu WhatsApp!'); return false; }
        if (!email || email.indexOf('@') === -1) { alert('Por favor, informe um e-mail valido!'); return false; }
        if (!cpf) { alert('Por favor, informe seu CPF!'); return false; }
    }

    if (step === 2) {
        var data = document.getElementById('p-data').value.trim();
        var horario = document.getElementById('p-horario').value.trim();
        var endereco = document.getElementById('p-endereco').value.trim();
        var convidados = document.getElementById('p-convidados').value.trim();
        var status = document.getElementById('data-status');

        if (!data) { alert('Por favor, selecione a data do evento!'); return false; }
        if (status && status.classList.contains('indisponivel')) {
            alert('Esta data esta indisponivel!');
            return false;
        }
        if (!horario) { alert('Por favor, informe o horario do evento!'); return false; }
        if (!endereco) { alert('Por favor, informe o endereco do evento!'); return false; }
        if (!convidados || parseInt(convidados) <= 0) { alert('Por favor, informe o numero de convidados!'); return false; }
    }

    if (step === 3) {
        var total = 0;
        Object.keys(quantidades).forEach(function (k) { total += quantidades[k]; });
        if (total === 0) { alert('Por favor, selecione pelo menos 1 profissional!'); return false; }
    }

    return true;
}

function calcularTotal() {
    var total = 0;
    Object.keys(quantidades).forEach(function (servico) {
        total += precos[servico] * quantidades[servico];
    });
    Object.keys(estacoesSelecionadas).forEach(function (est) {
        total += estacoesSelecionadas[est];
    });
    return total;
}

function gerarResumo() {
    var resumo = document.getElementById('resumo-pedido');
    var html = '';

    html += '<div class="resumo-secao">Dados do Cliente</div>';
    html += '<div class="resumo-item"><span>Nome</span><span>' + escapeHtml(document.getElementById('p-nome').value) + '</span></div>';
    html += '<div class="resumo-item"><span>WhatsApp</span><span>' + escapeHtml(document.getElementById('p-whatsapp').value) + '</span></div>';
    html += '<div class="resumo-item"><span>E-mail</span><span>' + escapeHtml(document.getElementById('p-email').value) + '</span></div>';

    html += '<div class="resumo-secao">Dados do Evento</div>';
    html += '<div class="resumo-item"><span>Data</span><span>' + escapeHtml(document.getElementById('p-data').value) + '</span></div>';
    html += '<div class="resumo-item"><span>Horario</span><span>' + escapeHtml(document.getElementById('p-horario').value) + '</span></div>';
    html += '<div class="resumo-item"><span>Duracao</span><span>' + escapeHtml(document.getElementById('p-duracao').value) + 'h</span></div>';
    html += '<div class="resumo-item"><span>Endereco</span><span>' + escapeHtml(document.getElementById('p-endereco').value) + '</span></div>';
    html += '<div class="resumo-item"><span>Convidados</span><span>' + escapeHtml(document.getElementById('p-convidados').value) + '</span></div>';

    var temMaoDeObra = false;
    Object.keys(quantidades).forEach(function (k) { if (quantidades[k] > 0) temMaoDeObra = true; });

    if (temMaoDeObra) {
        html += '<div class="resumo-secao">Mao de Obra</div>';
        Object.keys(quantidades).forEach(function (servico) {
            var qty = quantidades[servico];
            if (qty > 0) {
                var subtotal = precos[servico] * qty;
                html += '<div class="resumo-item"><span>' + qty + 'x ' + nomesServicos[servico] + '</span><span>R$ ' + subtotal.toFixed(2).replace('.', ',') + '</span></div>';
            }
        });
    }

    if (Object.keys(estacoesSelecionadas).length > 0) {
        html += '<div class="resumo-secao">Estacoes</div>';
        Object.keys(estacoesSelecionadas).forEach(function (est) {
            var preco = estacoesSelecionadas[est];
            html += '<div class="resumo-item"><span>' + nomesEstacoes[est] + '</span><span>R$ ' + preco.toFixed(2).replace('.', ',') + '</span></div>';
        });
    }

    resumo.innerHTML = html;
    document.getElementById('total-valor').textContent = 'R$ ' + calcularTotal().toFixed(2).replace('.', ',');
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function selectPagamento(tipo) {
    pagamentoSelecionado = tipo;
    document.querySelectorAll('.pag-opcao').forEach(function (el) { el.classList.remove('selected'); });
    document.getElementById('pag-' + tipo).classList.add('selected');
    document.querySelectorAll('.pag-detalhe').forEach(function (el) { el.classList.add('hidden'); });

    if (tipo === 'pix') {
        document.getElementById('detalhe-pix').classList.remove('hidden');
    } else {
        document.getElementById('detalhe-cartao').classList.remove('hidden');
        document.getElementById('parcelas-group').style.display = tipo === 'credito' ? 'block' : 'none';
    }
}

function copiarPix() {
    if (!chavePix) { alert('Chave PIX nao configurada'); return; }
    navigator.clipboard.writeText(chavePix).then(function () {
        var btn = document.querySelector('.btn-copiar');
        btn.textContent = 'Chave Copiada!';
        setTimeout(function () { btn.textContent = 'Copiar Chave PIX'; }, 3000);
    });
}

async function finalizarPedido() {
    if (!pagamentoSelecionado) {
        alert('Por favor, selecione uma forma de pagamento!');
        return;
    }

    var pedido = {
        cliente: {
            nome: document.getElementById('p-nome').value,
            whatsapp: document.getElementById('p-whatsapp').value,
            email: document.getElementById('p-email').value,
            cpf: document.getElementById('p-cpf').value
        },
        evento: {
            data: document.getElementById('p-data').value,
            horario: document.getElementById('p-horario').value,
            duracao: document.getElementById('p-duracao').value,
            endereco: document.getElementById('p-endereco').value,
            convidados: document.getElementById('p-convidados').value
        },
        equipe: {
            garcom: quantidades.garcom,
            copeira: quantidades.copeira,
            fritadeira: quantidades.fritadeira,
            churrasqueiro: quantidades.churrasqueiro,
            monitora: quantidades.monitora,
            recepcionista: quantidades.recepcionista
        },
        estacoes: estacoesSelecionadas,
        pagamento: pagamentoSelecionado,
        total: calcularTotal()
    };

    try {
        var btnPagar = document.querySelector('.btn-finalizar');
        if (btnPagar) {
            btnPagar.disabled = true;
            btnPagar.textContent = 'Processando...';
        }

        var resultado = await API.pedidos.criar(pedido);
        var numeroPedido = resultado.numeroPedido;

        if (pagamentoSelecionado === 'pix') {
            mostrarSucesso(numeroPedido);
            enviarWhatsApp(pedido, numeroPedido);
            return;
        }

        if (pagamentoSelecionado === 'credito' || pagamentoSelecionado === 'debito') {
            try {
                var pagResult = await API.pagamento.criarLinkPedido(numeroPedido, pagamentoSelecionado);
                enviarWhatsApp(pedido, numeroPedido);
                window.location.href = pagResult.link;
            } catch (err) {
                mostrarSucesso(numeroPedido);
                enviarWhatsApp(pedido, numeroPedido);
            }
            return;
        }
    } catch (err) {
        alert('Erro ao criar pedido: ' + err.message);
        var btnPagar = document.querySelector('.btn-finalizar');
        if (btnPagar) {
            btnPagar.disabled = false;
            btnPagar.textContent = 'Finalizar Pedido';
        }
    }
}

function mostrarSucesso(numeroPedido) {
    document.querySelectorAll('.pedido-step').forEach(function (s) { s.classList.add('hidden'); });
    var stepsEl = document.querySelector('.steps');
    if (stepsEl) stepsEl.style.display = 'none';
    document.getElementById('step-sucesso').classList.remove('hidden');
    document.getElementById('sucesso-num').textContent = 'Numero do Pedido: #' + numeroPedido;
}

function enviarWhatsApp(pedido, numeroPedido) {
    var total = pedido.total.toFixed(2).replace('.', ',');
    var equipeTexto = '';
    Object.keys(pedido.equipe).forEach(function (servico) {
        var qty = pedido.equipe[servico];
        if (qty > 0) equipeTexto += '  - ' + qty + 'x ' + nomesServicos[servico] + '\n';
    });

    var estacoesTexto = '';
    Object.keys(pedido.estacoes).forEach(function (est) { estacoesTexto += '  - ' + nomesEstacoes[est] + '\n'; });
    if (!estacoesTexto) estacoesTexto = '  - Nenhuma estacao\n';

    var mensagem = 'NOVO PEDIDO - L&M Artes e Festas\n';
    mensagem += '\n';
    mensagem += 'Pedido: #' + numeroPedido + '\n\n';
    mensagem += 'CLIENTE\n';
    mensagem += '- Nome: ' + pedido.cliente.nome + '\n';
    mensagem += '- WhatsApp: ' + pedido.cliente.whatsapp + '\n';
    mensagem += '- E-mail: ' + pedido.cliente.email + '\n\n';
    mensagem += 'EVENTO\n';
    mensagem += '- Data: ' + pedido.evento.data + '\n';
    mensagem += '- Horario: ' + pedido.evento.horario + '\n';
    mensagem += '- Duracao: ' + pedido.evento.duracao + 'h\n';
    mensagem += '- Endereco: ' + pedido.evento.endereco + '\n';
    mensagem += '- Convidados: ' + pedido.evento.convidados + '\n\n';
    mensagem += 'EQUIPE\n' + equipeTexto + '\n';
    mensagem += 'ESTACOES\n' + estacoesTexto + '\n';
    mensagem += 'PAGAMENTO\n';
    mensagem += '- Forma: ' + pedido.pagamento.toUpperCase() + '\n';
    mensagem += '- Total: R$ ' + total + '\n';

    var whatsNum = numeroWhatsApp || '5521985412860';
    var url = 'https://wa.me/' + whatsNum + '?text=' + encodeURIComponent(mensagem);
    window.open(url, '_blank');
}

function novoPedido() {
    quantidades = { garcom: 0, copeira: 0, fritadeira: 0, churrasqueiro: 0, monitora: 0, recepcionista: 0 };
    estacoesSelecionadas = {};
    pagamentoSelecionado = '';

    document.getElementById('p-nome').value = '';
    document.getElementById('p-whatsapp').value = '';
    document.getElementById('p-email').value = '';
    document.getElementById('p-cpf').value = '';
    document.getElementById('p-data').value = '';
    document.getElementById('p-horario').value = '';
    document.getElementById('p-endereco').value = '';
    document.getElementById('p-convidados').value = '';

    Object.keys(quantidades).forEach(function (s) {
        var el = document.getElementById('qty-' + s);
        if (el) el.textContent = '0';
    });

    document.querySelectorAll('.estacao-item input').forEach(function (cb) { cb.checked = false; });

    var stepsEl = document.querySelector('.steps');
    if (stepsEl) stepsEl.style.display = 'flex';
    showStep(1);
}

function enviarReserva(event) {
    event.preventDefault();

    var nome = document.getElementById('r-nome').value;
    var whatsapp = document.getElementById('r-whatsapp').value;
    var data = document.getElementById('r-data').value;
    var convidados = document.getElementById('r-convidados').value;
    var mensagem = document.getElementById('r-mensagem').value;

    var texto = 'Ola! Gostaria de fazer uma reserva!\n\n';
    texto += 'Nome: ' + nome + '\n';
    texto += 'WhatsApp: ' + whatsapp + '\n';
    texto += 'Data: ' + data + '\n';
    texto += 'Convidados: ' + convidados + '\n';
    texto += 'Mensagem: ' + mensagem;

    var whatsNum = numeroWhatsApp || '5521985412860';
    var url = 'https://wa.me/' + whatsNum + '?text=' + encodeURIComponent(texto);
    window.open(url, '_blank');

    document.getElementById('reservaForm').reset();
    alert('Mensagem enviada! Em breve entraremos em contato!');
}
