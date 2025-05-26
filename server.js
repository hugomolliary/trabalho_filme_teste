const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch'); // Make sure node-fetch is installed (npm install node-fetch)
const app = express();
const PORT = 3000;
const DB_PATH = './db.json';
const API_KEY = 'ce5903f15c55ee180d2a2af59f70c28a'; // Consider using environment variables for API keys in production

// Middleware to parse JSON request bodies
app.use(express.json());
// Serve static files from the 'public' directory (e.g., your HTML, CSS, client-side JS)
app.use(express.static('public'));

let filmes = [];

// Load movies from db.json when the server starts
try {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    // Parse the JSON data; if file is empty or invalid JSON, initialize as empty array
    filmes = JSON.parse(data || '[]');
  } else {
    // If db.json doesn't exist, create it with an empty array
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2), 'utf8');
  }
} catch (error) {
  console.error('Erro ao carregar ou criar banco de dados:', error);
  // If there's an error loading, ensure 'filmes' is an empty array to prevent crashes
  filmes = [];
}

// Helper function to save current 'filmes' array to db.json
function saveFilmes() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(filmes, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar banco de dados:', error);
  }
}

// Route to add a new movie
app.post('/api/add', async (req, res) => {
  const titulo = req.body.titulo;
  if (!titulo) {
    return res.status(400).send('Título é obrigatório');
  }

  try {
    // Search for the movie on TMDB
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(titulo)}&language=pt-BR`);
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
    }
    const data = await response.json();
    const filmeEncontrado = data.results[0]; // Get the first result

    if (!filmeEncontrado) {
      return res.status(404).send('Filme não encontrado na base de dados externa.');
    }

    // Check if the movie already exists in our local database
    const jaExiste = filmes.some(f => f.titulo === filmeEncontrado.title && f.data === filmeEncontrado.release_date);
    if (jaExiste) {
      return res.status(409).send('Filme já cadastrado.');
    }

    // Fetch detailed information for the movie
    const detalhesResponse = await fetch(`https://api.themoviedb.org/3/movie/${filmeEncontrado.id}?api_key=${API_KEY}&language=pt-BR`);
    if (!detalhesResponse.ok) {
        throw new Error(`TMDB API details error: ${detalhesResponse.statusText}`);
    }
    const info = await detalhesResponse.json();

    // Create the new movie object
    const novoFilme = {
      titulo: filmeEncontrado.title,
      data: filmeEncontrado.release_date,
      sinopse: filmeEncontrado.overview || 'Sinopse não disponível.',
      minutagem: info.runtime || 'Desconhecida',
      poster: filmeEncontrado.poster_path ? `https://image.tmdb.org/t/p/w200${filmeEncontrado.poster_path}` : '',
      generos: info.genres && info.genres.length > 0 ? info.genres.map(g => g.name).join(', ') : 'Desconhecido'
    };

    filmes.push(novoFilme); // Add the new movie to the array
    saveFilmes(); // Save the updated array to db.json
    res.status(201).send('Filme adicionado com sucesso!'); // 201 Created status
  } catch (error) {
    console.error('Erro ao adicionar filme:', error);
    res.status(500).send('Erro interno do servidor ao adicionar filme.');
  }
});

// Route to list all movies
app.get('/api/listar', (req, res) => {
  res.json(filmes);
});

// Route to delete a single movie by title
app.delete('/api/excluir/:titulo', (req, res) => {
  const tituloParaExcluir = decodeURIComponent(req.params.titulo);
  const initialLength = filmes.length;
  // Filter out the movie to be deleted
  filmes = filmes.filter(f => f.titulo !== tituloParaExcluir);

  if (filmes.length < initialLength) {
    saveFilmes(); // Save if a movie was actually removed
    res.send(`Filme "${tituloParaExcluir}" excluído com sucesso.`);
  } else {
    res.status(404).send(`Filme "${tituloParaExcluir}" não encontrado.`);
  }
});

// Route to delete all movies
app.delete('/api/excluir-todos', (req, res) => {
  if (filmes.length === 0) {
    return res.status(404).send('Não há filmes para excluir.');
  }
  filmes = []; // Clear the array
  saveFilmes(); // Save the empty array to db.json
  res.send('Todos os filmes foram excluídos.');
});

// Route to edit a movie's sinopse by title
app.put('/api/editar/:titulo', (req, res) => {
  const tituloParaEditar = decodeURIComponent(req.params.titulo);
  const novaSinopse = req.body.sinopse;

  if (typeof novaSinopse === 'undefined' || novaSinopse === null || novaSinopse.trim() === '') {
    return res.status(400).send('Nova sinopse é obrigatória e não pode ser vazia.');
  }

  // Find the movie by title
  const filmeIndex = filmes.findIndex(f => f.titulo === tituloParaEditar);

  if (filmeIndex !== -1) {
    filmes[filmeIndex].sinopse = novaSinopse; // Update the sinopse
    saveFilmes(); // Save the updated array to db.json
    res.send(`Sinopse do filme "${tituloParaEditar}" atualizada com sucesso.`);
  } else {
    res.status(404).send(`Filme "${tituloParaEditar}" não encontrado para edição.`);
  }
});


// Start the server
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
