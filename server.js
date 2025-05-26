const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;
const DB_PATH = './db.json';
const API_KEY = 'ce5903f15c55ee180d2a2af59f70c28a';

app.use(express.json());
app.use(express.static('public'));

let filmes = [];

try {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    filmes = JSON.parse(data);
  } else {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf8');
  }
} catch (error) {
  console.error('Erro ao carregar banco de dados:', error);
}

app.post('/api/add', async (req, res) => {
  const titulo = req.body.titulo;
  if (!titulo) return res.status(400).send('Título é obrigatório');

  const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(titulo)}&language=pt-BR`);
  const data = await response.json();
  const filme = data.results[0];
  if (!filme) return res.status(404).send('Filme não encontrado');

  const jaExiste = filmes.some(f => f.titulo === filme.title && f.data === filme.release_date);
  if (jaExiste) return res.status(409).send('Filme já cadastrado');

  const detalhes = await fetch(`https://api.themoviedb.org/3/movie/${filme.id}?api_key=${API_KEY}&language=pt-BR`);
  const info = await detalhes.json();

  const novoFilme = {
    titulo: filme.title,
    data: filme.release_date,
    sinopse: filme.overview,
    minutagem: info.runtime || 'Desconhecida',
    poster: filme.poster_path ? `https://image.tmdb.org/t/p/w200${filme.poster_path}` : '', // <--- Adicione a vírgula aqui
    generos: info.genres ? info.genres.map(g => g.name).join(', ') : 'Desconhecido'
  };

  filmes.push(novoFilme);
  fs.writeFileSync(DB_PATH, JSON.stringify(filmes, null, 2));
  res.send('Filme adicionado com sucesso');
});

app.get('/api/listar', (req, res) => {
  res.json(filmes);
});

app.delete('/api/excluir/:titulo', (req, res) => {
  const titulo = req.params.titulo.toLowerCase();
  const tamanhoAntes = filmes.length;
  filmes = filmes.filter(f => f.titulo.toLowerCase() !== titulo);

  if (filmes.length === tamanhoAntes) {
    return res.status(404).send('Filme não encontrado');
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(filmes, null, 2));
  res.send('Filme removido com sucesso');
});

app.delete('/api/excluir-todos', (req, res) => {
  filmes = [];
  fs.writeFileSync(DB_PATH, JSON.stringify(filmes, null, 2));
  res.send('Todos os filmes foram excluídos.');
});

app.put('/api/editar/:titulo', (req, res) => {
  const titulo = req.params.titulo.toLowerCase();
  const novo = req.body;
  const index = filmes.findIndex(f => f.titulo.toLowerCase() === titulo);
  if (index === -1) return res.status(404).send('Filme não encontrado');

  filmes[index] = { ...filmes[index], ...novo };
  fs.writeFileSync(DB_PATH, JSON.stringify(filmes, null, 2));
  res.send('Filme editado com sucesso');
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
