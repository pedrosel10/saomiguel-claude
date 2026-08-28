# saomiguel-claude

Site estático (HTML/CSS/JS puro) hospedado na Hostinger, com deploy via Git.

## Estrutura

```
saomiguel-claude/
├── .editorconfig
├── .gitignore
├── .htaccess
├── README.md
├── index.html
├── robots.txt
└── assets/
    ├── css/style.css
    ├── js/main.js
    ├── img/
    └── fonts/
```

Não há etapa de build: a raiz do repositório é exatamente o que fica no ar.

## Deploy

A hospedagem é **Hostinger (hPanel)**, não cPanel. O hPanel faz apenas o
checkout do repositório na pasta de destino — ele não executa receitas de
deploy (`.cpanel.yml` não tem efeito ali). Por isso os arquivos ficam na raiz
do repositório, e não numa subpasta `public/`.

O site responde em `https://saomiguelengenharia.com.br/sm-claude/`.

### A cada alteração

```bash
git add .
git commit -m "descrição"
git push
```

Depois, no hPanel: **Site → GIT → Deploy** (ou aguarde o auto-deploy, se
estiver ativado).

## Desenvolvimento local

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Observações

- Todos os caminhos no HTML são **relativos** (`assets/css/style.css`), porque
  o site roda em subpasta (`/sm-claude/`). Não use caminhos começando com `/`.
- O `.htaccess` bloqueia dotfiles, `.md` e `.yml`: como a raiz do repositório é
  a raiz do site, sem isso o README e as configs ficariam públicos.
- O deploy **copia por cima**; arquivos removidos do repo continuam no servidor
  até serem apagados manualmente.
