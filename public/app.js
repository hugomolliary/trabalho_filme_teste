async function adicionar() {
  try {
    const titulo = document.getElementById('titulo').value;

    if (!titulo.trim()) {
      alert('Digite um título válido');
      return;
    }

    const res = await fetch('/api/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo })
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Erro ao adicionar filme: ${msg}`);
    }

    alert(await res.text());
    listar(); // Refresh the list after adding
  } catch (error) {
    console.error('Erro em adicionar():', error);
    alert('Erro ao adicionar filme: ' + error.message);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  }[c]));
}

async function listar() {
  try {
    const res = await fetch('/api/listar');
    if (!res.ok) {
      throw new Error(`Erro ao listar filmes: ${await res.text()}`);
    }

    const filmes = await res.json();
    const resultado = document.getElementById('resultado');
    resultado.innerHTML = ''; // Clear previous content

    if (!Array.isArray(filmes) || filmes.length === 0) {
      resultado.innerHTML = '<p>Nenhum filme encontrado.</p>';
      return;
    }

    filmes.forEach(f => {
      resultado.innerHTML += `
        <div class="filme">
          <h3>${escapeHtml(f.titulo)}</h3>
          <p><strong>Data:</strong> ${escapeHtml(f.data)}</p>
          <p><strong>Duração:</strong> ${escapeHtml(f.minutagem?.toString())} min</p>
          <p><strong>Gênero:</strong> ${escapeHtml(f.generos)}</p>
          <p>${escapeHtml(f.sinopse)}</p>
          ${f.poster ? `<img src="${escapeHtml(f.poster)}" alt="Poster do filme ${escapeHtml(f.titulo)}" />` : ''}
          <br>
          <button onclick="editar('${escapeHtml(f.titulo)}')">Editar</button>
          <button onclick="excluir('${escapeHtml(f.titulo)}')">Excluir</button>
        </div>
      `;
    });
  } catch (error) {
    console.error('Erro em listar():', error);
    alert('Erro ao listar filmes: ' + error.message);
  }
}

async function excluir(titulo) {
  try {
    if (!confirm(`Deseja excluir o filme "${titulo}"?`)) return;

    const res = await fetch(`/api/excluir/${encodeURIComponent(titulo)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      throw new Error(`Erro ao excluir filme: ${await res.text()}`);
    }

      alert(await res.text());
    listar(); // Refresh the list after deletion
  } catch (error) {
    console.error('Erro em excluir():', error);
    alert('Erro ao excluir filme: ' + error.message);
  }
}

async function excluirTodos() {
  try {
    // First, check if there are any movies to delete
    const resListar = await fetch('/api/listar');
    if (!resListar.ok) {
      throw new Error(`Erro ao verificar filmes para exclusão: ${await resListar.text()}`);
    }
    const filmes = await resListar.json();

    if (!Array.isArray(filmes) || filmes.length === 0) {
      alert('Não há filmes para excluir.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir TODOS os filmes?')) return;

    const resExcluir = await fetch('/api/excluir-todos', {
      method: 'DELETE'
    });

    if (!resExcluir.ok) {
      throw new Error(`Erro ao excluir todos: ${await resExcluir.text()}`);
    }

    alert(await resExcluir.text());
    listar();
  } catch (error) {
    console.error('Erro em excluirTodos():', error);
    alert('Erro ao excluir todos os filmes: ' + error.message);
  }
}

async function editar(titulo) {
  try {
    const resListar = await fetch('/api/listar');
    if (!resListar.ok) {
      throw new Error(`Erro ao verificar filmes para edição: ${await resListar.text()}`);
    }
    const filmes = await resListar.json();

    if (!Array.isArray(filmes) || filmes.length === 0) {
      alert('Não há filmes para editar.');
      return;
    }

    const filmeExiste = filmes.some(f => f.titulo === titulo);
    if (!filmeExiste) {
        alert(`O filme "${titulo}" não foi encontrado para edição.`);
        return;
    }

    const novaSinopse = prompt(`Nova sinopse para "${titulo}":`);
    if (novaSinopse === null) {
        return;
    }
    if (!novaSinopse.trim()) {
        alert('A sinopse não pode ser vazia.');
        return;
    }

    const res = await fetch(`/api/editar/${encodeURIComponent(titulo)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sinopse: novaSinopse })
    });

    if (!res.ok) {
      throw new Error(`Erro ao editar filme: ${await res.text()}`);
    }

    alert(await res.text());
    listar();
  } catch (error) {
    console.error('Erro em editar():', error);
    alert('Erro ao editar filme: ' + error.message);
  }
}

listar();
