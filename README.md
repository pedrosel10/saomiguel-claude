# saomiguel-claude

Site estático (HTML/CSS/JS puro) com deploy automático via cPanel Git™ Version Control.

## Estrutura

```
saomiguel-claude/
├── .cpanel.yml          # receita de deploy do cPanel
├── .editorconfig
├── .gitignore
├── README.md
└── public/              # ← tudo aqui vai para o servidor
    ├── index.html
    ├── robots.txt
    ├── .htaccess
    └── assets/
        ├── css/style.css
        ├── js/main.js
        ├── img/
        └── fonts/
```

Não há etapa de build: o que está em `public/` é exatamente o que fica no ar.

## Deploy

`.cpanel.yml` copia o conteúdo de `public/` para `$HOME/public_html/sm-claude/`.

### Configuração inicial no cPanel (uma vez só)

1. cPanel → **Git™ Version Control** → **Create**.
2. Marque *Clone a Repository*.
3. **Clone URL:** `https://github.com/pedrosel10/saomiguel-claude.git`
4. **Repository Path:** `/home/USUARIO/repositories/saomiguel-claude`
5. Criar → aba **Pull or Deploy** → **Update from Remote** → **Deploy HEAD Commit**.

### A cada alteração

```bash
git add .
git commit -m "descrição"
git push
```

Depois, no cPanel: **Pull or Deploy → Update from Remote → Deploy HEAD Commit**.

## Desenvolvimento local

```bash
cd public
python3 -m http.server 8000
# abre http://localhost:8000
```

## Observações

- Todos os caminhos no HTML são **relativos** (`assets/css/style.css`), porque o site roda em subpasta (`/sm-claude/`). Não use caminhos começando com `/`.
- O deploy **copia por cima**; arquivos removidos do repo continuam no servidor até serem apagados manualmente.
