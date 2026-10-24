# MARISE DOCES — site com painel administrativo

Este projeto usa o site existente e adiciona:
- Login de administradora em `/admin`
- Controle online para ativar/desativar a loja
- Página de preparação quando o site está desativado
- Mensagem personalizável nessa página
- Proteção básica contra tentativas repetidas de login e cookies de sessão seguros em produção

## Antes de publicar
Não existe uma senha padrão no projeto. Defina `ADMIN_USER`, `ADMIN_PASSWORD` e `SESSION_SECRET` nas variáveis de ambiente do serviço de hospedagem. Use uma senha forte e uma chave aleatória longa para `SESSION_SECRET`.

Exemplo local (PowerShell):
```powershell
$env:ADMIN_USER="marise"
$env:ADMIN_PASSWORD="coloque-uma-senha-forte-aqui"
$env:SESSION_SECRET="coloque-uma-chave-aleatoria-longa-aqui"
npm install
npm start
```
Depois abra `http://localhost:3000` para o site e `http://localhost:3000/admin` para administrar.

## Publicação online
Publique como um serviço Node.js que execute `npm start` (por exemplo, Render ou outro host compatível com Node). Configure as três variáveis de ambiente no painel da hospedagem:
- `ADMIN_USER`: Graciele Marise
- `ADMIN_PASSWORD`: 132708@Gp
- `SESSION_SECRET`: 2013
**Persistência:** o estado ativo/inativo fica em `data/site-state.json`. Em hospedagem com sistema de arquivos efêmero, configure um disco persistente e defina `DATA_DIR` para o caminho desse disco. Sem isso, as alterações podem ser perdidas em reinicializações ou novas implantações. Verifique também a política de armazenamento da hospedagem antes de publicar.

## Observações
- A administração fica no endereço `/admin`; o link também aparece discretamente no rodapé do site.
- Os clientes não precisam de conta.
- O login não tem cadastro público de administradores.
- Este painel controla a disponibilidade do site, não altera preços nem gerencia estoque.
- Para pedidos reais, confira o número de WhatsApp configurado no site antes de divulgar.
