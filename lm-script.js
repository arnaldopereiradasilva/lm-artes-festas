/* ========================================
   L&M ARTES E FESTAS - SCRIPT.JS
   ======================================== */

window.addEventListener('load', function () {
    // Carregar fotos salvas ANTES de iniciar carrosseis
    carregarFotosSalvas();

    // ========================================
    // MENU TOGGLE
    // ========================================

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

    // ========================================
    // CARREGAR FOTOS DOS CARROSSEIS
    // ========================================

    function carregarFotosSalvas() {
        var tipos = {
            avaliacoes: { key: 'lm_fotos_avaliacoes', slider: 'avalSlider' },
            eventos: { key: 'lm_fotos_eventos', slider: 'eventosSlider' },
            estacoes: { key: 'lm_fotos_estacoes', slider: 'estacoesSlider' }
        };

        Object.keys(tipos).forEach(function (tipo) {
            var config = tipos[tipo];
            try {
                var salvas = localStorage.getItem(config.key);
                if (!salvas) return;

                var fotos = JSON.parse(salvas);
                if (!fotos || fotos.length === 0) return;

                var slider = document.getElementById(config.slider);
                if (!slider) return;

                slider.innerHTML = fotos.map(function (src, i) {
                    return '<img src="' + src + '" alt="Foto ' + (i + 1) + '">';
                }).join('');

            } catch (e) {
                console.log('Erro ao carregar fotos:', tipo);
            }
        });
    }


    // ========================================
    // CARROSSEIS
    // ========================================

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

        esq.onclick = function (e) {
            e.preventDefault();
            ir(atual - 1);
        };

        dir.onclick = function (e) {
            e.preventDefault();
            ir(atual + 1);
        };

        ir(0);

        if (autoPlay) {
            setInterval(function () { ir(atual + 1); }, 4000);
        }
    }

    // Avaliações SEM autoplay
    carrossel('avalSlider', 'avalEsq', 'avalDir', false);

    // Eventos e Estações COM autoplay
    carrossel('eventosSlider', 'eventosEsq', 'eventosDir', true);
    carrossel('estacoesSlider', 'estacoesEsq', 'estacoesDir', true);

    // ========================================
    // HEADER SCROLL
    // ========================================

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

    // ========================================
    // ANIMAÇÕES AO SCROLL
    // ========================================

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

    // ========================================
    // INICIALIZAR PEDIDO
    // ========================================

    showStep(1);
    buscarDatasOcupadas();

    // ========================================
    // MÁSCARAS
    // ========================================

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

    console.log('✅ L&M Artes e Festas - Sistema iniciado!');
});

// ========================================
// FLATPICKR
// ========================================

var datasOcupadas = [];

function buscarDatasOcupadas() {
    try {
        var pedidos = JSON.parse(localStorage.getItem('lm_pedidos') || '[]');
        var contagem = {};

        pedidos.forEach(function (p) {
            if (p.status !== 'cancelado') {
                var data = converterParaISO(p.evento.data);
                if (data) {
                    contagem[data] = (contagem[data] || 0) + 1;
                }
            }
        });

        var bloqueios = JSON.parse(localStorage.getItem('lm_bloqueios') || '[]');
        var config = JSON.parse(localStorage.getItem('lm_config') || '{}');
        var maxPorDia = config.maxEventosPorDia || 5;

        datasOcupadas = [];

        Object.keys(contagem).forEach(function (data) {
            if (contagem[data] >= maxPorDia) {
                datasOcupadas.push(data);
            }
        });

        bloqueios.forEach(function (b) {
            if (datasOcupadas.indexOf(b.data) === -1) {
                datasOcupadas.push(b.data);
            }
        });

        iniciarFlatpickr();

    } catch (e) {
        datasOcupadas = [];
        iniciarFlatpickr();
    }
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
                status.textContent = '❌ Data indisponível!';
                status.className = 'indisponivel';
            } else {
                status.textContent = '✅ Data disponível!';
                status.className = 'disponivel';
            }
        }
    });
}

function converterParaISO(dataStr) {
    if (!dataStr) return null;
    if (dataStr.indexOf('/') !== -1) {
        var parts = dataStr.split('/');
        if (parts.length === 3) {
            return parts[2] + '-' + parts[1] + '-' + parts[0];
        }
    }
    return dataStr;
}

// ========================================
// DADOS DO PEDIDO
// ========================================

// ========================================
// CARREGAR PREÇOS DO PAINEL ADMIN
// ========================================

function carregarPrecosAdmin() {
    try {
        var config = JSON.parse(localStorage.getItem('lm_config') || '{}');
        if (config.precos) {
            return config.precos;
        }
    } catch (e) {
        console.log('Erro ao carregar preços do admin');
    }
    // Valores padrão (se o admin ainda não configurou)
    return {
        garcom: 180,
        copeira: 160,
        fritadeira: 150,
        churrasqueiro: 220,
        monitora: 140,
        recepcionista: 160
    };
}

var precos = carregarPrecosAdmin();

var nomesServicos = {
    garcom: 'Garçom',
    copeira: 'Copeira',
    fritadeira: 'Fritadeira',
    churrasqueiro: 'Churrasqueiro',
    monitora: 'Monitora',
    recepcionista: 'Recepcionista'
};

var nomesEstacoes = {
    pipoca: 'Pipoca',
    algodao: 'Algodão Doce',
    acai: 'Açaí',
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

// ========================================
// QUANTIDADE
// ========================================

function changeQty(servico, delta) {
    quantidades[servico] = Math.max(0, quantidades[servico] + delta);
    document.getElementById('qty-' + servico).textContent = quantidades[servico];
}

// ========================================
// ESTAÇÕES
// ========================================

// ========================================
// ATUALIZAR PREÇOS NA TELA
// ========================================

function atualizarPrecosTela() {
    var config = JSON.parse(localStorage.getItem('lm_config') || '{}');
    
    if (!config.precos) return;
    
    // Lista de profissionais
    var profissionais = ['garcom', 'copeira', 'fritadeira', 'churrasqueiro', 'monitora', 'recepcionista'];
    
    // Lista de estações
    var estacoes = ['pipoca', 'algodao', 'acai', 'sorvete', 'batata', 'crepe', 'suco'];
    
    // Atualizar preços dos profissionais
    profissionais.forEach(function(servico) {
        if (config.precos[servico] !== undefined) {
            var valor = config.precos[servico];
            var elemento = document.querySelector('[data-servico="' + servico + '"] .servico-preco');
            if (elemento) {
                elemento.textContent = 'R$ ' + valor.toFixed(2).replace('.', ',') + '/evento';
            }
        }
    });
    
    // Atualizar preços das estações
    estacoes.forEach(function(estacao) {
        if (config.precos[estacao] !== undefined) {
            var valor = config.precos[estacao];
            var elemento = document.querySelector('[data-estacao="' + estacao + '"] .est-preco');
            if (elemento) {
                elemento.textContent = 'R$ ' + valor.toFixed(2).replace('.', ',');
            }
        }
    });
}

// Chamar a função quando carregar a página
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(atualizarPrecosTela, 100);
});

function toggleEstacao(estacao) {
    if (estacoesSelecionadas[estacao]) {
        delete estacoesSelecionadas[estacao];
    } else {
        // Buscar preço do painel admin
        var config = JSON.parse(localStorage.getItem('lm_config') || '{}');
        var preco = 0;
        
        if (config.precos && config.precos[estacao]) {
            preco = config.precos[estacao];
        } else {
            // Preços padrão (caso admin não tenha configurado)
            var precosPadrao = {
                pipoca: 120,
                algodao: 130,
                acai: 200,
                sorvete: 180,
                batata: 150,
                crepe: 160,
                suco: 140
            };
            preco = precosPadrao[estacao] || 0;
        }
        
        estacoesSelecionadas[estacao] = preco;
    }
}

// ========================================
// NAVEGAÇÃO STEPS
// ========================================

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

// ========================================
// VALIDAÇÃO
// ========================================

function validarStep(step) {
    if (step === 1) {
        var nome = document.getElementById('p-nome').value.trim();
        var whatsapp = document.getElementById('p-whatsapp').value.trim();
        var email = document.getElementById('p-email').value.trim();
        var cpf = document.getElementById('p-cpf').value.trim();

        if (!nome) { alert('Por favor, informe seu nome completo!'); return false; }
        if (!whatsapp) { alert('Por favor, informe seu WhatsApp!'); return false; }
        if (!email || email.indexOf('@') === -1) { alert('Por favor, informe um e-mail válido!'); return false; }
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
            alert('Esta data está indisponível!');
            return false;
        }
        if (!horario) { alert('Por favor, informe o horário do evento!'); return false; }
        if (!endereco) { alert('Por favor, informe o endereço do evento!'); return false; }
        if (!convidados || parseInt(convidados) <= 0) { alert('Por favor, informe o número de convidados!'); return false; }
    }

    if (step === 3) {
        var total = 0;
        Object.keys(quantidades).forEach(function (k) { total += quantidades[k]; });
        if (total === 0) { alert('Por favor, selecione pelo menos 1 profissional!'); return false; }
    }

    return true;
}

// ========================================
// CALCULAR TOTAL
// ========================================

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

// ========================================
// GERAR RESUMO
// ========================================

function gerarResumo() {
    var resumo = document.getElementById('resumo-pedido');
    var html = '';

    html += '<div class="resumo-secao">📋 Dados do Cliente</div>';
    html += '<div class="resumo-item"><span>Nome</span><span>' + document.getElementById('p-nome').value + '</span></div>';
    html += '<div class="resumo-item"><span>WhatsApp</span><span>' + document.getElementById('p-whatsapp').value + '</span></div>';
    html += '<div class="resumo-item"><span>E-mail</span><span>' + document.getElementById('p-email').value + '</span></div>';

    html += '<div class="resumo-secao">📅 Dados do Evento</div>';
    html += '<div class="resumo-item"><span>Data</span><span>' + document.getElementById('p-data').value + '</span></div>';
    html += '<div class="resumo-item"><span>Horário</span><span>' + document.getElementById('p-horario').value + '</span></div>';
    html += '<div class="resumo-item"><span>Duração</span><span>' + document.getElementById('p-duracao').value + 'h</span></div>';
    html += '<div class="resumo-item"><span>Endereço</span><span>' + document.getElementById('p-endereco').value + '</span></div>';
    html += '<div class="resumo-item"><span>Convidados</span><span>' + document.getElementById('p-convidados').value + '</span></div>';

    var temMaoDeObra = false;
    Object.keys(quantidades).forEach(function (k) {
        if (quantidades[k] > 0) temMaoDeObra = true;
    });

    if (temMaoDeObra) {
        html += '<div class="resumo-secao">🤵 Mão de Obra</div>';
        Object.keys(quantidades).forEach(function (servico) {
            var qty = quantidades[servico];
            if (qty > 0) {
                var subtotal = precos[servico] * qty;
                html += '<div class="resumo-item"><span>' + qty + 'x ' + nomesServicos[servico] + '</span><span>R$ ' + subtotal.toFixed(2).replace('.', ',') + '</span></div>';
            }
        });
    }

    if (Object.keys(estacoesSelecionadas).length > 0) {
        html += '<div class="resumo-secao">🍿 Estações</div>';
        Object.keys(estacoesSelecionadas).forEach(function (est) {
            var preco = estacoesSelecionadas[est];
            html += '<div class="resumo-item"><span>' + nomesEstacoes[est] + '</span><span>R$ ' + preco.toFixed(2).replace('.', ',') + '</span></div>';
        });
    }

    resumo.innerHTML = html;

    var total = calcularTotal();
    document.getElementById('total-valor').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

// ========================================
// PAGAMENTO
// ========================================

function selectPagamento(tipo) {
    pagamentoSelecionado = tipo;

    document.querySelectorAll('.pag-opcao').forEach(function (el) {
        el.classList.remove('selected');
    });

    document.getElementById('pag-' + tipo).classList.add('selected');

    document.querySelectorAll('.pag-detalhe').forEach(function (el) {
        el.classList.add('hidden');
    });

    if (tipo === 'pix') {
        document.getElementById('detalhe-pix').classList.remove('hidden');
    } else {
        document.getElementById('detalhe-cartao').classList.remove('hidden');
        document.getElementById('parcelas-group').style.display =
            tipo === 'credito' ? 'block' : 'none';
    }
}

// ========================================
// COPIAR PIX
// ========================================

function copiarPix() {
    var chave = 'lenicebraga@hotmail.com';
    navigator.clipboard.writeText(chave).then(function () {
        var btn = document.querySelector('.btn-copiar');
        btn.textContent = '✅ Chave Copiada!';
        setTimeout(function () {
            btn.textContent = '📋 Copiar Chave PIX';
        }, 3000);
    });
}

// ========================================
// FINALIZAR PEDIDO (COM MERCADO PAGO)
// ========================================

function finalizarPedido() {
    if (!pagamentoSelecionado) {
        alert('Por favor, selecione uma forma de pagamento!');
        return;
    }

    var numeroPedido = 'LM' + Date.now().toString().slice(-6);

    var pedido = {
        numeroPedido: numeroPedido,
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
        total: calcularTotal(),
        status: 'pendente',
        dataPedido: new Date().toISOString()
    };

    // Salvar pedido no localStorage
    var pedidos = JSON.parse(localStorage.getItem('lm_pedidos') || '[]');
    pedidos.push(pedido);
    localStorage.setItem('lm_pedidos', JSON.stringify(pedidos));

    // Se escolheu PIX → fluxo antigo (WhatsApp)
    if (pagamentoSelecionado === 'pix') {
        mostrarSucesso(numeroPedido);
        enviarWhatsApp(pedido);
        return;
    }

    // Se escolheu CARTÃO → processar com Mercado Pago
    if (pagamentoSelecionado === 'credito' || pagamentoSelecionado === 'debito') {
        processarPagamentoCartao(pedido, numeroPedido);
        return;
    }
}

// ========================================
// PROCESSAR PAGAMENTO COM MERCADO PAGO
// ========================================

async function processarPagamentoCartao(pedido, numeroPedido) {
    // Pegar configurações do Mercado Pago
    var mpConfig = localStorage.getItem('lm_mercadopago');

    // Se não tiver Mercado Pago configurado
    if (!mpConfig) {
        alert('⚠️ Pagamento por cartão temporariamente indisponível.\n\nSeu pedido será enviado pelo WhatsApp e a Lenice entrará em contato para combinar o pagamento.');
        mostrarSucesso(numeroPedido);
        enviarWhatsApp(pedido);
        return;
    }

    var mp = JSON.parse(mpConfig);

    if (!mp.accessToken) {
        alert('⚠️ Pagamento por cartão temporariamente indisponível.\n\nEntraremos em contato pelo WhatsApp para combinar o pagamento.');
        mostrarSucesso(numeroPedido);
        enviarWhatsApp(pedido);
        return;
    }

    try {
        // Mostrar mensagem de carregamento
        var btnPagar = document.querySelector('button[onclick="finalizarPedido()"]');
        if (btnPagar) {
            btnPagar.disabled = true;
            btnPagar.innerHTML = '⏳ Processando pagamento...';
        }

        // Criar preferência de pagamento no Mercado Pago
        var response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + mp.accessToken
            },
            body: JSON.stringify({
                items: [{
                    title: 'Evento L&M Artes e Festas - Pedido #' + numeroPedido,
                    description: 'Cliente: ' + pedido.cliente.nome + ' | Data: ' + pedido.evento.data,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: parseFloat(pedido.total)
                }],
                payer: {
                    name: pedido.cliente.nome,
                    email: pedido.cliente.email,
                    phone: {
                        number: pedido.cliente.whatsapp.replace(/\D/g, '')
                    }
                },
                payment_methods: {
                    excluded_payment_types: pagamentoSelecionado === 'debito'
                        ? [{ id: "credit_card" }, { id: "ticket" }]
                        : [{ id: "ticket" }],
                    installments: pagamentoSelecionado === 'credito' ? 12 : 1
                },
                back_urls: {
                    success: 'https://www.google.com',
                    failure: 'https://www.google.com',
                    pending: 'https://www.google.com'
                },
                statement_descriptor: 'LM ARTES E FESTAS',
                external_reference: numeroPedido
            })
        });

        var data = await response.json();

        if (data.init_point) {
            // Link de pagamento criado com sucesso
            var linkPagamento = mp.modo === 'producao'
                ? data.init_point
                : data.sandbox_init_point;

            alert('✅ Redirecionando para o pagamento seguro do Mercado Pago...');

            // Enviar WhatsApp para a Lenice avisando do pedido
            enviarWhatsApp(pedido);

            // Redirecionar para página de pagamento
            window.location.href = linkPagamento;

        } else {
            throw new Error(data.message || 'Erro ao gerar pagamento');
        }

    } catch (error) {
        console.error('Erro no pagamento:', error);
        alert('⚠️ Erro ao processar pagamento.\n\nSeu pedido foi salvo e será enviado pelo WhatsApp. A Lenice entrará em contato!');

        mostrarSucesso(numeroPedido);
        enviarWhatsApp(pedido);

        // Restaurar botão
        var btnPagar = document.querySelector('button[onclick="finalizarPedido()"]');
        if (btnPagar) {
            btnPagar.disabled = false;
            btnPagar.innerHTML = '✅ Finalizar Pedido';
        }
    }
}

// ========================================
// VERIFICAR RETORNO DO PAGAMENTO
// ========================================

window.addEventListener('load', function () {
    var urlParams = new URLSearchParams(window.location.search);
    var statusPagamento = urlParams.get('pagamento');

    if (statusPagamento === 'sucesso') {
        alert('🎉 Pagamento aprovado com sucesso!\n\nEm breve a Lenice entrará em contato para confirmar os detalhes do seu evento!');
    } else if (statusPagamento === 'erro') {
        alert('❌ Pagamento não foi aprovado.\n\nPor favor, tente novamente ou entre em contato pelo WhatsApp.');
    } else if (statusPagamento === 'pendente') {
        alert('⏳ Pagamento pendente.\n\nAssim que for confirmado, entraremos em contato!');
    }
});

// ========================================
// MOSTRAR SUCESSO
// ========================================

function mostrarSucesso(numeroPedido) {
    document.querySelectorAll('.pedido-step').forEach(function (s) {
        s.classList.add('hidden');
    });

    var stepsEl = document.querySelector('.steps');
    if (stepsEl) stepsEl.style.display = 'none';

    document.getElementById('step-sucesso').classList.remove('hidden');
    document.getElementById('sucesso-num').textContent =
        '🎫 Número do Pedido: #' + numeroPedido;
}

// ========================================
// ENVIAR WHATSAPP
// ========================================

function enviarWhatsApp(pedido) {
    var total = pedido.total.toFixed(2).replace('.', ',');

    var equipeTexto = '';
    Object.keys(pedido.equipe).forEach(function (servico) {
        var qty = pedido.equipe[servico];
        if (qty > 0) {
            equipeTexto += '  - ' + qty + 'x ' + nomesServicos[servico] + '\n';
        }
    });

    var estacoesTexto = '';
    Object.keys(pedido.estacoes).forEach(function (est) {
        estacoesTexto += '  - ' + nomesEstacoes[est] + '\n';
    });
    if (!estacoesTexto) estacoesTexto = '  - Nenhuma estação\n';

    var mensagem = '🎉 *NOVO PEDIDO - L&M Artes e Festas*\n';
    mensagem += '━━━━━━━━━━━━━━━━━━━━\n';
    mensagem += '🎫 *Pedido:* #' + pedido.numeroPedido + '\n\n';
    mensagem += '👤 *CLIENTE*\n';
    mensagem += '• Nome: ' + pedido.cliente.nome + '\n';
    mensagem += '• WhatsApp: ' + pedido.cliente.whatsapp + '\n';
    mensagem += '• E-mail: ' + pedido.cliente.email + '\n\n';
    mensagem += '📅 *EVENTO*\n';
    mensagem += '• Data: ' + pedido.evento.data + '\n';
    mensagem += '• Horário: ' + pedido.evento.horario + '\n';
    mensagem += '• Duração: ' + pedido.evento.duracao + 'h\n';
    mensagem += '• Endereço: ' + pedido.evento.endereco + '\n';
    mensagem += '• Convidados: ' + pedido.evento.convidados + '\n\n';
    mensagem += '🤵 *EQUIPE*\n' + equipeTexto + '\n';
    mensagem += '🍿 *ESTAÇÕES*\n' + estacoesTexto + '\n';
    mensagem += '💳 *PAGAMENTO*\n';
    mensagem += '• Forma: ' + pedido.pagamento.toUpperCase() + '\n';
    mensagem += '• Total: R$ ' + total + '\n';
    mensagem += '━━━━━━━━━━━━━━━━━━━━';

    var url = 'https://wa.me/5521985412860?text=' + encodeURIComponent(mensagem);
    window.open(url, '_blank');
}

// ========================================
// NOVO PEDIDO
// ========================================

function novoPedido() {
    quantidades = {
        garcom: 0,
        copeira: 0,
        fritadeira: 0,
        churrasqueiro: 0,
        monitora: 0,
        recepcionista: 0
    };
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

    document.querySelectorAll('.estacao-item input').forEach(function (cb) {
        cb.checked = false;
    });

    var stepsEl = document.querySelector('.steps');
    if (stepsEl) stepsEl.style.display = 'flex';

    showStep(1);
}


// ========================================
// FORMULÁRIO DE CONTATO
// ========================================

function enviarReserva(event) {
    event.preventDefault();

    var nome = document.getElementById('r-nome').value;
    var whatsapp = document.getElementById('r-whatsapp').value;
    var data = document.getElementById('r-data').value;
    var convidados = document.getElementById('r-convidados').value;
    var mensagem = document.getElementById('r-mensagem').value;

    var texto = 'Olá! Gostaria de fazer uma reserva!\n\n';
    texto += '👤 *Nome:* ' + nome + '\n';
    texto += '📱 *WhatsApp:* ' + whatsapp + '\n';
    texto += '📅 *Data:* ' + data + '\n';
    texto += '👥 *Convidados:* ' + convidados + '\n';
    texto += '💬 *Mensagem:* ' + mensagem;

    var url = 'https://wa.me/5521985412860?text=' + encodeURIComponent(texto);
    window.open(url, '_blank');

    document.getElementById('reservaForm').reset();
    alert('Mensagem enviada! Em breve entraremos em contato! 😊');
}