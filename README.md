# menorpreco (API)

## Como rodar
1. Inicie o MySQL no XAMPP.
2. Importe `banco.sql` (phpMyAdmin ou MySQL Workbench).
3. Ajuste o `.env` se sua senha do MySQL não for vazia.
4. No terminal do VS Code: `npm install` e depois `npm start`.
5. Teste em http://localhost:3000

## Rotas (POST, JSON)
- /api/usuarios/cadastro      { nome, email, senha }
- /api/usuarios/login         { email, senha }
- /api/usuarios/esqueci-senha { email }
- /api/usuarios/verificar-codigo { email, codigo }
- /api/usuarios/nova-senha    { email, codigo, novaSenha }

No celular use o IP do PC (ipconfig) na mesma rede Wi-Fi: http://192.168.x.x:3000
