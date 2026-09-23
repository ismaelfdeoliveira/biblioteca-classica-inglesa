Biblioteca de Literatura Clássica Inglesa
Projeto de portfólio focado em segurança de aplicações web — um sistema de cadastro e login para uma biblioteca digital fictícia, implementando múltiplas camadas de autenticação e proteção de conta.
🔗 Repositório: github.com/ismaelfdeoliveira/biblioteca-classica-inglesa
Sobre o projeto
Este não é um catálogo de livros — é um exercício prático de segurança aplicada. O acervo de 6 clássicos ingleses (Pride and Prejudice, Jane Eyre, Wuthering Heights, Great Expectations, Middlemarch, Frankenstein) existe apenas como contexto para testar, na prática, um conjunto de mecanismos de autenticação que normalmente só se estuda em teoria.
Funcionalidades de segurança
·	Cadastro em 3 passos com conta real (não simulada): dados + senha → captura facial → confirmação
·	Validação de senha em tempo real: mínimo de 12 caracteres, não pode conter o nome do usuário, exige ao menos um número
·	Verificação facial real no cadastro, via API do Face++ (Detect endpoint), com o face_token salvo no perfil
·	Autenticação multifator no login: e-mail/senha + código de 6 dígitos por SMS (Firebase Phone Auth)
·	Login alternativo por reconhecimento facial: compara a foto capturada com o rosto do cadastro (Face++ Compare endpoint, limiar de confiança de 80%), dispensando o SMS quando confirma a identidade
·	Timeout de sessão: encerramento automático após 30 minutos de inatividade, com aviso 1 minuto antes
·	Recuperação de senha via biometria: em vez do clássico "link por e-mail" vulnerável, a identidade é confirmada por reconhecimento facial antes de liberar a redefinição
·	Proteção contra troca indevida de número de telefone: alterar o telefone no perfil exige reconfirmação via SMS ou reconhecimento facial, prevenindo sequestro de conta (account takeover)
Stack técnica
·	Frontend: React + TypeScript + Tailwind CSS
·	Backend/Auth: Supabase (via Bolt Database) — contas reais, Edge Functions em Deno
·	Reconhecimento facial: Face++ (Detect + Compare API)
·	2FA por SMS: Firebase Authentication (Phone Auth)
·	Desenvolvimento: Bolt.new (vibe coding)
Decisões técnicas e trade-offs
Alguns pontos que vale destacar sobre o raciocínio por trás das escolhas:
·	Face++ real em vez de simulação: optei por integrar a API de verdade desde o início, em vez de simular a captura facial, para demonstrar integração real de frontend com serviços externos e tratamento seguro de credenciais (secrets nunca expostos no client).
·	Twilio → Firebase Phone Auth: comecei com Twilio para o SMS, mas o plano trial exigia upgrade pago para liberar número brasileiro. Troquei para o Firebase Phone Auth, que resolveu a limitação sem custo e com configuração mais direta.
·	Regra de senha revista: a primeira versão da regra de senha (formato fixo de 8 caracteres com composição rígida) foi identificada como uma escolha de segurança fraca — um molde fixo reduz o espaço de combinações possíveis. A regra final prioriza comprimento mínimo sobre composição rígida, seguindo recomendações atuais (NIST/OWASP).
·	Número de telefone fixo no 2FA: o campo de telefone usado para o 2FA não é editável na tela de login — só pode ser alterado dentro da área logada, com reconfirmação. Isso evita que alguém com e-mail/senha vazados redirecione o código de verificação para outro celular.
Rodando localmente
npm install
npm run dev

É necessário configurar as variáveis de ambiente (.env, não incluído no repositório) com as credenciais de Face++, Firebase e Supabase.

Projeto desenvolvido como parte de estudos em segurança de aplicações e automação, por Ismael Francelino de Oliveira.
