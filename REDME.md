1. Arquitetura em Camadas
Foi adotada uma estrutura baseada em separar bem as responsabilidades do projeto. Controladores (rotas), serviços (regras do aplicativo) e repositórios (acesso aos dados) trabalham de forma isolada. Isso permitiu integrar os novos módulos sem misturar a lógica principal com o Prisma ou com o framework web, deixando o código muito mais limpo e preparado para futuras atualizações ou manutenções.

2. Modelagem e Migrations com o Prisma
A criação dos novos relacionamentos no banco (como o sistema de seguidores e as publicações) exigiu precisão nas chaves estrangeiras. Optou-se por utilizar o Prisma pela sua integração perfeita com o TypeScript e por gerar arquivos de migration imutáveis, o que garante um controle de versão seguro e fácil de replicar em qualquer máquina.

3. Validação de Dados na Entrada
Para evitar que informações incorretas causem problemas (como tentar criar um post sem texto ou um usuário com dados faltando), as informações enviadas nas requisições são validadas logo na entrada das rotas. Isso impede o processamento de dados inválidos e devolve avisos claros de imediato, poupando processamento e acessos desnecessários ao banco de dados.

4. Tratamento de Erros Padronizado
Foi implementada uma estratégia centralizada para lidar com as exceções da aplicação. Se uma regra de negócio não for atendida — por exemplo, tentar seguir um usuário que não existe —, o sistema captura essa falha e devolve uma resposta com o status HTTP correto e uma mensagem clara. Isso padroniza as respostas da API e facilita muito a comunicação com o front-end.
